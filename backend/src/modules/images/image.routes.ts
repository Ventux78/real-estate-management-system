import { Router } from 'express';
import multer from 'multer';
import { AppError } from '@/common/errors/AppError';
import { imageController } from './image.controller';
import { authenticate } from '@/modules/auth/auth.middleware';

const imageRouter = Router();

// Multer memory storage (we send buffer to Cloudinary directly)
const storage = multer.memoryStorage();

const fileFilter = (req: import('express').Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const extensionMatch = file.originalname.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/);
  
  if (allowedMimeTypes.includes(file.mimetype) && extensionMatch) {
    cb(null, true);
  } else {
    cb(new AppError('Sadece jpeg, jpg, png ve webp formatları desteklenir. Diğer uzantılar reddedildi.', 400, 'INVALID_FILE_TYPE'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter,
});

const uploadMiddleware = (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
  upload.array('images', 20)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('Dosya boyutu en fazla 10MB olabilir.', 400, 'FILE_TOO_LARGE'));
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new AppError('Bir ilanda en fazla 20 dosya yükleyebilirsiniz.', 400, 'TOO_MANY_FILES'));
      }
      return next(new AppError('Dosya yükleme hatası: ' + err.message, 400, 'UPLOAD_ERROR'));
    } else if (err) {
      return next(err);
    }
    next();
  });
};

// Define routes
// NOTE: endpoints are designed to be mounted at /api/v1 (e.g., properties/:id/images)
// But since the parent router might not pass params, we will mount it directly in main router or handle carefully.
// Actually, it's better to export the router and mount the specific paths in src/routes/index.ts.

imageRouter.post(
  '/properties/:id/images',
  authenticate,
  uploadMiddleware, // Replaces upload.array() with custom error handler
  imageController.upload
);

imageRouter.get(
  '/properties/:id/images',
  imageController.getByProperty
);

imageRouter.patch(
  '/properties/:id/images/order',
  authenticate,
  imageController.reorder
);

imageRouter.delete(
  '/images/:imageId',
  authenticate,
  imageController.delete
);

imageRouter.patch(
  '/images/:imageId/cover',
  authenticate,
  imageController.setCover
);

export default imageRouter;
