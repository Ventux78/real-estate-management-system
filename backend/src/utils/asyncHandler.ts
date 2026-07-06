import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Async route handler'lardan fırlayan Promise rejection'larını
 * otomatik olarak Express error handler'a yönlendirir.
 *
 * Kullanım olmadan:
 *   router.get('/', async (req, res, next) => {
 *     try { ... } catch (e) { next(e); }
 *   });
 *
 * Kullanım ile:
 *   router.get('/', asyncHandler(async (req, res) => {
 *     ...  // try/catch gerekmez
 *   }));
 */
export const asyncHandler =
  (fn: RequestHandler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
