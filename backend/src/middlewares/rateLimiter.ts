import rateLimit from 'express-rate-limit';

/**
 * Global rate limiter — tüm /api route'larına uygulanır.
 *
 * Konfigürasyon:
 *   windowMs : 15 dakika (900.000 ms)
 *   max      : IP başına 15 dakikada 200 istek
 *
 * Limit aşıldığında standart error response formatında yanıt döner:
 *   { success: false, error: { code: "RATE_LIMIT_EXCEEDED", message: "..." } }
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 200, // IP başına pencere başına maksimum istek sayısı
  standardHeaders: true, // RateLimit-* başlıkları ekle (RFC 6585)
  legacyHeaders: false, // X-RateLimit-* eski başlıkları kaldır
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.',
    },
  },
});
