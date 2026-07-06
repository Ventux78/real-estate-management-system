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
