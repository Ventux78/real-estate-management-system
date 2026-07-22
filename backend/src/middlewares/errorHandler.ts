import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '@/common/errors/AppError';
import { env } from '@/config';

/**
 * Global Express error handler middleware.
 *
 * Standart hata response formatı:
 * {
 *   success: false,
 *   error: {
 *     code: string,      // Makine-okunabilir kod
 *     message: string,   // İnsan-okunabilir mesaj
 *     details?: unknown  // Opsiyonel; sadece non-production'da
 *   }
 * }
 *
 * Express'te 4 parametreli middleware error handler olarak tanınır.
 * app.ts'de EN SONDA tanımlanmalıdır.
 */
/**
 * body-parser tarafından fırlatılan JSON parse hatasını kontrol eder.
 * Bu hata SyntaxError'dan türer ve `statusCode: 400`, `type: 'entity.parse.failed'` içerir.
 */
function isBodyParserSyntaxError(
  err: Error
): err is SyntaxError & { statusCode: number; type: string } {
  return (
    err instanceof SyntaxError &&
    'statusCode' in err &&
    (err as unknown as Record<string, unknown>)['type'] === 'entity.parse.failed'
  );
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // ── Body-parser SyntaxError: Malformed JSON ──
  // express.json() middleware'i geçersiz JSON alırsa bu hatayı fırlatır.
  // 400 Bad Request ile yanıt ver.
  if (isBodyParserSyntaxError(err)) {
    console.error('[INVALID_JSON] request]', {
      method: req.method,
      url: req.originalUrl,
      contentType: req.headers['content-type'],
      bodyKeys: Object.keys(req.body || {}),
    });

    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'İstek gövdesi geçerli bir JSON formatında değil.',
      },
    });
    return;
  }

  // ── ZodError: Validation hatası ──
  // Zod schema doğrulaması başarısız olduğunda fırlar.
  // 400 Bad Request + fieldErrors detayı ile yanıt ver.
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
  // Beklenen, kontrollü hatalar (404, 401, 403, 409 vb.).
  // statusCode ve code AppError'dan alınır.
  // Development'ta details gösterilir, production'da gizlenir.
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
  // Beklenmedik hatalar (TypeError, ReferenceError vb.).
  // Stack trace loglanır ama client'a gösterilmez (production).
  // Development'ta stack trace response'a eklenir.
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
