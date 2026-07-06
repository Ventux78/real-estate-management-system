import { AppError } from './AppError';

export class BadRequestError extends AppError {
  constructor(message = 'Geçersiz istek', details?: unknown) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Kimlik doğrulama gerekli') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Bu işlem için yetkiniz yok') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Kaynak bulunamadı') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Kaynak zaten mevcut') {
    super(message, 409, 'CONFLICT');
  }
}
