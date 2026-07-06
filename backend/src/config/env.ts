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

  // Database — Sprint 2'den itibaren zorunlu
  DATABASE_URL: z.string(),

  // JWT — Sprint 3.1'den itibaren zorunlu
  JWT_SECRET: z.string().min(32, 'JWT_SECRET en az 32 karakter olmalı'),
  JWT_EXPIRES_IN: z.string().default('15m'),

  // JWT Refresh — Sprint 3.2'de zorunlu hale gelecek
  JWT_REFRESH_SECRET: z.string().optional(),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // bcrypt — Sprint 3.1'den itibaren zorunlu
  BCRYPT_SALT_ROUNDS: z.string().default('12').transform(Number),

  // Cloudinary — Sprint 6'da zorunlu
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'Cloudinary cloud name gerekli'),
  CLOUDINARY_API_KEY: z.string().min(1, 'Cloudinary API key gerekli'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'Cloudinary API secret gerekli'),

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
