/**
 * Integration Property-Based Tests: Error Response Format Invariant
 *
 * **Validates: Requirements 7.5, 8.4**
 *
 * Property 2: Herhangi bir hata response'u her zaman
 *   { success: false, error: { code: string, message: string } }
 *   formatına uyar.
 *
 * Property 5: Malformed JSON body ile POST isteği sunucuyu çökertemez;
 *   server 4xx (400 veya 404) döner, 5xx döndürmez.
 */

import request from 'supertest';
import * as fc from 'fast-check';
import { createApp } from '@/app';

const app = createApp();

/**
 * Bir response body'sinin hata formatına uyup uymadığını kontrol eder.
 *   { success: false, error: { code: string, message: string } }
 */
function isValidErrorFormat(body: unknown): boolean {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;

  if (b['success'] !== false) return false;

  const error = b['error'];
  if (typeof error !== 'object' || error === null) return false;

  const e = error as Record<string, unknown>;
  if (typeof e['code'] !== 'string' || e['code'].length === 0) return false;
  if (typeof e['message'] !== 'string' || e['message'].length === 0) return false;

  return true;
}

describe('Error Response Format — Integration Tests', () => {
  beforeAll(() => {
    process.env['NODE_ENV'] = 'test';
  });

  /**
   * Property 2: Error Response Format Invariant
   *
   * Bilinmeyen route'lara (farklı HTTP methodlarıyla) yapılan isteklerde
   * dönen tüm hata response'ları standart formata uyar:
   *   1. success === false
   *   2. error.code non-empty string
   *   3. error.message non-empty string
   *
   * **Validates: Requirements 7.5, 8.4**
   */
  describe('Property 2: Error Response Format Invariant', () => {
    it('GET unknown route returns properly formatted error response', async () => {
      const response = await request(app).get('/api/v1/unknown-route-xyz');

      expect(response.status).toBe(404);
      expect(isValidErrorFormat(response.body)).toBe(true);
      expect(response.body.success).toBe(false);
      expect(typeof response.body.error.code).toBe('string');
      expect(response.body.error.code.length).toBeGreaterThan(0);
      expect(typeof response.body.error.message).toBe('string');
      expect(response.body.error.message.length).toBeGreaterThan(0);
    });

    it('POST unknown route returns properly formatted error response', async () => {
      const response = await request(app)
        .post('/api/v1/nonexistent-endpoint')
        .send({ data: 'test' });

      expect(response.status).toBe(404);
      expect(isValidErrorFormat(response.body)).toBe(true);
    });

    it('PUT unknown route returns properly formatted error response', async () => {
      const response = await request(app)
        .put('/api/v1/does-not-exist')
        .send({});

      expect(response.status).toBe(404);
      expect(isValidErrorFormat(response.body)).toBe(true);
    });

    it('DELETE unknown route returns properly formatted error response', async () => {
      const response = await request(app).delete('/api/v1/no-such-resource/123');

      expect(response.status).toBe(404);
      expect(isValidErrorFormat(response.body)).toBe(true);
    });

    it('PATCH unknown route returns properly formatted error response', async () => {
      const response = await request(app)
        .patch('/api/v1/missing-resource/456')
        .send({});

      expect(response.status).toBe(404);
      expect(isValidErrorFormat(response.body)).toBe(true);
    });

    /**
     * Property-based assertion: farklı path kombinasyonlarında
     * error format invariantı her zaman korunur.
     *
     * **Validates: Requirements 7.5, 8.4**
     */
    it('Property 2 (PBT): all error responses conform to standard format', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Belirli segment kombinasyonları üret; bilinen route'larla çakışmasın
          fc.array(
            fc.stringMatching(/^[a-z][a-z0-9-]{2,10}$/),
            { minLength: 1, maxLength: 3 },
          ),
          async (segments) => {
            const path = '/api/v1/' + segments.join('/');
            const response = await request(app).get(path);

            // 404 veya başka bir hata kodu olabilir; ama her zaman hata formatına uymalı
            expect(response.status).toBeGreaterThanOrEqual(400);
            expect(isValidErrorFormat(response.body)).toBe(true);

            expect(response.body.success).toBe(false);
            expect(typeof response.body.error.code).toBe('string');
            expect(response.body.error.code.length).toBeGreaterThan(0);
            expect(typeof response.body.error.message).toBe('string');
            expect(response.body.error.message.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  /**
   * Property 5: Invalid JSON Body Returns 400
   *
   * Malformed JSON body ile POST isteği:
   *   1. Server çökmez (yanıt verir)
   *   2. 4xx döner (5xx değil)
   *   3. Response formatı standarda uyar
   *
   * **Validates: Requirements 7.5, 8.4**
   */
  describe('Property 5: Invalid JSON Body Returns 400', () => {
    it('malformed JSON body returns 4xx, not 5xx', async () => {
      const response = await request(app)
        .post('/api/v1/health')
        .set('Content-Type', 'application/json')
        .send('{invalid json}');

      // 5xx döndürmemelidir
      expect(response.status).toBeLessThan(500);
      // 4xx döndürmelidir (400 veya 404)
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('malformed JSON body does not crash server (subsequent requests succeed)', async () => {
      // Önce kötü istek gönder
      await request(app)
        .post('/api/v1/unknown-route')
        .set('Content-Type', 'application/json')
        .send('{bad:json,no-quotes}');

      // Ardından sağlıklı bir istek yapıp sunucunun hâlâ ayakta olduğunu doğrula
      const healthResponse = await request(app).get('/api/v1/health');
      expect(healthResponse.status).toBe(200);
      expect(healthResponse.body.status).toBe('ok');
    });

    it('various malformed JSON bodies all return 4xx', async () => {
      const malformedBodies = [
        '{invalid json}',
        '{"key": value}',    // tırnak eksik
        '{key: "value"}',    // key tırnaksız
        '[1, 2, 3',          // kapanmamış bracket
        '{"a": 1,}',         // trailing comma
        'undefined',
        'NaN',
        '<xml>not json</xml>',
      ];

      for (const body of malformedBodies) {
        const response = await request(app)
          .post('/api/v1/unknown-endpoint')
          .set('Content-Type', 'application/json')
          .send(body);

        expect(response.status).toBeLessThan(500);
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    it('Property 5 (PBT): random malformed JSON never causes 5xx', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Geçerli JSON olmayan stringler üret
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => {
            try {
              JSON.parse(s);
              return false; // geçerli JSON'u filtrele
            } catch {
              return true; // sadece geçersiz JSON'ları kullan
            }
          }),
          async (malformedBody) => {
            const response = await request(app)
              .post('/api/v1/health')
              .set('Content-Type', 'application/json')
              .send(malformedBody);

            // Server hiçbir zaman 5xx döndürmemeli
            expect(response.status).toBeLessThan(500);
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
