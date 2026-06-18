import { uploadToCloudinary, getCloudinaryUrl } from '../config/cloudinary.js';

export const uploadJobImage = async (file, tenantId) => {
  try {
    const result = await uploadToCloudinary(file.buffer, {
      folder: `${tenantId}/jobs`,
      public_id: `${Date.now()}_${file.originalname.replace(/\.[^/.]+$/, '')}`,
    });
    return result.public_id;
  } catch {
    const base64 = file.buffer.toString('base64');
    return `data:${file.mimetype};base64,${base64}`;
  }
};

export const resolveJobImageUrl = async (imageUrl) => {
  return getCloudinaryUrl(imageUrl);
};
