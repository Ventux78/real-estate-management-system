/**
 * Auth Service
 *
 * Mimarideki Görev:
 * Authentication'ın tüm business logic'ini içerir. Controller
 * yalnızca bu service'i çağırır; HTTP detayları (req/res) buraya
 * sızmaz. Prisma sorgulama, bcrypt karşılaştırma ve JWT üretme
 * bu katmanda gerçekleşir.
 *
 * Bu ayrım:
 * - Unit testlerini kolaylaştırır (service mock'lanabilir)
 * - Controller'ı ince (thin) tutar
 * - Business rule değişikliği tek noktada yapılır
 */

import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/common/errors/AppError';
import { generateAccessToken } from '@/utils/jwt.util';
import type { LoginInput } from '@/modules/auth/auth.validation';
import type { LoginResponseDto, UserDto } from '@/modules/auth/auth.types';

// ─── Private helpers ────────────────────────────────────────────────────────

/**
 * Kullanıcının güvenli DTO'sunu oluşturur.
 * passwordHash asla dışarıya çıkmaz.
 */
function toUserDto(user: {
  id: string;
  username: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
}): UserDto {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

// ─── Service ────────────────────────────────────────────────────────────────

export const authService = {
  /**
   * Kullanıcı adı ve şifreyle login işlemi gerçekleştirir.
   *
   * Güvenlik notu: Kullanıcı bulunamadı ve şifre yanlış durumları
   * aynı hata mesajını döndürür (timing attack ve user enumeration'a
   * karşı koruma).
   *
   * @param dto - Doğrulanmış login verisi (username, password)
   * @returns accessToken ve güvenli user DTO'su
   * @throws AppError 401 — kimlik bilgileri geçersiz
   * @throws AppError 403 — hesap devre dışı
   */
  async login(dto: LoginInput): Promise<LoginResponseDto> {
    // 1. Kullanıcıyı username ile bul
    const user = await prisma.user.findUnique({
      where: { username: dto.username },
    });

    // 2. Kullanıcı yoksa: genel hata (user enumeration engeli)
    if (!user) {
      throw new AppError(
        'Kullanıcı adı veya şifre hatalı.',
        401,
        'INVALID_CREDENTIALS'
      );
    }

    // 3. Hesap aktif mi kontrol et
    if (!user.isActive) {
      throw new AppError(
        'Bu hesap devre dışı bırakılmış.',
        403,
        'ACCOUNT_DISABLED'
      );
    }

    // 4. Şifreyi bcrypt ile karşılaştır
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      // Şifre yanlışsa da aynı mesaj — user enumeration'a karşı
      throw new AppError(
        'Kullanıcı adı veya şifre hatalı.',
        401,
        'INVALID_CREDENTIALS'
      );
    }

    // 5. Access Token üret
    const accessToken = generateAccessToken({
      sub: user.id,
      username: user.username,
    });

    return {
      accessToken,
      user: toUserDto(user),
    };
  },

  /**
   * Kullanıcı ID'siyle mevcut kullanıcıyı getirir.
   * JWT middleware req.user'ı doldurduktan sonra /me endpoint'i bunu çağırır.
   *
   * @param userId - JWT payload'ından gelen kullanıcı ID'si
   * @returns Güvenli user DTO'su
   * @throws AppError 404 — kullanıcı bulunamadı (silinmiş olabilir)
   */
  async getCurrentUser(userId: string): Promise<UserDto> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(
        'Kullanıcı bulunamadı.',
        404,
        'USER_NOT_FOUND'
      );
    }

    if (!user.isActive) {
      throw new AppError(
        'Bu hesap devre dışı bırakılmış.',
        403,
        'ACCOUNT_DISABLED'
      );
    }

    return toUserDto(user);
  },
};
