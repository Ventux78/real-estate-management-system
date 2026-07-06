/**
 * Auth Middleware
 *
 * Mimarideki Görev:
 * Korunan route'lara gelen request'lerdeki JWT'yi doğrular.
 * Başarılı doğrulamada req.user'ı doldurur ve next()'i çağırır.
 * Başarısız durumda next(AppError) çağırarak global errorHandler'a
 * devreder. Route handler'lar HTTP güvenlik detaylarıyla ilgilenmez.
 *
 * Kullanım:
 *   router.get('/me', authenticate, authController.me);
 */

import { Request, Response, NextFunction } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { AppError } from '@/common/errors/AppError';
import { verifyAccessToken } from '@/utils/jwt.util';

/**
 * JWT Access Token doğrulayan Express middleware.
 *
 * Beklenen header formatı:
 *   Authorization: Bearer <token>
 *
 * Hata senaryoları:
 * - Header yok veya format hatalı → 401 MISSING_TOKEN
 * - Token imzası geçersiz / malformed → 401 INVALID_TOKEN
 * - Token süresi dolmuş → 401 TOKEN_EXPIRED
 */
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    // 1. Authorization header'ını oku
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(
        'Kimlik doğrulama token\'ı bulunamadı.',
        401,
        'MISSING_TOKEN'
      );
    }

    // 2. "Bearer " prefix'ini kaldır
    const token = authHeader.slice(7);

    if (!token) {
      throw new AppError(
        'Kimlik doğrulama token\'ı bulunamadı.',
        401,
        'MISSING_TOKEN'
      );
    }

    // 3. Token'ı doğrula ve payload'ı al
    const payload = verifyAccessToken(token);

    // 4. req.user'ı doldur (auth.types.ts'deki global augmentation)
    req.user = {
      id: payload.sub,
      username: payload.username,
    };

    next();
  } catch (err) {
    // JWT kütüphanesinin kendi hataları
    if (err instanceof TokenExpiredError) {
      next(new AppError('Token süresi dolmuş. Lütfen tekrar giriş yapın.', 401, 'TOKEN_EXPIRED'));
      return;
    }

    if (err instanceof JsonWebTokenError) {
      next(new AppError('Geçersiz token.', 401, 'INVALID_TOKEN'));
      return;
    }

    // AppError veya beklenmedik hata — global handler'a geç
    next(err);
  }
}
