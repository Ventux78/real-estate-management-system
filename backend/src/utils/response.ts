import { SuccessResponse, ErrorResponse } from '@/common/types/response.types';

/**
 * Başarılı API response'u oluşturur.
 *
 * Kullanım:
 *   res.status(200).json(successResponse(user));
 *   res.status(200).json(successResponse(users, { total: 100, page: 1 }));
 */
export function successResponse<T>(data: T, meta?: object): SuccessResponse<T> {
  const response: SuccessResponse<T> = {
    success: true,
    data,
  };

  if (meta !== undefined) {
    response.meta = meta;
  }

  return response;
}

/**
 * Hata API response'u oluşturur.
 *
 * Kullanım:
 *   res.status(400).json(errorResponse('BAD_REQUEST', 'Geçersiz istek'));
 *   res.status(404).json(errorResponse('NOT_FOUND', 'Kaynak bulunamadı', { id: 42 }));
 */
export function errorResponse(
  code: string,
  message: string,
  details?: unknown,
): ErrorResponse {
  const response: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (details !== undefined) {
    response.error.details = details;
  }

  return response;
}
