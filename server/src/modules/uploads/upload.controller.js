import { uploadToCloudinary, getCloudinaryUrl } from '../../config/cloudinary.js';
import Document from '../../models/Document.model.js';
import Employee from '../employees/employee.model.js';
import { writeAuditLog } from '../../utils/auditLogger.js';

const checkFilePermission = async (reqUser, targetEmployeeId) => {
  const employee = await Employee.findById(targetEmployeeId).lean();
  if (!employee) {
    return { allowed: false, employee: null, error: 'Employee not found' };
  }

  if (employee.tenantId.toString() !== reqUser.tenantId.toString()) {
    return { allowed: false, employee: null, error: 'Access denied' };
  }

  if (['HR_ADMIN', 'LEADERSHIP'].includes(reqUser.role)) {
    return { allowed: true, employee };
  }

  if (employee.userId.toString() === reqUser.id.toString()) {
    return { allowed: true, employee };
  }

  if (reqUser.role === 'MANAGER') {
    const managerProfile = await Employee.findOne({ userId: reqUser.id, tenantId: reqUser.tenantId }).lean();
    if (managerProfile && employee.managerId && employee.managerId.toString() === managerProfile._id.toString()) {
      return { allowed: true, employee };
    }
  }

  return { allowed: false, employee: null, error: 'You do not have permission to manage files for this employee' };
};

export const uploadProfileImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No image file was provided' }
      });
    }

    const { allowed, employee, error } = await checkFilePermission(req.user, req.params.employeeId);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: error }
      });
    }

    const result = await uploadToCloudinary(req.file.buffer, {
      folder: `${req.user.tenantId}/profile-images/${employee._id}`,
      public_id: `${Date.now()}_${req.file.originalname.replace(/\.[^/.]+$/, '')}`,
    });

    await Employee.findByIdAndUpdate(employee._id, { profileImageUrl: result.secure_url });

    await Document.create({
      tenantId: req.user.tenantId,
      employeeId: employee._id,
      uploadedBy: req.user.id,
      fileName: result.public_id,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      fileKey: result.public_id,
      fileUrl: result.secure_url,
      category: 'profile_image'
    });

    await writeAuditLog({
      action: 'PROFILE_IMAGE_UPLOADED',
      tenantId: req.user.tenantId,
      userId: req.user.id,
      targetId: employee.employeeId,
      meta: { fileKey: result.public_id, originalName: req.file.originalname }
    });

    res.status(200).json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: {
        fileUrl: result.secure_url,
        originalName: req.file.originalname
      }
    });
  } catch (error) {
    next(error);
  }
};

export const uploadDocumentFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No document file was provided' }
      });
    }

    const { allowed, employee, error } = await checkFilePermission(req.user, req.params.employeeId);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: error }
      });
    }

    const category = req.body.category || 'other';
    const validCategories = ['id_proof', 'offer_letter', 'tax_form', 'policy', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_CATEGORY', message: 'Invalid document category' }
      });
    }

    const result = await uploadToCloudinary(req.file.buffer, {
      folder: `${req.user.tenantId}/documents/${employee._id}`,
      public_id: `${Date.now()}_${req.file.originalname.replace(/\.[^/.]+$/, '')}`,
    });

    const doc = await Document.create({
      tenantId: req.user.tenantId,
      employeeId: employee._id,
      uploadedBy: req.user.id,
      fileName: result.public_id,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      fileKey: result.public_id,
      fileUrl: result.secure_url,
      category
    });

    await writeAuditLog({
      action: 'DOCUMENT_UPLOADED',
      tenantId: req.user.tenantId,
      userId: req.user.id,
      targetId: employee.employeeId,
      meta: { fileKey: result.public_id, category, originalName: req.file.originalname }
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: doc
    });
  } catch (error) {
    next(error);
  }
};

export const getDocuments = async (req, res, next) => {
  try {
    const { allowed, employee, error } = await checkFilePermission(req.user, req.params.employeeId);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: error }
      });
    }

    const { category } = req.query;
    const filter = { employeeId: employee._id, tenantId: req.user.tenantId };
    if (category && category !== 'all') {
      filter.category = category;
    }

    const docs = await Document.find(filter)
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'email')
      .lean();

    const docsWithUrls = docs.map((doc) => ({
      ...doc,
      signedUrl: getCloudinaryUrl(doc.fileKey) || doc.fileUrl
    }));

    res.status(200).json({
      success: true,
      data: docsWithUrls
    });
  } catch (error) {
    next(error);
  }
};

export const getDocumentUrl = async (req, res, next) => {
  try {
    const doc = await Document.findOne({
      _id: req.params.documentId,
      tenantId: req.user.tenantId
    }).lean();

    if (!doc) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found' }
      });
    }

    const signedUrl = getCloudinaryUrl(doc.fileKey) || doc.fileUrl;

    res.status(200).json({
      success: true,
      data: { signedUrl, originalName: doc.originalName, mimeType: doc.mimeType }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    const doc = await Document.findOne({
      _id: req.params.documentId,
      tenantId: req.user.tenantId
    });

    if (!doc) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found' }
      });
    }

    const { allowed, error } = await checkFilePermission(req.user, doc.employeeId);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: error }
      });
    }

    doc.isDeleted = true;
    doc.deletedAt = new Date();
    await doc.save();

    await writeAuditLog({
      action: 'DOCUMENT_DELETED',
      tenantId: req.user.tenantId,
      userId: req.user.id,
      meta: { documentId: doc._id, fileKey: doc.fileKey }
    });

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getProfileImage = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({
      _id: req.params.employeeId,
      tenantId: req.user.tenantId
    }).lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Employee not found' }
      });
    }

    if (!employee.profileImageUrl) {
      return res.status(200).json({
        success: true,
        data: { signedUrl: null }
      });
    }

    const signedUrl = getCloudinaryUrl(employee.profileImageUrl);

    res.status(200).json({
      success: true,
      data: { signedUrl, fileUrl: employee.profileImageUrl }
    });
  } catch (error) {
    next(error);
  }
};
