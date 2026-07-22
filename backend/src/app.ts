import express, { Application } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '@/config/swagger';

import { env } from '@/config';
import { globalLimiter } from '@/middlewares/rateLimiter';
import { apiRouter } from '@/routes';
import { notFoundHandler } from '@/middlewares/notFoundHandler';
import { errorHandler } from '@/middlewares/errorHandler';

export function createApp(): Application {
  const app: Application = express();

  // ─────────────────────────────────────────────────────────
  // 1. HELMET — Güvenlik HTTP Başlıkları
  // ─────────────────────────────────────────────────────────
  // Neden ilk sırada: Başlıklar response'a eklenmeden önce
  // ayarlanmalı. Diğer middleware'ler response yazmaya başlamadan
  // Helmet'in devrede olması gerekir.
  app.use(helmet());

  // ─────────────────────────────────────────────────────────
  // 2. COMPRESSION — Response Sıkıştırma
  // ─────────────────────────────────────────────────────────
  // Neden ikinci: JSON body parse'dan önce gelmeli ki büyük
  // response'lar sıkıştırılabilsin. Body parse'dan sonra gelirse
  // bazı response'lar sıkıştırılmadan geçebilir.
  app.use(compression());

  // ─────────────────────────────────────────────────────────
  // 3. JSON PARSER — Request Body Parse
  // ─────────────────────────────────────────────────────────
  // Neden bu sırada: Route handler'lardan önce body parse edilmeli.
  // limit: 10mb — büyük JSON payload'larına karşı koruma.
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ─────────────────────────────────────────────────────────
  // 4. CORS — Cross-Origin Resource Sharing
  // ─────────────────────────────────────────────────────────
  // Neden bu sırada: OPTIONS preflight istekleri route handler'lara
  // ulaşmadan cevaplanmalı.
  const defaultAllowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ];

  const envOrigins = (env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const allowedOriginsSet = new Set([...defaultAllowedOrigins, ...envOrigins]);

  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!requestOrigin) {
          return callback(null, true);
        }

        // Check if origin is explicitly allowed or matches local defaults
        if (allowedOriginsSet.has(requestOrigin)) {
          return callback(null, true);
        }

        // Check for Vercel deployment preview / production domains (*.vercel.app)
        if (/\.vercel\.app$/.test(requestOrigin)) {
          return callback(null, true);
        }

        console.warn(`[CORS] Blocked request from origin: ${requestOrigin}`);
        return callback(null, false);
      },
      credentials: true, // Cookie/Authorization header izni
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // ─────────────────────────────────────────────────────────
  // 5. MORGAN — HTTP Request Logging
  // ─────────────────────────────────────────────────────────
  // Neden bu sırada: Route işleminden önce gelmeli ki tüm istekler
  // loglanabilsin. Hatalı istekler de dahil.
  // dev: Renkli, kısa format — geliştirme için
  // combined: Apache-style detaylı format — production için
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // ─────────────────────────────────────────────────────────
  // 6. RATE LIMITING — İstek Hız Sınırlama
  // ─────────────────────────────────────────────────────────
  // Neden bu sırada: Route handler'lardan önce, bot/DDoS isteklerini
  // route işleme maliyetine katlanmadan erken engelle.
  // /api prefix'i altındaki tüm isteklere uygulanır.
  app.use('/api', globalLimiter);

  // ─────────────────────────────────────────────────────────
  // 7. ROUTES — Uygulama Route'ları
  // ─────────────────────────────────────────────────────────
  // Tüm business logic route'ları /api/v1 prefix'i altında.
  app.use('/api/v1', apiRouter);

  // ─────────────────────────────────────────────────────────
  // 8. SWAGGER — API Dokümantasyonu
  // ─────────────────────────────────────────────────────────
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // ─────────────────────────────────────────────────────────
  // 9. 404 HANDLER — Bilinmeyen Route
  // ─────────────────────────────────────────────────────────
  // Route'lardan sonra gelir. Eşleşmeyen tüm istekleri yakalar.
  app.use(notFoundHandler);

  // ─────────────────────────────────────────────────────────
  // 9. GLOBAL ERROR HANDLER — Merkezi Hata Yakalama
  // ─────────────────────────────────────────────────────────
  // Express'te 4 parametreli middleware error handler'dır.
  // EN SONDA olmalı — önceki middleware'lerdeki hataları yakalar.
  app.use(errorHandler);

  return app;
}
