/**
 * Auth Controller
 *
 * Mimarideki Görev:
 * HTTP request/response yönetimini üstlenir. Request body'yi Zod
 * ile validate eder, ilgili service metodunu çağırır, başarılı
 * yanıtı standart SuccessResponse formatında döndürür.
 *
 * Controller'ın TEK sorumluluğu HTTP katmanı:
 * ✅ Request parse / validation
 * ✅ Service çağrısı
 * ✅ Response formatlama
 * ❌ Business logic içermez
 * ❌ Prisma doğrudan çağrılmaz
 * ❌ JWT detayları bilinmez
 */

import { Request, Response, NextFunction } from 'express';
import { authService } from '@/modules/auth/auth.service';
import { loginSchema } from '@/modules/auth/auth.validation';
import type { SuccessResponse } from '@/common/types/response.types';
import type { LoginResponseDto, MeResponseDto } from '@/modules/auth/auth.types';

export const authController = {
  /**
   * POST /api/v1/auth/login
   *
   * Body: { username, password }
   * Response: { success: true, data: { accessToken, user } }
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Zod ile validate et — hata olursa ZodError fırlar,
      // global errorHandler 400 VALIDATION_ERROR olarak yakalar
      const dto = loginSchema.parse(req.body);

      const result = await authService.login(dto);

      const response: SuccessResponse<LoginResponseDto> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/auth/me
   *
   * Korunan route — authenticate middleware önce çalışır.
   * req.user authenticate middleware tarafından doldurulur.
   * Response: { success: true, data: { user } }
   */
  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // authenticate middleware req.user'ı garantiledi
      // TypeScript için non-null assertion: bu noktada user kesinlikle var
      const userId = req.user!.id;

      const user = await authService.getCurrentUser(userId);

      const response: SuccessResponse<MeResponseDto> = {
        success: true,
        data: { user },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },
};
