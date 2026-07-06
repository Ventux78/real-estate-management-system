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
 *   environment: string,     // development | test | production
 *   version: string          // Uygulama versiyonu
 * }
 *
 * HTTP 200: Sunucu sağlıklı
 * HTTP 503: (İleride) DB bağlantısı başarısız olursa (GÖREV 3)
 */
export function healthCheck(_req: Request, res: Response): void {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  res.status(200).json({
    status: 'ok',
    uptime: uptimeSeconds,
    timestamp: new Date().toISOString(),
    environment: process.env['NODE_ENV'] ?? 'development',
    version: process.env['npm_package_version'] ?? '1.0.0',
  });
}
