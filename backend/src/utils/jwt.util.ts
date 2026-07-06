/**
 * JWT Utility
 *
 * Mimarideki Görev:
 * Access Token üretme ve doğrulama işlemlerini kapsüller. Service
 * katmanı JWT implementasyon detaylarından bağımsız kalır. Token
 * stratejisi (algoritma, payload, expiry) değiştiğinde tek nokta
 * güncellenir.
 *
 * Sprint 3.1: Sadece Access Token.
 * Sprint 3.2: Refresh Token buraya eklenecek.
 */

import jwt from 'jsonwebtoken';
import { env } from '@/config';
import type { JwtPayload } from '@/modules/auth/auth.types';

// ─── Access Token ────────────────────────────────────────────────────────────

/**
 * Kullanıcı bilgilerinden Access Token üretir.
 *
 * @param payload - Token'a gömülecek veri (userId, username)
 * @returns İmzalanmış JWT string
 */
export function generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.JWT_SECRET as string, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

/**
 * Access Token'ı doğrular ve payload'ı döndürür.
 *
 * Hata durumları:
 * - JsonWebTokenError  → imza geçersiz / token malformed
 * - TokenExpiredError  → token süresi dolmuş
 * - NotBeforeError     → token henüz aktif değil
 *
 * Caller (auth.middleware.ts) bu hataları yakalamalı.
 *
 * @param token - Bearer token string (Bearer prefix'i olmadan)
 * @returns Decoded ve type-safe JWT payload
 */
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET as string) as JwtPayload;
}
