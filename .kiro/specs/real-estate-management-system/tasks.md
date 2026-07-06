# Implementation Plan: Sprint 1 — Backend Foundation

## Overview

Bu sprint, Node.js + Express + TypeScript tabanlı backend iskeletini production-grade kalitede kurar. Veritabanı, Prisma, JWT ve Authentication bu sprintin kapsamı dışındadır. Sprint sonunda: proje derleniyor, `npm run dev` çalışıyor, sunucu ayağa kalkıyor, `GET /api/v1/health` 200 dönüyor ve middleware zinciri aktif.

Uygulama dili: **TypeScript**. Proje dizini: `C:\Users\murat\OneDrive\Desktop\gayrimenkul\backend`

---

## Tasks

- [x] 1. Proje iskelet kurulumu
  - [x] 1.1 `package.json` oluştur ve klasör yapısını kur
    - `npm init -y` ile `package.json` oluştur, `name`, `version`, `description`, `main`, `engines` alanlarını design'daki değerlerle güncelle
    - Şu dizinleri oluştur: `src/config`, `src/common/errors`, `src/common/types`, `src/middlewares`, `src/modules/health`, `src/routes`, `src/services`, `src/utils`, `src/types`, `tests/unit/utils`, `tests/unit/middlewares`, `tests/integration`
    - `.gitignore` dosyasını oluştur: `node_modules/`, `dist/`, `.env`, `coverage/`, `*.js.map` girdilerini ekle
    - _Requirements: 3.1, 3.4_

- [x] 2. npm paketleri kurulumu
  - [x] 2.1 Production bağımlılıklarını yükle
    - Şu paketleri **sabit sürümlerle** yükle: `express@4.18.2`, `dotenv@16.4.5`, `cors@2.8.5`, `helmet@7.1.0`, `morgan@1.10.0`, `compression@1.7.4`, `express-rate-limit@7.2.0`, `zod@3.23.8`
    - _Requirements: 2.1, 2.3_
  - [x] 2.2 Dev bağımlılıklarını yükle
    - Şu paketleri **sabit sürümlerle** yükle: `typescript@5.4.5`, `ts-node-dev@2.0.0`, `tsconfig-paths@4.2.0`, `@types/express@4.17.21`, `@types/node@20.12.7`, `@types/cors@2.8.17`, `@types/morgan@1.9.9`, `@types/compression@1.7.5`, `eslint@8.57.0`, `@typescript-eslint/parser@7.8.0`, `@typescript-eslint/eslint-plugin@7.8.0`, `prettier@3.2.5`
    - Test bağımlılıklarını da yükle: `jest@29.7.0`, `ts-jest@29.1.4`, `@types/jest@29.5.12`, `supertest@7.0.0`, `@types/supertest@6.0.2`, `fast-check@3.19.0`
    - _Requirements: 2.1, 2.3_

- [x] 3. TypeScript yapılandırması
  - [x] 3.1 `tsconfig.json` dosyasını oluştur
    - `target: ES2022`, `module: commonjs`, `outDir: ./dist`, `rootDir: ./src`, `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitReturns: true`, `noFallthroughCasesInSwitch: true`
    - `moduleResolution: node`, `esModuleInterop: true`, `resolveJsonModule: true`, `allowSyntheticDefaultImports: true`, `sourceMap: true`, `skipLibCheck: true`, `forceConsistentCasingInFileNames: true`
    - `baseUrl: "."`, `paths` bölümüne şu alias'ları ekle: `@/*`, `@/config/*`, `@/modules/*`, `@/middlewares/*`, `@/utils/*`, `@/types/*`, `@/common/*`, `@/services/*`
    - `include: ["src/**/*", "tests/**/*"]`, `exclude: ["node_modules", "dist"]`
    - _Requirements: 3.1, 3.4_
  - [x] 3.2 `package.json` script'lerini ekle
    - `dev`, `build`, `start`, `lint`, `lint:fix`, `format`, `type-check`, `test`, `test:unit`, `test:integration`, `test:watch`, `clean` script'lerini design'daki komutlarla ekle
    - `jest.config.ts` dosyasını oluştur: `preset: ts-jest`, `testEnvironment: node`, `roots: ["<rootDir>/tests"]`, `moduleNameMapper: {"^@/(.*)$": "<rootDir>/src/$1"}`
    - _Requirements: 3.1_

- [x] 4. Environment sistemi
  - [x] 4.1 `.env.example` şablon dosyasını oluştur
    - `PORT=3001`, `NODE_ENV=development` zorunlu alanları ekle
    - `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN=15m`, `JWT_REFRESH_EXPIRES_IN=7d`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CORS_ORIGIN=http://localhost:3000` alanlarını yorum satırlarıyla birlikte ekle
    - `.env` dosyasını oluştur: `.env.example` içeriğini gerçek geliştirme değerleriyle doldur (`PORT=3001`, `NODE_ENV=development`, `CORS_ORIGIN=http://localhost:3000`)
    - _Requirements: 8.8_
  - [x] 4.2 `src/config/env.ts` ve `src/config/index.ts` dosyalarını oluştur
    - `dotenv.config()` çağrısı, Zod `envSchema` tanımı (PORT string → number transform, NODE_ENV enum, opsiyonel DATABASE_URL/JWT/Cloudinary alanları, CORS_ORIGIN default değerli)
    - `safeParse` ile fail-fast: parse başarısız olursa `console.error` + `process.exit(1)`
    - `export const env: Env` ve `export type { Env }` ile dışa aç
    - `src/config/index.ts` barrel export dosyasını oluştur
    - _Requirements: 8.8_

- [x] 5. Common katmanı — Hata sınıf hiyerarşisi
  - [x] 5.1 `src/common/errors/AppError.ts` dosyasını oluştur
    - `statusCode`, `code`, `isOperational: true`, `details?` alanlarına sahip `AppError extends Error` sınıfını yaz
    - `Object.setPrototypeOf(this, new.target.prototype)` ve `Error.captureStackTrace` ile prototype chain'i düzelt
    - _Requirements: 7.5, 8.4_
  - [x] 5.2 `src/common/errors/HttpError.ts` dosyasını oluştur
    - `AppError`'dan türetilmiş hazır hata sınıflarını oluştur: `BadRequestError (400)`, `UnauthorizedError (401)`, `ForbiddenError (403)`, `NotFoundError (404)`, `ConflictError (409)`
    - Her sınıf için uygun Türkçe default mesaj ve makine-okunabilir code string'i ekle
    - `src/common/types/response.types.ts` dosyasını oluştur: `SuccessResponse<T>` ve `ErrorResponse` TypeScript interface'lerini tanımla
    - _Requirements: 7.5_

- [x] 6. Utility fonksiyonlar
  - [x] 6.1 `src/utils/asyncHandler.ts` dosyasını oluştur
    - `(fn: RequestHandler) => (req, res, next) => void` imzalı wrapper fonksiyonu yaz
    - `Promise.resolve(fn(req, res, next)).catch(next)` ile async hataları otomatik olarak error handler'a yönlendir
    - _Requirements: 3.1_
  - [x] 6.2 `src/utils/response.ts` dosyasını oluştur
    - `successResponse<T>(data: T, meta?: object)` fonksiyonu: `{ success: true, data, meta? }` döner
    - `errorResponse(code: string, message: string, details?: unknown)` fonksiyonu: `{ success: false, error: { code, message, details? } }` döner
    - `src/types/express.d.ts` dosyasını oluştur: `Express.Request` interface'ini genişlet (GÖREV 4'te `user` alanı eklenecek, şimdi boş augmentation yeterli)
    - `src/types/index.ts` barrel export dosyasını oluştur
    - _Requirements: 7.5_

- [x] 7. Middleware katmanı
  - [x] 7.1 `src/middlewares/errorHandler.ts` dosyasını oluştur
    - 4-parametreli Express error handler: `(err, req, res, next)`
    - `ZodError` → 400 + `VALIDATION_ERROR` + `fieldErrors` details
    - `AppError` → `err.statusCode` + `err.code` + `err.message`; development'ta `details` ekle, production'da gizle
    - Unknown `Error` → 500 + `INTERNAL_SERVER_ERROR`; `console.error` ile stack trace logla; development'ta `stack` ekle, production'da gizle
    - _Requirements: 7.5, 8.4_
  - [x] 7.2 `src/middlewares/notFoundHandler.ts` dosyasını oluştur
    - `(req, res) => void` imzalı handler: 404 + `NOT_FOUND` kodu + `${req.method} ${req.originalUrl} endpoint'i bulunamadı.` mesajı
    - _Requirements: 7.5_
  - [x] 7.3 `src/middlewares/rateLimiter.ts` dosyasını oluştur
    - `windowMs: 15 * 60 * 1000`, `max: 200`, `standardHeaders: true`, `legacyHeaders: false` ile global limiter oluştur
    - Rate limit aşımı mesajını standart error response formatında tanımla: `{ success: false, error: { code: "RATE_LIMIT_EXCEEDED", message: "..." } }`
    - _Requirements: 8.5_
  - [x] 7.4 `src/middlewares/errorHandler.ts` için unit testler yaz
    - `ZodError`, `AppError`, bilinmeyen `Error` durumlarında response formatının doğru olduğunu test et
    - `NODE_ENV=production`'da `stack` ve `details` alanlarının gizlendiğini test et
    - _Requirements: 7.5_

- [x] 8. Health modülü
  - [x] 8.1 `src/modules/health/health.controller.ts` dosyasını oluştur
    - `const startTime = Date.now()` module seviyesinde tanımla
    - `healthCheck(req, res)` fonksiyonu: `{ status: "ok", uptime: number, timestamp: ISO8601, environment: string, version: string }` döner
    - `version` değerini `package.json`'dan oku (veya `process.env.npm_package_version`)
    - `uptime` saniye cinsinden, `Math.floor((Date.now() - startTime) / 1000)` ile hesapla
    - _Requirements: 9.1_
  - [x] 8.2 `src/modules/health/health.routes.ts` dosyasını oluştur
    - `Router()` oluştur, `GET /` → `healthCheck` bağlantısını yap
    - Router'ı default export et
    - _Requirements: 9.1_
  - [x] 8.3 Health endpoint için property-based test yaz
    - **Property 1: Health Endpoint Response Shape**
    - `GET /api/v1/health` her zaman `{ status: "ok", uptime: ≥0, timestamp: ISO8601, environment: development|test|production }` döner
    - `supertest` ile `createApp()` import ederek test yaz; gerçek port açmaya gerek yok
    - **Validates: Requirements 9.1**
    - _Requirements: 9.1_

- [x] 9. Merkezi router
  - [x] 9.1 `src/routes/index.ts` dosyasını oluştur
    - `Router()` oluştur, `apiRouter.use('/health', healthRouter)` bağlantısını yap
    - Auth ve properties router'ları için yorum satırı placeholder'ları ekle (GÖREV 4, GÖREV 5)
    - `apiRouter`'ı named export ile dışa aç
    - _Requirements: 3.1, 7.1_

- [x] 10. Express uygulaması
  - [x] 10.1 `src/app.ts` dosyasını oluştur
    - `createApp(): Application` factory fonksiyonunu yaz
    - Middleware sırası (her adımda Türkçe yorum ekle):
      1. `helmet()`
      2. `compression()`
      3. `express.json({ limit: '10mb' })` + `express.urlencoded({ extended: true, limit: '10mb' })`
      4. `cors({ origin: env.CORS_ORIGIN, credentials: true, methods: [...], allowedHeaders: [...] })`
      5. `morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev')`
      6. `globalLimiter` → `/api` prefix'i altında
      7. `apiRouter` → `/api/v1` prefix'i altında
      8. `notFoundHandler`
      9. `errorHandler`
    - `createApp`'i named export ile dışa aç
    - _Requirements: 8.1, 8.6, 8.7_
  - [x] 10.2 Error response format invariant için integration test yaz
    - **Property 2: Error Response Format Invariant**
    - Herhangi bir hata response'unun `{ success: false, error: { code: string, message: string } }` formatına uyduğunu doğrula
    - **Property 5: Invalid JSON Body Returns 400**
    - Malformed JSON body ile POST isteğinde 500 değil 400 (ya da 404) döndüğünü ve server'ın çökmediğini test et
    - **Validates: Requirements 7.5, 8.4**
    - _Requirements: 7.5, 8.4_

- [x] 11. HTTP sunucusu
  - [x] 11.1 `src/server.ts` dosyasını oluştur
    - `createApp()` import et, `app.listen(env.PORT, callback)` ile sunucuyu başlat
    - Başlangıç log'una port, ortam ve health endpoint URL'ini yazdır
    - `SIGTERM` sinyalinde graceful shutdown: `server.close(() => process.exit(0))`
    - `unhandledRejection` handler: `console.error` + `server.close(() => process.exit(1))`
    - _Requirements: 3.1, 9.1_
  - [x] 11.2 404 ve güvenlik başlıkları için property-based integration testler yaz
    - **Property 3: Unknown Route Returns 404**
    - `fc.webPath()` ile üretilen rastgele path'lerin 404 ve `error.code === "NOT_FOUND"` döndürdüğünü test et (`numRuns: 50`)
    - **Property 4: Security Headers Present on Every Response**
    - `fc.webPath()` ile üretilen rastgele path'lerde `x-content-type-options`, `x-frame-options`, `x-dns-prefetch-control` başlıklarının bulunduğunu test et (`numRuns: 100`)
    - **Validates: Requirements 7.5, 8.1, 8.6**
    - _Requirements: 7.5, 8.1, 8.6_

- [x] 12. Kod kalitesi araçları
  - [x] 12.1 `.eslintrc.json` dosyasını oluştur
    - `parser: @typescript-eslint/parser`, `plugins: ["@typescript-eslint"]`
    - `extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"]`
    - Kurallar: `@typescript-eslint/no-explicit-any: warn`, `@typescript-eslint/no-unused-vars: error`, `no-console: off`
    - _Requirements: 3.1_
  - [x] 12.2 `.prettierrc` dosyasını oluştur
    - `semi: true`, `singleQuote: true`, `trailingComma: "all"`, `printWidth: 100`, `tabWidth: 2`
    - _Requirements: 3.1_

- [x] 13. Son doğrulama checkpoint'i
  - `npm run build` hatasız tamamlanıyor mu? (`dist/` klasörü oluşuyor mu?)
  - `npm run type-check` TypeScript hatası yok mu?
  - `npm run lint` uyarı yok mu?
  - `npm test` tüm testler geçiyor mu? (property testleri dahil)
  - Manuel doğrulama için: `npm run dev` çalıştır, `GET http://localhost:3001/api/v1/health` → HTTP 200, `{ status: "ok", uptime, timestamp, environment, version }` döndüğünü kontrol et
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- `*` ile işaretli alt görevler opsiyoneldir; MVP için atlanabilir
- Her görev bir öncekine bağlıdır; sırayla uygulayın
- `src/server.ts` test kapsamı dışındadır (gerçek port bağlar); testler `createApp()` kullanır
- Property testleri (`fast-check`) minimum 50–100 iterasyon çalışır; her test design property numarasına referans verir
- GÖREV 3'te Prisma eklenince `env.ts` içindeki `DATABASE_URL` `optional()` yerine zorunlu hale gelecek
- GÖREV 4'te `auth.middleware.ts` ve `validate.middleware.ts` skeleton dosyaları oluşturulacak

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["3.1", "3.2"] },
    { "id": 3, "tasks": ["4.1", "4.2"] },
    { "id": 4, "tasks": ["5.1", "5.2"] },
    { "id": 5, "tasks": ["6.1", "6.2"] },
    { "id": 6, "tasks": ["7.1", "7.2", "7.3"] },
    { "id": 7, "tasks": ["7.4", "8.1", "8.2"] },
    { "id": 8, "tasks": ["8.3", "9.1"] },
    { "id": 9, "tasks": ["10.1"] },
    { "id": 10, "tasks": ["10.2", "11.1"] },
    { "id": 11, "tasks": ["11.2", "12.1", "12.2"] }
  ]
}
```
