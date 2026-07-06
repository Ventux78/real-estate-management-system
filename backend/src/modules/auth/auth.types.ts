/**
 * Auth Types
 *
 * Mimarideki Görev:
 * Auth modülünün tüm TypeScript tip ve interface tanımlarını merkezi
 * olarak tutar. Controller, service ve middleware bu dosyadan import
 * alır. Tip değişiklikleri tek noktadan yönetilir; derleme zamanı
 * güvenliği sağlanır.
 */

// ─── Request / Response DTOs ────────────────────────────────────────────────

/** POST /auth/login — request body */
export interface LoginRequestDto {
  username: string;
  password: string;
}

/** Kullanıcının client'a döndürülecek güvenli alanları (passwordHash hariç) */
export interface UserDto {
  id: string;
  username: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
}

/** POST /auth/login — başarılı response */
export interface LoginResponseDto {
  accessToken: string;
  user: UserDto;
}

/** GET /auth/me — başarılı response */
export interface MeResponseDto {
  user: UserDto;
}

// ─── JWT ────────────────────────────────────────────────────────────────────

/** Access Token payload (JWT'nin içine gömülen veriler) */
export interface JwtPayload {
  sub: string;   // userId (JWT standardı — subject)
  username: string;
  iat?: number;  // issued at (JWT kütüphanesi otomatik ekler)
  exp?: number;  // expiration (JWT kütüphanesi otomatik ekler)
}

// ─── Express Request Extension ──────────────────────────────────────────────

/**
 * authenticate middleware'i JWT doğruladıktan sonra
 * req.user'ı bu tiple doldurur.
 */
export interface AuthenticatedUser {
  id: string;
  username: string;
}

// Express'in Request tipini genişletmek için global augmentation
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
