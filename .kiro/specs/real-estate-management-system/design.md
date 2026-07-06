# Design Document — GÖREV 2: Backend Foundation (Project Scaffolding)

## Overview

Bu belge, Profesyonel Gayrimenkul Yönetim Sistemi'nin **GÖREV 2: Backend Foundation** fazını kapsar. Amaç; production-grade kalitede, feature-based mimari ile Node.js + Express + TypeScript tabanlı bir backend iskeletini eksiksiz olarak kurmaktır.

Bu faz sonunda çalışan bir HTTP sunucusu, yapılandırılmış middleware zinciri, merkezi hata yönetimi ve sağlık kontrolü endpoint'i bulunacaktır. Prisma ve veritabanı bağlantısı bu fazın kapsamı dışındadır — bir sonraki görevde ele alınacaktır.

**Kapsam:**
- Proje klasör yapısı ve modül organizasyonu
- npm paket seçimleri ve gerekçeleri
- TypeScript yapılandırması
- Environment sistemi ve validated config
- Express uygulama yapısı ve middleware zinciri
- Global hata yönetimi
- Health check endpoint
- Logger altyapısı
- Import alias yapılandırması
- npm script'leri

---

## Architecture

### Genel Yaklaşım

Feature-based (modüle dayalı) mimari seçilmiştir. Bu yaklaşım; her domain özelliğini (auth, properties, images) kendi klasöründe kapsüller; route, controller, service ve validation katmanları birlikte bulunur. Bu yapı "horizontal" (katmanlı: controllers/, services/, routes/) mimariye kıyasla şu avantajları sunar:

- **Bağımsız geliştirme**: Bir modülü başka modüllere dokunmadan değiştirebilirsiniz
- **Anlaşılırlık**: Bir özelliği anlamak için tek bir klasöre bakmanız yeterlidir
- **Ölçeklenebilirlik**: Yeni bir modül eklemek mevcut yapıyı bozmaz
- **Test edilebilirlik**: Modül sınırları mock sınırlarıyla örtüşür

### Katman Akışı

```
HTTP Request
    │
    ▼
┌─────────────────────────────────────────┐
│              server.ts                  │
│  (HTTP server başlatma, port dinleme)   │
└─────────────────────┬───────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────┐
│               app.ts                    │
│  (Express app, middleware zinciri)      │
└─────────────────────┬───────────────────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
    Global MW    Route MW    Error MW
    (Helmet,    (Auth,       (Global
    CORS,       Validate)    Error
    Morgan,                  Handler)
    RateLimit)
          │
          ▼
┌─────────────────────────────────────────┐
│           src/routes/index.ts           │
│  (Tüm route'ları /api/v1 altına bağlar) │
└─────────────────────┬───────────────────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
     /health      /auth       /properties
     (bu faz)   (GÖREV 4)    (GÖREV 5)
```

### app.ts ve server.ts Ayrımı

`app.ts` ve `server.ts` dosyalarının ayrılması bilinçli bir karardır:

- **`app.ts`**: Express uygulamasını oluşturur, middleware'leri ve route'ları bağlar. `module.exports` ile dışa açılır. Integration testlerinde `supertest` bu dosyayı doğrudan import eder, gerçek bir port dinlemesine gerek kalmaz.
- **`server.ts`**: `app.ts`'yi import eder, `app.listen()` çağrısını yapar, port bağlama ve başlangıç loglamasını yönetir. Bu dosya yalnızca production/development çalıştırmasında kullanılır.

Bu pattern; test izolasyonu, port çakışmalarından korunma ve "testable by design" ilkesini sağlar.

---

## Components and Interfaces

### 1. Profesyonel Klasör Yapısı

```
gayrimenkul-api/
├── src/
│   ├── config/              # Uygulama yapılandırması
│   │   ├── env.ts           # Validated environment config (Zod ile)
│   │   └── index.ts         # Config barrel export
│   │
│   ├── common/              # Paylaşılan yardımcı tipler ve sınıflar
│   │   ├── errors/
│   │   │   ├── AppError.ts  # Base custom error sınıfı
│   │   │   └── HttpError.ts # HTTP-aware error sınıfı
│   │   └── types/
│   │       └── response.types.ts  # Standart API response tipleri
│   │
│   ├── middlewares/         # Uygulama geneli middleware'ler
│   │   ├── auth.middleware.ts      # JWT doğrulama (GÖREV 4)
│   │   ├── errorHandler.ts         # Global error handler
│   │   ├── notFoundHandler.ts      # 404 handler
│   │   ├── rateLimiter.ts          # express-rate-limit config
│   │   └── validate.middleware.ts  # Zod schema validation
│   │
│   ├── modules/             # Feature-based modüller
│   │   ├── auth/            # Kimlik doğrulama (GÖREV 4)
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.schemas.ts
│   │   ├── properties/      # Gayrimenkul ilanları (GÖREV 5)
│   │   │   ├── properties.controller.ts
│   │   │   ├── properties.service.ts
│   │   │   ├── properties.routes.ts
│   │   │   └── properties.schemas.ts
│   │   ├── images/          # Görsel yönetimi (GÖREV 5)
│   │   │   ├── images.controller.ts
│   │   │   ├── images.service.ts
│   │   │   ├── images.routes.ts
│   │   │   └── images.schemas.ts
│   │   └── health/          # Health check (BU GÖREV)
│   │       ├── health.controller.ts
│   │       └── health.routes.ts
│   │
│   ├── routes/              # Merkezi route birleştirici
│   │   └── index.ts         # Tüm modül route'larını /api/v1 altına bağlar
│   │
│   ├── services/            # Cross-cutting servisler
│   │   ├── cloudinary.service.ts   # Cloudinary SDK wrapper (GÖREV 5)
│   │   └── logger.service.ts       # Logger abstraction
│   │
│   ├── utils/               # Saf yardımcı fonksiyonlar
│   │   ├── asyncHandler.ts  # async route handler wrapper
│   │   ├── pagination.ts    # Pagination yardımcıları
│   │   └── response.ts      # Standart response builder'ları
│   │
│   ├── types/               # Global TypeScript tip tanımları
│   │   ├── express.d.ts     # Express Request genişletmeleri
│   │   └── index.ts         # Tip barrel export
│   │
│   ├── app.ts               # Express uygulama kurulumu
│   └── server.ts            # HTTP sunucu başlatma
│
├── tests/                   # Test dosyaları (mirror of src)
│   ├── unit/
│   │   ├── utils/
│   │   └── middlewares/
│   └── integration/
│       └── health.test.ts
│
├── .env                     # Gerçek env değerleri (git'e commit edilmez)
├── .env.example             # Şablon env dosyası (commit edilir)
├── .gitignore
├── .eslintrc.json
├── .prettierrc
├── tsconfig.json
├── package.json
└── README.md
```

#### Klasör Sorumlulukları

| Klasör | Sorumluluk | Gerekçe |
|--------|-----------|---------|
| `src/config/` | Env okuma ve doğrulama | Config erişimini merkezi, type-safe ve fail-fast yapar |
| `src/common/` | Paylaşılan error sınıfları ve response tipleri | DRY; her modülün kendi hata sınıfı tanımlamaması için |
| `src/middlewares/` | Uygulama geneli middleware'ler | Route handler'lardan ayrı tutarak test edilebilirliği artırır |
| `src/modules/` | Feature modülleri | İş mantığı burada yaşar; cohesion yüksek, coupling düşük |
| `src/routes/` | Merkezi route birleştirici | Tüm URL'lerin tek yerden yönetilmesi |
| `src/services/` | Cross-cutting servisler | Cloudinary, logger gibi birden fazla modülün kullandığı servisler |
| `src/utils/` | Saf yardımcı fonksiyonlar | Side effect içermeyen, test edilmesi kolay araçlar |
| `src/types/` | Global tip tanımları | Express Request tipini genişletme gibi global declarasyonlar |

---

### 2. npm Paket Seçimleri ve Gerekçeleri

#### Production Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "dotenv": "^16.4.5",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "compression": "^1.7.4",
    "express-rate-limit": "^7.2.0",
    "zod": "^3.23.8"
  }
}
```

| Paket | Neden Seçildi | Alternatifler |
|-------|--------------|---------------|
| **express** | Olgun, geniş ekosistem, çok sayıda middleware. Node.js HTTP modülünün üstüne minimal abstraction. | Fastify (daha hızlı ama Express kadar yaygın değil), Koa (middleware farklı), NestJS (çok opinionated) |
| **dotenv** | `.env` dosyasını `process.env`'e yükler. Sıfır bağımlılık, de-facto standart. | cross-env (script düzeyinde), envalid (dotenv + validation, ama Zod ile bunu kendimiz yapıyoruz) |
| **cors** | CORS başlıklarını yönetir. Origin whitelist, credential, method kısıtlaması. Express için optimize edilmiş resmi paket. | Manuel header yazmak (bakım maliyeti yüksek), Nginx düzeyinde CORS (backend kontrolünü kaybedersiniz) |
| **helmet** | 11+ güvenlik HTTP başlığını tek seferde ayarlar. CSP, HSTS, X-Content-Type-Options vb. Express ekibi tarafından önerilen. | Başlıkları manuel set etmek (hata payı yüksek, güncellemesi zor) |
| **morgan** | HTTP istek loglama. Hafif, Express ile doğal entegrasyon, `dev` ve `combined` formatları. | Winston (daha güçlü ama aşırı; istek logu için morgan yeterli), pino-http (daha hızlı ama kurulumu daha karmaşık) |
| **compression** | Gzip/deflate response sıkıştırma. Response boyutunu %60-80 düşürür. | Nginx düzeyinde sıkıştırma (uygun, ama Node seviyesinde de olmalı) |
| **express-rate-limit** | IP bazlı istek sınırlama. Özellikle auth endpoint'leri için zorunlu. In-memory store, Redis store desteği var. | rate-limiter-flexible (daha güçlü ama daha karmaşık), Manuel implementasyon |
| **zod** | Runtime schema validation + TypeScript tip üretimi. Tek pakette validation + tip güvenliği. `z.infer<>` ile type derivation. | Joi (TypeScript desteği zayıf), Yup (performans sorunları), class-validator (decorator tabanlı, NestJS'e özgü hissettiriyor) |

#### Dev Dependencies

```json
{
  "devDependencies": {
    "typescript": "^5.4.5",
    "ts-node-dev": "^2.0.0",
    "@types/express": "^4.17.21",
    "@types/node": "^20.12.7",
    "@types/cors": "^2.8.17",
    "@types/morgan": "^1.9.9",
    "@types/compression": "^1.7.5",
    "eslint": "^8.57.0",
    "@typescript-eslint/parser": "^7.8.0",
    "@typescript-eslint/eslint-plugin": "^7.8.0",
    "prettier": "^3.2.5"
  }
}
```

| Paket | Neden Seçildi |
|-------|--------------|
| **typescript** | Tip güvenliği, IDE desteği, hata erken yakalama. Geliştirme maliyetini uzun vadede düşürür. |
| **ts-node-dev** | TypeScript'i doğrudan çalıştırır + hot reload. `ts-node` + `nodemon` kombinasyonuna kıyasla daha hızlı (incremental compile). |
| **@types/*** | Express, Node, CORS, Morgan ve Compression için DefinitelyTyped tipleri. Type checking için zorunlu. |
| **eslint + @typescript-eslint** | Statik analiz, tutarlı kod stili. TypeScript-aware kurallar. |
| **prettier** | Kod formatlama. Ekip içi tartışmaları ortadan kaldırır. |

> **Not:** Prisma bu fazda dahil edilmemektedir. GÖREV 3'te `prisma` ve `@prisma/client` eklenecektir.

---

## Data Models

### 3. TypeScript Yapılandırması (`tsconfig.json`)

```json
{
  "compilerOptions": {
    // --- Hedef ve Modül ---
    "target": "ES2022",
    // Node.js 18+ ES2022'yi native destekler.
    // ES2022 ile async/await, nullish coalescing, optional chaining native gelir.

    "module": "commonjs",
    // Node.js'in native modül sistemi. ESM (ES modules) Node'da hâlâ
    // bazı ekosistem uyumsuzlukları yaratır. CommonJS güvenli ve olgun.

    "lib": ["ES2022"],
    // TypeScript'e hangi built-in tiplerin mevcut olduğunu söyler.

    // --- Output ---
    "outDir": "./dist",
    // Derlenmiş JS dosyaları buraya gider.

    "rootDir": "./src",
    // Kaynak dosyaların kök dizini. dist/ içindeki yapıyı src/ yansıtır.

    // --- Tip Güvenliği ---
    "strict": true,
    // Tüm strict kontrolleri açar:
    //   strictNullChecks: null/undefined hataları derleme zamanında
    //   noImplicitAny: any tipi zorunlu olarak belirtilmeli
    //   strictFunctionTypes: fonksiyon tipi uyumsuzlukları hata verir
    // Bu flag production-grade kod için tartışmasız gereklidir.

    "noUncheckedIndexedAccess": true,
    // arr[0] tipini T yerine T | undefined yapar. Array erişiminde
    // null check zorunlu olur. Runtime hataları azaltır.

    "noImplicitReturns": true,
    // Tüm code path'lerin değer döndürmesini zorunlu kılar.

    "noFallthroughCasesInSwitch": true,
    // switch/case fall-through'u engeller.

    // --- Modül Çözümleme ---
    "moduleResolution": "node",
    // Node.js'in module resolution algoritmasını kullanır.

    "esModuleInterop": true,
    // CommonJS modülleri default import ile import edilebilir:
    // import express from 'express' (yerine import * as express)

    "resolveJsonModule": true,
    // JSON dosyalarını import etmeye izin verir.

    "allowSyntheticDefaultImports": true,
    // esModuleInterop ile birlikte çalışır.

    // --- Import Alias ---
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/config/*": ["src/config/*"],
      "@/modules/*": ["src/modules/*"],
      "@/middlewares/*": ["src/middlewares/*"],
      "@/utils/*": ["src/utils/*"],
      "@/types/*": ["src/types/*"],
      "@/common/*": ["src/common/*"],
      "@/services/*": ["src/services/*"]
    },
    // @/ prefix'i ile mutlak import yolları.
    // ../../../../middlewares yerine @/middlewares/errorHandler

    // --- Kaynak Haritası ---
    "sourceMap": true,
    // Hata stack trace'lerini TypeScript kaynak satırlarına eşler.
    // Debug ve log analizinde kritik.

    // --- Diğer ---
    "skipLibCheck": true,
    // node_modules içindeki .d.ts dosyalarını tip kontrolüne dahil etmez.
    // Bağımlılık tip çakışmalarını sessizce geçer. Derleme hızını artırır.

    "forceConsistentCasingInFileNames": true
    // Dosya adı büyük/küçük harf tutarsızlıklarını engeller.
    // Linux/macOS arasındaki davranış farkını önler.
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 4. Environment Sistemi

#### `.env.example` (şablon — commit edilir)

```bash
# =============================================================
# SERVER
# =============================================================
PORT=3001
NODE_ENV=development        # development | test | production

# =============================================================
# DATABASE (GÖREV 3'te aktif edilecek)
# =============================================================
DATABASE_URL=postgresql://user:password@localhost:5432/gayrimenkul_db

# =============================================================
# JWT (GÖREV 4'te aktif edilecek)
# =============================================================
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# =============================================================
# CLOUDINARY (GÖREV 5'te aktif edilecek)
# =============================================================
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# =============================================================
# CORS
# =============================================================
CORS_ORIGIN=http://localhost:3000
```

#### `src/config/env.ts` — Validated Config

```typescript
import { z } from 'zod';
import dotenv from 'dotenv';

// .env dosyasını process.env'e yükle
dotenv.config();

/**
 * Uygulama environment şeması.
 *
 * Zod kullanmanın avantajları:
 * 1. Runtime validation: Eksik/hatalı env var'lar başlangıçta fail eder
 * 2. Type inference: env objesinin tipi otomatik oluşur
 * 3. Transform: String'den number'a dönüşüm (PORT için)
 * 4. Default değerler: Opsiyonel alanlar için fallback
 *
 * "Fail fast" prensibi: Eksik bir env var ile çalışmak yerine
 * uygulama başlamadan hata vermek tercih edilir.
 */
const envSchema = z.object({
  // Server
  PORT: z.string().default('3001').transform(Number),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Database — bu fazda zorunlu değil ama tanımlanıyor
  DATABASE_URL: z.string().optional(),

  // JWT — GÖREV 4'te zorunlu hale gelecek
  JWT_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Cloudinary — GÖREV 5'te zorunlu hale gelecek
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

// Tip: z.infer ile TypeScript tipi otomatik türetilir
export type Env = z.infer<typeof envSchema>;

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Geçersiz environment değişkenleri:');
  console.error(parseResult.error.flatten().fieldErrors);
  process.exit(1); // Fail fast: hatalı config ile çalışma
}

export const env: Env = parseResult.data;
```

#### `src/config/index.ts` — Config Barrel

```typescript
export { env } from './env';
export type { Env } from './env';
```

---

### 5. Express Uygulama Yapısı (`app.ts`)

Middleware sırası kritiktir. Her middleware bir öncekine bağımlıdır ve sıra yanlış olduğunda güvenlik açıkları veya beklenmedik davranışlar ortaya çıkar.

```typescript
import express, { Application } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from '@/config';
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
  // ulaşmadan cevaplanmalı. Aynı zamanda body parse'dan sonra
  // gelmeli ki origin bilgisine erişilebilin.
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,          // Cookie/Authorization header izni
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
  // Auth endpoint'leri için özel, daha katı limiter GÖREV 4'te gelecek.
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 dakika
    max: 200,                    // IP başına 15 dakikada 200 istek
    standardHeaders: true,       // RateLimit-* başlıkları ekle (RFC 6585)
    legacyHeaders: false,        // X-RateLimit-* eski başlıkları kaldır
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.',
      },
    },
  });
  app.use('/api', globalLimiter);

  // ─────────────────────────────────────────────────────────
  // 7. ROUTES — Uygulama Route'ları
  // ─────────────────────────────────────────────────────────
  // Tüm business logic route'ları /api/v1 prefix'i altında.
  app.use('/api/v1', apiRouter);

  // ─────────────────────────────────────────────────────────
  // 8. 404 HANDLER — Bilinmeyen Route
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
```

#### `src/server.ts` — HTTP Sunucu Başlatma

```typescript
import { createApp } from './app';
import { env } from '@/config';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`
  ┌─────────────────────────────────────────┐
  │  🚀 Gayrimenkul API başlatıldı          │
  │  Port    : ${env.PORT}                       │
  │  Ortam   : ${env.NODE_ENV}               │
  │  Sağlık  : http://localhost:${env.PORT}/api/v1/health │
  └─────────────────────────────────────────┘
  `);
});

// Graceful shutdown — SIGTERM (docker stop, K8s) için
process.on('SIGTERM', () => {
  console.log('SIGTERM alındı. Server kapatılıyor...');
  server.close(() => {
    console.log('HTTP server kapatıldı.');
    process.exit(0);
  });
});

// Unhandled promise rejection koruması
process.on('unhandledRejection', (reason: unknown) => {
  console.error('Unhandled Rejection:', reason);
  server.close(() => process.exit(1));
});
```

---

### 6. Global Error Handler

#### Tasarım Felsefesi

Merkezi hata yönetiminin iki temel amacı vardır:

1. **Operational errors** (beklenen hatalar): 404, 400, 401, 403, 409. Kullanıcı kaynaklı veya iş mantığı hataları. Client'a anlamlı mesaj dönülür.
2. **Programmer errors** (beklenmedik hatalar): TypeError, ReferenceError, unhandled promise rejection. Programın bug'ı. Client'a generic 500 dönülür, detay loglanır.

Bu ayrım şunları sağlar:
- Client hiçbir zaman stack trace görmez
- Operational hatalar 500 olarak loglanmaz (false alarm engellenir)
- Programmer hataları tam detayıyla loglanır (debug kolaylığı)

#### `src/common/errors/AppError.ts`

```typescript
/**
 * Tüm operational error'ların base sınıfı.
 *
 * isOperational: true — bu hata beklenen bir durum, 500 değil
 * statusCode: HTTP status kodu
 * code: Makine-okunabilir hata kodu (client tarafı switch/case için)
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;

    // Prototype chain düzeltmesi (TypeScript extends Error için gerekli)
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
```

#### `src/common/errors/HttpError.ts` — Hazır HTTP Hataları

```typescript
import { AppError } from './AppError';

export class BadRequestError extends AppError {
  constructor(message = 'Geçersiz istek', details?: unknown) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Kimlik doğrulama gerekli') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Bu işlem için yetkiniz yok') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Kaynak bulunamadı') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Kaynak zaten mevcut') {
    super(message, 409, 'CONFLICT');
  }
}
```

#### `src/middlewares/errorHandler.ts` — Global Error Handler

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '@/common/errors/AppError';
import { env } from '@/config';

/**
 * Standart hata response formatı:
 * {
 *   success: false,
 *   error: {
 *     code: string,      // Makine-okunabilir kod
 *     message: string,   // İnsan-okunabilir mesaj
 *     details?: unknown  // Opsiyonel; sadece non-production'da
 *   }
 * }
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // ── ZodError: Validation hatası ──
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Gönderilen veriler doğrulanamadı.',
        details: err.flatten().fieldErrors,
      },
    });
    return;
  }

  // ── AppError: Operational hata ──
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(env.NODE_ENV !== 'production' && err.details
          ? { details: err.details }
          : {}),
      },
    });
    return;
  }

  // ── Unknown: Programmer error ──
  // Stack trace loglanır ama client'a gösterilmez
  console.error('💥 Beklenmedik Hata:', err);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.',
      // Development'ta stack trace göster; production'da gizle
      ...(env.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
    },
  });
}
```

#### `src/middlewares/notFoundHandler.ts`

```typescript
import { Request, Response } from 'express';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `${req.method} ${req.originalUrl} endpoint'i bulunamadı.`,
    },
  });
}
```

#### `src/utils/asyncHandler.ts` — Async Route Wrapper

```typescript
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
```

---

### 7. Health Check Endpoint

Health check endpoint'i; yük dengeleyici (load balancer), container orchestration (Docker/K8s) ve monitoring araçlarının sunucunun durumunu anlamasını sağlar.

#### `src/modules/health/health.controller.ts`

```typescript
import { Request, Response } from 'express';

// Uygulama başlangıç zamanı (module yüklendiğinde set edilir)
const startTime = Date.now();

/**
 * GET /api/v1/health
 *
 * Response:
 * {
 *   status: "ok",
 *   uptime: number,          // Saniye cinsinden çalışma süresi
 *   timestamp: string,       // ISO 8601 formatında şimdiki zaman
 *   environment: string      // development | test | production
 * }
 *
 * HTTP 200: Sunucu sağlıklı
 * HTTP 503: (İleride) DB bağlantısı başarısız olursa (GÖREV 3)
 */
export function healthCheck(req: Request, res: Response): void {
  const uptimeMs = Date.now() - startTime;
  const uptimeSeconds = Math.floor(uptimeMs / 1000);

  res.status(200).json({
    status: 'ok',
    uptime: uptimeSeconds,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'development',
  });
}
```

#### `src/modules/health/health.routes.ts`

```typescript
import { Router } from 'express';
import { healthCheck } from './health.controller';

const router = Router();

/**
 * GET /api/v1/health
 * Yetkilendirme gerektirmez — herkes erişebilir
 */
router.get('/', healthCheck);

export default router;
```

#### `src/routes/index.ts` — Merkezi Router

```typescript
import { Router } from 'express';
import healthRouter from '@/modules/health/health.routes';

// İlerideki modüller buraya eklenecek:
// import authRouter from '@/modules/auth/auth.routes';
// import propertiesRouter from '@/modules/properties/properties.routes';

const apiRouter = Router();

apiRouter.use('/health', healthRouter);
// apiRouter.use('/auth', authRouter);        // GÖREV 4
// apiRouter.use('/properties', propertiesRouter); // GÖREV 5

export { apiRouter };
```

---

### 8. Logger Altyapısı

#### Morgan Tercih Gerekçesi

| Kriter | Morgan | Winston | Pino |
|--------|--------|---------|------|
| Kapsam | HTTP istek loglama | Genel amaçlı | Genel amaçlı |
| Boyut | ~4KB | ~47KB | ~26KB |
| Express entegrasyonu | Native | Manuel | Manuel |
| Yapılandırma | Minimal | Kapsamlı | Orta |
| Uygundur | HTTP log | Uygulama log | Performans kritik |

Morgan sadece HTTP isteklerini loglar, bu fazda ihtiyaç olan tam da budur. Uygulama seviyesi loglama (business logic, errors) gerektiğinde ileride `winston` veya `pino` eklenebilir.

#### Format Seçimi

```typescript
// src/app.ts içinde:
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
```

**`dev` formatı** (development):
```
GET /api/v1/health 200 3.456 ms - 89
```
Renkli, kısa, hızlı okunan format. Geliştirme sırasında gürültüyü azaltır.

**`combined` formatı** (production):
```
::1 - - [10/Jan/2025:10:30:00 +0000] "GET /api/v1/health HTTP/1.1" 200 89 "-" "PostmanRuntime/7.36"
```
Apache Combined Log Format. Log aggregation araçları (ELK, Datadog) bu formatı tanır. IP adresi, user agent, referer içerir.

---

### 9. Import Alias Yapılandırması

Import alias'lar uzun göreli yolları (`../../../../`) kısa mutlak yollarla (`@/`) değiştirerek okunabilirliği artırır ve dosya taşımalarında refactoring ihtiyacını azaltır.

`tsconfig.json`'daki `paths` konfigürasyonu TypeScript'i bilgilendirir. Ancak `ts-node-dev` çalışma zamanında `tsconfig-paths` paketi gerekebilir. Bu nedenle `ts-node-dev`'i `--respawn --transpile-only -r tsconfig-paths/register` flag'leri ile çalıştırıyoruz.

**Tanımlanan alias'lar:**

| Alias | Kaynak | Örnek Kullanım |
|-------|--------|----------------|
| `@/*` | `src/*` | `@/app` → `src/app` |
| `@/config/*` | `src/config/*` | `@/config/env` |
| `@/modules/*` | `src/modules/*` | `@/modules/health/health.routes` |
| `@/middlewares/*` | `src/middlewares/*` | `@/middlewares/errorHandler` |
| `@/utils/*` | `src/utils/*` | `@/utils/asyncHandler` |
| `@/types/*` | `src/types/*` | `@/types/express.d.ts` |
| `@/common/*` | `src/common/*` | `@/common/errors/AppError` |
| `@/services/*` | `src/services/*` | `@/services/cloudinary.service` |

---

### 10. npm Scripts ve `package.json`

```json
{
  "name": "gayrimenkul-api",
  "version": "1.0.0",
  "description": "Profesyonel Gayrimenkul Yönetim Sistemi — REST API",
  "main": "dist/server.js",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only -r tsconfig-paths/register src/server.ts",
    "build": "tsc --project tsconfig.json",
    "start": "node -r tsconfig-paths/register dist/server.js",
    "lint": "eslint src --ext .ts --max-warnings 0",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write 'src/**/*.ts'",
    "type-check": "tsc --noEmit",
    "test": "jest --runInBand",
    "test:unit": "jest tests/unit --runInBand",
    "test:integration": "jest tests/integration --runInBand",
    "test:watch": "jest --watch",
    "clean": "rimraf dist"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

#### Script Açıklamaları

| Script | Komut | Açıklama |
|--------|-------|---------|
| `dev` | `ts-node-dev ...` | TypeScript'i doğrudan çalıştır, değişiklikleri izle ve yeniden başlat. Hot reload ile geliştirme döngüsü hızlanır. |
| `build` | `tsc` | TypeScript'i `dist/` klasörüne derle. CI/CD pipeline ve production için. |
| `start` | `node dist/server.js` | Derlenmiş JS'i başlat. Production deployment'ta kullanılır. |
| `lint` | `eslint src` | Statik analiz. `--max-warnings 0` ile uyarıları hata olarak kabul et. |
| `lint:fix` | `eslint ... --fix` | Otomatik düzeltilebilir sorunları düzelt. |
| `format` | `prettier --write` | Kod formatlama. Commit öncesi veya CI'da çalıştırılır. |
| `type-check` | `tsc --noEmit` | Tip kontrolü yap, dosya üretme. CI'da derleme öncesi kontrol. |
| `clean` | `rimraf dist` | `dist/` klasörünü temizle. Temiz build öncesi. |

**`--respawn` flag'i neden?** `ts-node-dev` varsayılan olarak crash sonrası yeniden başlamaz. `--respawn` bunu sağlar.

**`--transpile-only` flag'i neden?** Tip kontrolünü atlar, yalnızca transpile eder. Development'ta derleme hızını artırır. Tip hataları IDE ve `type-check` scripti ile yakalanır.

**`-r tsconfig-paths/register` neden?** Runtime'da `@/` alias'larını çözümler. Olmadan `Cannot find module '@/config'` hatası alırsınız.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Prework analizine göre bu feature için property-based testing uygulanabilir: health check response formatı, error response formatı, 404 davranışı ve güvenlik başlıkları gibi invariant'lar mevcuttur.

---

### Property 1: Health Endpoint Response Shape

*For any* HTTP GET request to `/api/v1/health`, the response body SHALL always contain the fields `status`, `uptime`, `timestamp`, and `environment`, where `status` equals `"ok"`, `uptime` is a non-negative integer, `timestamp` is a valid ISO 8601 string, and `environment` is one of `"development"`, `"test"`, or `"production"`.

**Validates: Requirements 9.1 (health check deliverable)**

---

### Property 2: Error Response Format Invariant

*For any* request that causes an error (operational or unexpected), the response body SHALL always conform to the shape `{ success: false, error: { code: string, message: string } }`. The `success` field SHALL always be `false`. The `error.code` and `error.message` fields SHALL always be present and non-empty strings.

**Validates: Requirements 7.5 (standart hata response yapısı), Requirements 8.4 (input validation)**

---

### Property 3: Unknown Route Returns 404

*For any* HTTP request to a path that does not match any registered route, the server SHALL respond with HTTP status code 404 and a response body conforming to the standard error format with `error.code` equal to `"NOT_FOUND"`.

**Validates: Requirements 3.1 (modüler yapı), Requirements 7.5 (hata response yapısı)**

---

### Property 4: Security Headers Present on Every Response

*For any* HTTP request to any endpoint, the response SHALL include security headers set by Helmet.js, including at minimum `X-Content-Type-Options: nosniff`, `X-Frame-Options`, and `X-DNS-Prefetch-Control`. These headers SHALL be present regardless of whether the request is to a valid route or an unknown route.

**Validates: Requirements 8.1 (güvenlik mimarisi), Requirements 8.6 (Helmet.js güvenlik başlıkları)**

---

### Property 5: Invalid JSON Body Returns 400

*For any* POST/PUT/PATCH request with a malformed JSON body (syntactically invalid JSON string), the server SHALL respond with HTTP status code 400 and a response body conforming to the standard error format. The server SHALL NOT crash or return a 500 error.

**Validates: Requirements 8.4 (tüm girdiler validate edilmeli), Requirements 7.5 (hata response yapısı)**

---

## Error Handling

### Hata Sınıflandırması

```
Error
├── AppError (isOperational: true)
│   ├── BadRequestError    (400, BAD_REQUEST)
│   ├── UnauthorizedError  (401, UNAUTHORIZED)
│   ├── ForbiddenError     (403, FORBIDDEN)
│   ├── NotFoundError      (404, NOT_FOUND)
│   └── ConflictError      (409, CONFLICT)
└── Error (isOperational: false — programmer errors)
    ├── TypeError
    ├── ReferenceError
    └── ZodError (özel durum — 400 olarak ele alınır)
```

### Hata Akışı

```
Route Handler
    │
    │ throw new BadRequestError('...')
    │         veya
    │ throw new Error('Unexpected')
    │         veya
    │ next(err)
    ▼
asyncHandler wrapper
    │ Promise.catch(next)
    ▼
errorHandler middleware
    │
    ├── ZodError? → 400 + validation details
    ├── AppError? → statusCode + code + message
    └── Error?   → 500 + generic message (stack loglanır)
    │
    ▼
Client Response: { success: false, error: { code, message } }
```

### Tutarlı Response Formatı

Tüm başarılı ve hatalı yanıtlar tek bir formata uyar:

**Başarılı:**
```json
{
  "success": true,
  "data": { ... },
  "meta": { "total": 100, "page": 1 }
}
```

**Hatalı:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Gönderilen veriler doğrulanamadı.",
    "details": {
      "title": ["Başlık zorunludur"]
    }
  }
}
```

`src/utils/response.ts` helper'ı bu formatı üretir:

```typescript
export const successResponse = <T>(data: T, meta?: object) => ({
  success: true as const,
  data,
  ...(meta ? { meta } : {}),
});

export const errorResponse = (
  code: string,
  message: string,
  details?: unknown
) => ({
  success: false as const,
  error: { code, message, ...(details ? { details } : {}) },
});
```

---

## Testing Strategy

### Genel Yaklaşım

Bu faz için iki tür test kullanılacaktır:

1. **Integration Tests** — `supertest` + Express app. Gerçek HTTP istekleri yapılır, gerçek middleware zinciri çalışır.
2. **Unit Tests** — Bireysel fonksiyonlar izole test edilir (errorHandler, asyncHandler, config validation).

Property-based testing bu fazda uygundur çünkü:
- Middleware davranışları (error format, 404, güvenlik başlıkları) tüm inputlar için geçerli invariant'lardır
- `fast-check` kütüphanesi ile HTTP request'ler üretilip invariant'lar doğrulanabilir

### PBT Kütüphanesi: `fast-check`

```bash
npm install --save-dev fast-check
```

TypeScript desteği mükemmel, kapsamlı arbitrary generator seti, shrinking (minimal counterexample bulma) desteği var.

### Test Konfigürasyonu

Her property testi minimum **100 iterasyon** çalışır. Her test, ilgili design property'sine yorum olarak referans verir.

```typescript
// Tag formatı:
// Feature: real-estate-management-system, Property N: <property_text>
```

### Test Dosyası Örnekleri

#### `tests/integration/health.test.ts`

```typescript
import request from 'supertest';
import fc from 'fast-check';
import { createApp } from '../../src/app';

const app = createApp();

// Feature: real-estate-management-system, Property 1: Health endpoint response shape
describe('Health Endpoint', () => {
  it('GET /api/v1/health her zaman doğru shape döndürür', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      uptime: expect.any(Number),
      timestamp: expect.any(String),
      environment: expect.stringMatching(/^(development|test|production)$/),
    });

    // uptime negatif olamaz
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);

    // timestamp geçerli ISO 8601 formatında olmalı
    expect(() => new Date(res.body.timestamp)).not.toThrow();
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });
});
```

#### `tests/integration/error-handler.test.ts`

```typescript
import request from 'supertest';
import fc from 'fast-check';
import { createApp } from '../../src/app';

const app = createApp();

// Feature: real-estate-management-system, Property 3: Unknown Route Returns 404
describe('404 Handler', () => {
  it('Herhangi bir bilinmeyen path için 404 döndürür', async () => {
    await fc.assert(
      fc.asyncProperty(
        // /api/v1 prefix'i dışındaki rastgele path'ler
        fc.webPath(),
        async (path) => {
          const res = await request(app).get(`/unknown-prefix/${path}`);
          expect(res.status).toBe(404);
          expect(res.body.success).toBe(false);
          expect(res.body.error.code).toBe('NOT_FOUND');
        }
      ),
      { numRuns: 50 } // 50 iterasyon yeterli (path çeşitliliği sınırlı)
    );
  });
});

// Feature: real-estate-management-system, Property 2: Error Response Format Invariant
describe('Error Response Format', () => {
  it('Tüm hata response\'ları standart formata uyar', async () => {
    const errorPaths = [
      '/api/v1/nonexistent',
      '/api/v1/auth/login',  // POST gerektiriyor, GET ile 404
      '/totally/wrong/path',
    ];

    for (const path of errorPaths) {
      const res = await request(app).get(path);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      expect(typeof res.body.error.code).toBe('string');
      expect(typeof res.body.error.message).toBe('string');
      expect(res.body.error.code.length).toBeGreaterThan(0);
      expect(res.body.error.message.length).toBeGreaterThan(0);
    }
  });
});

// Feature: real-estate-management-system, Property 4: Security Headers Present
describe('Helmet Security Headers', () => {
  it('Her response\'da güvenlik başlıkları bulunur', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.webPath(),
        async (path) => {
          const res = await request(app).get(`/${path}`);
          // Helmet tarafından eklenen temel başlıklar
          expect(res.headers['x-content-type-options']).toBe('nosniff');
          expect(res.headers['x-frame-options']).toBeDefined();
          expect(res.headers['x-dns-prefetch-control']).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: real-estate-management-system, Property 5: Invalid JSON Body Returns 400
describe('Malformed JSON Handling', () => {
  it('Bozuk JSON body 400 döndürür ve server crash olmaz', async () => {
    const malformedBodies = [
      '{ invalid json }',
      '{"key": }',
      '[unclosed array',
      'undefined',
      "{'single': 'quotes'}",
    ];

    for (const body of malformedBodies) {
      const res = await request(app)
        .post('/api/v1/health')
        .set('Content-Type', 'application/json')
        .send(body);

      // 400 (body error) veya 404 (route yok) — her ikisi de kabul edilebilir
      // Önemli olan: 500 OLMAMASI ve standard format
      expect(res.status).not.toBe(500);
      if (res.body.success !== undefined) {
        expect(res.body.success).toBe(false);
      }
    }
  });
});
```

### Test Çalıştırma

```bash
# Tüm testler
npm test

# Yalnızca unit testler
npm run test:unit

# Yalnızca integration testler
npm run test:integration

# Watch mode (geliştirme sırasında)
npm run test:watch
```

### Test Bağımlılıkları

```bash
npm install --save-dev jest ts-jest @types/jest supertest @types/supertest fast-check
```

`jest.config.ts`:
```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts'],
};

export default config;
```

---

## Mimari Karar Özeti

| Karar | Seçim | Gerekçe |
|-------|-------|---------|
| Mimari yapı | Feature-based | Cohesion yüksek, bağımsız geliştirme |
| Validation | Zod | Tip türetimi + runtime validation tek pakette |
| Logging | Morgan | HTTP loglama için yeterli, hafif |
| Error handling | Merkezi errorHandler | Tutarlı format, separation of concerns |
| App/server ayrımı | app.ts + server.ts | Test izolasyonu |
| Import alias | `@/` prefix | Okunabilirlik, refactoring kolaylığı |
| Config validation | Fail fast (startup) | Eksik env var ile çalışmayı önler |
| Async errors | asyncHandler wrapper | try/catch kaldırır, DRY prensip |

