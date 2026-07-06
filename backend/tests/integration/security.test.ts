/**
 * Integration Property-Based Tests: 404 ve Güvenlik Başlıkları
 *
 * **Validates: Requirements 7.5, 8.1, 8.6**
 *
 * Property 3: Unknown Route Returns 404
 *   Rastgele üretilen bilinmeyen path'ler her zaman 404 ve
 *   error.code === "NOT_FOUND" döner.
 *
 * Property 4: Security Headers Present on Every Response
 *   Hem bilinen hem de bilinmeyen path'lerde Helmet güvenlik
 *   başlıkları her zaman mevcut olur.
 */

import request from 'supertest';
import * as fc from 'fast-check';
import { createApp } from '@/app';

const app = createApp();

describe('404 ve Güvenlik Başlıkları — Integration Tests', () => {
  beforeAll(() => {
    process.env['NODE_ENV'] = 'test';
  });

  /**
   * Property 3: Unknown Route Returns 404
   *
   * Rastgele üretilen bilinmeyen path'ler için:
   *   1. HTTP 404 döner
   *   2. error.code === "NOT_FOUND"
   *   3. success === false
   *
   * **Validates: Requirements 7.5**
   */
  describe('Property 3: Unknown Route Returns 404', () => {
    it('Property 3 (PBT): random unknown paths always return 404 NOT_FOUND', async () => {
      await fc.assert(
        fc.asyncProperty(
          // /api/v1/unknown/<segment> formatında path üret — bilinen route'larla çakışmasın
          fc.webPath().map((p) => `/api/v1/unknown${p}`),
          async (path) => {
            const response = await request(app).get(path);

            // 1. HTTP 404
            expect(response.status).toBe(404);

            // 2. success === false
            expect(response.body.success).toBe(false);

            // 3. error.code === "NOT_FOUND"
            expect(response.body.error).toBeDefined();
            expect(response.body.error.code).toBe('NOT_FOUND');
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  /**
   * Property 4: Security Headers Present on Every Response
   *
   * Tüm response'larda (200 ve 404 dahil) Helmet güvenlik başlıkları mevcut:
   *   1. x-content-type-options: nosniff
   *   2. x-frame-options: SAMEORIGIN veya DENY
   *   3. x-dns-prefetch-control: off veya mevcut
   *
   * **Validates: Requirements 8.1, 8.6**
   */
  describe('Property 4: Security Headers Present on Every Response', () => {
    it('known route (GET /api/v1/health) returns security headers', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toMatch(/^(SAMEORIGIN|DENY)$/i);
      expect(response.headers['x-dns-prefetch-control']).toBeDefined();
    });

    it('unknown route (GET /api/v1/unknown-path) returns security headers', async () => {
      const response = await request(app).get('/api/v1/unknown-path');

      expect(response.status).toBe(404);
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toMatch(/^(SAMEORIGIN|DENY)$/i);
      expect(response.headers['x-dns-prefetch-control']).toBeDefined();
    });

    it('Property 4 (PBT): security headers present on all responses (numRuns: 100)', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Hem bilinen hem bilinmeyen path'leri test et:
          // - /api/v1/health (200)
          // - /api/v1/unknown/<rastgele path> (404)
          fc.oneof(
            fc.constant('/api/v1/health'),
            fc.webPath().map((p) => `/api/v1/unknown${p}`),
          ),
          async (path) => {
            const response = await request(app).get(path);

            // x-content-type-options: nosniff
            expect(response.headers['x-content-type-options']).toBe('nosniff');

            // x-frame-options: SAMEORIGIN veya DENY
            expect(response.headers['x-frame-options']).toMatch(/^(SAMEORIGIN|DENY)$/i);

            // x-dns-prefetch-control: mevcut
            expect(response.headers['x-dns-prefetch-control']).toBeDefined();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
