/**
 * Auth Routes
 *
 * Mimarideki Görev:
 * Auth modülünün tüm route tanımlarını merkezi olarak barındırır.
 * Hangi endpoint'in hangi middleware zincirinden geçeceğini ve hangi
 * controller handler'ını çağıracağını burada tanımlanır.
 *
 * /api/v1/auth prefix'i routes/index.ts'de eklenir.
 *
 * Sprint 3.1 endpoint'leri:
 *   POST   /login  — kimlik doğrulama (public)
 *   GET    /me     — mevcut kullanıcı (protected)
 *
 * Sprint 3.2'de eklenecek:
 *   POST   /refresh  — token yenileme
 *   POST   /logout   — çıkış
 */

import { Router } from 'express';
import { authController } from '@/modules/auth/auth.controller';
import { authenticate } from '@/modules/auth/auth.middleware';

const authRouter = Router();

// ─── Public Routes ───────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/login
 * Kimlik doğrulama — Access Token döndürür.
 * Herkes erişebilir; authenticate middleware yok.
 */
authRouter.post('/login', authController.login);

// ─── Protected Routes ────────────────────────────────────────────────────────

/**
 * GET /api/v1/auth/me
 * Oturumdaki kullanıcının bilgilerini döndürür.
 * authenticate middleware JWT'yi doğrular ve req.user'ı doldurur.
 */
authRouter.get('/me', authenticate, authController.me);

export default authRouter;
