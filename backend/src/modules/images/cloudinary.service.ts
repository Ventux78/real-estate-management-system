import { v2 as cloudinary, UploadApiOptions, UploadApiResponse } from 'cloudinary';
import { env } from '@/config';
import { AppError } from '@/common/errors/AppError';

// Initialize Cloudinary with environment variables
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const cloudinaryService = {
  /**
   * Uploads an image buffer to Cloudinary.
   *
   * @param buffer File buffer to upload
   * @param folder Destination folder in Cloudinary
   * @returns Cloudinary upload response
   * @throws AppError on failure
   */
  async uploadImage(buffer: Buffer, folder: string = 'gayrimenkul/properties'): Promise<UploadApiResponse> {
    try {
      return await new Promise((resolve, reject) => {
        const uploadOptions: UploadApiOptions = {
          folder,
          resource_type: 'image',
          // Optional: Add basic transformations or format conversions here
          // e.g., format: 'webp',
        };

        const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
          if (error) {
            return reject(new AppError('Cloudinary yükleme hatası: ' + error.message, 502, 'CLOUDINARY_UPLOAD_ERROR'));
          }
          if (!result) {
            return reject(new AppError('Cloudinary yükleme hatası: Bilinmeyen hata', 502, 'CLOUDINARY_UPLOAD_ERROR'));
          }
          resolve(result as UploadApiResponse);
        });

        // Write the buffer to the stream and end it
        uploadStream.end(buffer);
      });
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      throw new AppError('Cloudinary iletişim hatası', 502, 'CLOUDINARY_ERROR');
    }
  },

  /**
   * Deletes an image from Cloudinary by its public ID.
   *
   * @param publicId Cloudinary public ID
   * @throws AppError on failure
   */
  async deleteImage(publicId: string): Promise<void> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      if (result.result !== 'ok' && result.result !== 'not found') {
        throw new AppError(`Cloudinary silme hatası: ${result.result}`, 502, 'CLOUDINARY_DELETE_ERROR');
      }
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      throw new AppError('Cloudinary silme işlemi başarısız', 502, 'CLOUDINARY_ERROR');
    }
  },
};
