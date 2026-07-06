import { Request, Response, NextFunction } from 'express';
import { imageService } from './image.service';
import { propertyIdParamSchema, imageIdParamSchema, reorderImagesSchema } from './image.validation';
import { AppError } from '@/common/errors/AppError';

// Define the structure of the success response expected by clients
interface SuccessResponse<T> {
  success: true;
  data: T;
}

export const imageController = {
  /**
   * POST /api/v1/properties/:id/images
   * Çoklu görsel yükler.
   */
  async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = propertyIdParamSchema.parse(req.params);
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        throw new AppError('Yüklenecek görsel bulunamadı.', 400, 'NO_FILES_UPLOADED');
      }

      const images = await imageService.uploadImages(id, files);
      const response: SuccessResponse<typeof images> = { success: true, data: images };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/properties/:id/images
   * İlanın görsellerini getirir.
   */
  async getByProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = propertyIdParamSchema.parse(req.params);
      const images = await imageService.getImages(id);
      const response: SuccessResponse<typeof images> = { success: true, data: images };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/v1/images/:imageId
   * Görseli siler.
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { imageId } = imageIdParamSchema.parse(req.params);
      await imageService.deleteImage(imageId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/v1/images/:imageId/cover
   * Kapak fotoğrafı yapar.
   */
  async setCover(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { imageId } = imageIdParamSchema.parse(req.params);
      await imageService.setCover(imageId);
      res.status(200).json({ success: true, data: null });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/v1/properties/:id/images/order
   * Görselleri sıralar.
   */
  async reorder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = propertyIdParamSchema.parse(req.params);
      const { images } = reorderImagesSchema.parse(req).body;

      await imageService.reorderImages(id, images);
      res.status(200).json({ success: true, data: null });
    } catch (error) {
      next(error);
    }
  },
};
