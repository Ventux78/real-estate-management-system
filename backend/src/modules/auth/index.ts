/**
 * Auth Module — Barrel Export
 *
 * Mimarideki Görev:
 * Auth modülünün dış dünyaya açık API yüzeyini tanımlar.
 * Dışarıdan import alacak dosyalar (@/modules/auth) bu dosyayı
 * kullanır. İç implementasyon detayları (service, validation şeması)
 * gerektiğinde buradan kontrol edilebilir.
 */

export { default as authRouter } from './auth.routes';
export { authenticate } from './auth.middleware';
export type { LoginRequestDto, UserDto, LoginResponseDto, MeResponseDto } from './auth.types';
