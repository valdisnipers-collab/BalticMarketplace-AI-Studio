import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface UploadResult {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
}

export async function uploadImage(
  buffer: Buffer,
  options: { folder?: string; publicId?: string } = {}
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder ?? 'listings',
        public_id: options.publicId,
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Upload failed'));
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
        });
      }
    );
    uploadStream.end(buffer);
  });
}

export async function uploadVideo(
  buffer: Buffer,
  options: { folder?: string } = {}
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder ?? 'videos',
        resource_type: 'video',
        transformation: [
          { duration: '30' },
          { quality: 'auto:good' },
          { format: 'mp4' },
        ],
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Upload failed'));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    uploadStream.end(buffer);
  });
}

export async function uploadChatImage(buffer: Buffer): Promise<UploadResult> {
  return uploadImage(buffer, { folder: 'chat' });
}

export async function deleteFile(publicId: string, resourceType: 'image' | 'video' = 'image') {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (e) {
    console.error('Cloudinary delete error:', e);
  }
}

export default cloudinary;
