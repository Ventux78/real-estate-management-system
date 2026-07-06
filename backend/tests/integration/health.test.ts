/**
 * Integration Property-Based Test: Health Endpoint Response Shape
 *
 * **Validates: Requirements 9.1**
 *
 * Property 1: GET /api/v1/health her zaman aşağıdaki shape'i döner:
 *   - HTTP 200
 *   - status === "ok"
 *   - uptime >= 0 (number)
 *   - timestamp geçerli bir ISO 8601 string'i (new Date() ile parse edilebilir)
 *   - environment "development" | "test" | "production" değerlerinden biri
 */

import express from 'express';
import request from 'supertest';
import * as fc from 'fast-check';
import healthRouter from '@/modules/health/health.routes';

function createTestApp() {
  const app = express();
  app.use('/api/v1/health', healthRouter);
  return app;
}

describe('Health Endpoint — Property-Based Tests', () => {
  beforeAll(() => {
    process.env['NODE_ENV'] = 'test';
  });

  /**
   * Property 1: Health Endpoint Response Shape
   *
   * Her türlü koşulda GET /api/v1/health:
   *  1. HTTP 200 döner
   *  2. status === "ok"
   *  3. uptime >= 0 (number)
   *  4. timestamp geçerli ISO 8601 string'i
   *  5. environment "development" | "test" | "production"
   *
   * **Validates: Requirements 9.1**
   */
  it('Property 1: health endpoint always returns valid response shape', async () => {
    const app = createTestApp();

    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const response = await request(app).get('/api/v1/health');

        // 1. HTTP 200
        expect(response.status).toBe(200);

        const body = response.body as {
          status: unknown;
          uptime: unknown;
          timestamp: unknown;
          environment: unknown;
        };

        // 2. status === "ok"
        expect(body.status).toBe('ok');

        // 3. uptime >= 0 (number)
        expect(typeof body.uptime).toBe('number');
        expect(body.uptime).toBeGreaterThanOrEqual(0);

        // 4. timestamp geçerli ISO 8601 string'i
        expect(typeof body.timestamp).toBe('string');
        const parsedDate = new Date(body.timestamp as string);
        expect(parsedDate.getTime()).not.toBeNaN();
        // ISO 8601 formatı: Date.toISOString() çıktısı tekrar parse edilebilmeli
        expect((body.timestamp as string).length).toBeGreaterThan(0);

        // 5. environment "development" | "test" | "production"
        const validEnvironments = ['development', 'test', 'production'];
        expect(validEnvironments).toContain(body.environment);
      }),
      { numRuns: 50 },
    );
  });
});
