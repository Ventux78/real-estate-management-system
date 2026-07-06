/**
 * Auth Validation Schemas
 *
 * Mimarideki Görev:
 * Gelen HTTP request body'lerini Zod ile doğrular. Business logic'e
 * ulaşmadan önce tip güvenliği ve kural kontrolü sağlanır. Şema
 * değiştiğinde tek nokta güncellenir; controller temiz kalır.
 *
 * Hata durumunda Zod otomatik ZodError fırlatır; global errorHandler
 * bunu 400 VALIDATION_ERROR olarak yakalar (errorHandler.ts'e bakın).
 */

import { z } from 'zod';

// ─── Login ──────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  username: z
    .string({ required_error: 'Kullanıcı adı zorunludur' })
    .trim()
    .min(3, 'Kullanıcı adı en az 3 karakter olmalı')
    .max(50, 'Kullanıcı adı en fazla 50 karakter olabilir'),

  password: z
    .string({ required_error: 'Şifre zorunludur' })
    .min(6, 'Şifre en az 6 karakter olmalı')
    .max(128, 'Şifre en fazla 128 karakter olabilir'),
});

export type LoginInput = z.infer<typeof loginSchema>;
