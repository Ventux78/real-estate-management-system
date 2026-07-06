import { Router } from 'express';
import healthRouter from '@/modules/health/health.routes';
import authRouter from '@/modules/auth/auth.routes';
import propertyRouter from '@/modules/property/property.routes';
import { imageRouter } from '@/modules/images';

export const apiRouter = Router();

// ─── Health ───────────────────────────────────────────────────
apiRouter.use('/health', healthRouter);

// ─── Auth ─────────────────────────────────────────────────────
apiRouter.use('/auth', authRouter);

// ─── Properties ───────────────────────────────────────────────
apiRouter.use('/properties', propertyRouter);

// ─── Images ───────────────────────────────────────────────────
apiRouter.use('/', imageRouter); // Paths inside already start with /properties or /images
