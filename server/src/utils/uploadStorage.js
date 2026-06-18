import { uploadToCloudinary, getCloudinaryUrl } from '../config/cloudinary.js';

export const uploadToStorage = async (file, storagePath) => {
  const result = await uploadToCloudinary(file.buffer, {
    folder: storagePath,
    public_id: `${Date.now()}_${file.originalname.replace(/\.[^/.]+$/, '')}`,
  });
  return { storageKey: result.public_id, storageType: 'cloudinary', fileUrl: result.secure_url };
};

export const resolveStorageUrl = async (fileKey) => {
  return getCloudinaryUrl(fileKey);
};
