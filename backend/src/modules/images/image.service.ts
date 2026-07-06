import { AppError } from '@/common/errors/AppError';
import { cloudinaryService } from './cloudinary.service';
import { imageRepository } from './image.repository';
import { ImageDto, ReorderImageDto } from './image.types';
import { propertyRepository } from '@/modules/property/property.repository';

// Multer adds these to the Express Request
interface MulterFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

export const imageService = {
  /**
   * Yüklenen resimleri Cloudinary'ye atar ve DB'ye yazar.
   */
  async uploadImages(propertyId: string, files: MulterFile[]): Promise<ImageDto[]> {
    // 1. Property var mı kontrol et
    const property = await propertyRepository.findById(propertyId);
    if (!property) {
      throw new AppError('İlan bulunamadı.', 404, 'PROPERTY_NOT_FOUND');
    }

    // 2. Mevcut resimleri getir
    const existingImages = await imageRepository.findByPropertyId(propertyId);
    const totalCount = existingImages.length + files.length;
    if (totalCount > 20) {
      throw new AppError('Bir ilanda en fazla 20 görsel olabilir.', 400, 'MAX_IMAGES_EXCEEDED');
    }

    let nextOrder = existingImages.length > 0
      ? Math.max(...existingImages.map(img => img.displayOrder)) + 1
      : 1;

    // Kapak fotoğrafı yoksa, ilk yükleneni kapak yap
    const hasCover = existingImages.some(img => img.isCover);
    let shouldSetCover = !hasCover;

    const newImagesData = [];

    // 3. Dosyaları Cloudinary'ye yükle ve hataları yakala
    const uploadPromises = files.map(file => cloudinaryService.uploadImage(file.buffer));
    const settledResults = await Promise.allSettled(uploadPromises);

    const successfulUploads: import('cloudinary').UploadApiResponse[] = [];
    const failedUploads: unknown[] = [];

    for (const res of settledResults) {
      if (res.status === 'fulfilled') {
        successfulUploads.push(res.value);
      } else {
        failedUploads.push(res.reason);
      }
    }

    // Eğer herhangi biri başarısız olduysa, başarılıları da sil ve iptal et
    if (failedUploads.length > 0) {
      // Rollback
      for (const upload of successfulUploads) {
        await cloudinaryService.deleteImage(upload.public_id).catch(() => {});
      }
      throw new AppError('Bazı görseller yüklenirken hata oluştu. Yükleme iptal edildi.', 502, 'PARTIAL_UPLOAD_ERROR');
    }

    try {
      // 4. DTO verilerini hazırla
      for (const result of successfulUploads) {
        const isCover = shouldSetCover;
        if (shouldSetCover) shouldSetCover = false; // Only first one becomes cover

        newImagesData.push({
          propertyId,
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
          displayOrder: nextOrder++,
          isCover,
        });
      }

      // 5. Veritabanına kaydet
      if (newImagesData.length > 0) {
        await imageRepository.createMany(newImagesData);
      }

      // 6. Son durumu dön
      return await this.getImages(propertyId);
    } catch (dbError) {
      // Rollback
      for (const upload of successfulUploads) {
        await cloudinaryService.deleteImage(upload.public_id).catch(() => {});
      }
      throw new AppError('Görseller veritabanına kaydedilemedi.', 500, 'DB_SAVE_ERROR');
    }
  },

  /**
   * İlanın tüm resimlerini getir.
   */
  async getImages(propertyId: string): Promise<ImageDto[]> {
    const property = await propertyRepository.findById(propertyId);
    if (!property) {
      throw new AppError('İlan bulunamadı.', 404, 'PROPERTY_NOT_FOUND');
    }

    return await imageRepository.findByPropertyId(propertyId);
  },

  /**
   * Resmi Cloudinary ve DB'den sil.
   */
  async deleteImage(imageId: string): Promise<void> {
    const image = await imageRepository.findById(imageId);
    if (!image) {
      throw new AppError('Görsel bulunamadı.', 404, 'IMAGE_NOT_FOUND');
    }

    // 1. Cloudinary'den sil
    await cloudinaryService.deleteImage(image.publicId);

    // 2. DB'den sil
    await imageRepository.delete(imageId);

    // 3. Eğer silinen kapak fotoğrafıysa, diğer ilk resmi kapak yap
    if (image.isCover) {
      const remaining = await imageRepository.findByPropertyId(image.propertyId);
      const first = remaining[0];
      if (first) {
        await imageRepository.setCoverTransaction(first.propertyId, first.id);
      }
    }
  },

  /**
   * Kapak fotoğrafını değiştir.
   */
  async setCover(imageId: string): Promise<void> {
    const image = await imageRepository.findById(imageId);
    if (!image) {
      throw new AppError('Görsel bulunamadı.', 404, 'IMAGE_NOT_FOUND');
    }

    // Atomik işlem
    await imageRepository.setCoverTransaction(image.propertyId, imageId);
  },

  /**
   * Görsellerin sırasını güncelle.
   */
  async reorderImages(propertyId: string, orders: ReorderImageDto[]): Promise<void> {
    const property = await propertyRepository.findById(propertyId);
    if (!property) {
      throw new AppError('İlan bulunamadı.', 404, 'PROPERTY_NOT_FOUND');
    }

    await imageRepository.updateOrders(propertyId, orders);
  },
};
