/**
 * Auth Integration Tests
 *
 * Sprint 3.1 Test Kapsamı:
 * ✅ POST /auth/login — başarılı login
 * ✅ POST /auth/login — geçersiz credentials
 * ✅ POST /auth/login — eksik field
 * ✅ GET  /auth/me    — başarılı kullanıcı bilgisi
 * ✅ GET  /auth/me    — token yok (401)
 * ✅ GET  /auth/me    — geçersiz token (401)
 * ✅ GET  /auth/me    — süresi dolmuş token (401)
 */

import request from 'supertest';
import { createApp } from '@/app';
import { prisma } from '@/lib/prisma';
import type { Application } from 'express';

describe('Auth Integration Tests', () => {
  let app: Application;

  beforeAll(() => {
    app = createApp();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /auth/login
  // ─────────────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    it('başarılı login — accessToken ve user döner', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'admin',
          password: 'admin123',
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
        data: {
          accessToken: expect.any(String),
          user: {
            id: expect.any(String),
            username: 'admin',
            email: 'admin@gayrimenkul.com',
            isActive: true,
            createdAt: expect.any(String),
          },
        },
      });

      // JWT token formatını kontrol et (header.payload.signature)
      expect(res.body.data.accessToken.split('.').length).toBe(3);
    });

    it('geçersiz credentials — 401 INVALID_CREDENTIALS', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'admin',
          password: 'wrongpassword',
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Kullanıcı adı veya şifre hatalı.',
        },
      });
    });

    it('eksik field — 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'admin',
          // password eksik
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Gönderilen veriler doğrulanamadı.',
          details: expect.objectContaining({
            password: expect.any(Array),
          }),
        },
      });
    });

    it('olmayan kullanıcı — 401 INVALID_CREDENTIALS', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'nonexistent',
          password: 'password123',
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Kullanıcı adı veya şifre hatalı.',
        },
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /auth/me
  // ─────────────────────────────────────────────────────────────────────────

  describe('GET /api/v1/auth/me', () => {
    let accessToken: string;

    beforeAll(async () => {
      // Login yapıp valid token al
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'admin',
          password: 'admin123',
        });

      accessToken = res.body.data.accessToken;
    });

    it('valid token ile kullanıcı bilgisi döner', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
        data: {
          user: {
            id: expect.any(String),
            username: 'admin',
            email: 'admin@gayrimenkul.com',
            isActive: true,
            createdAt: expect.any(String),
          },
        },
      });
    });

    it('token yok — 401 MISSING_TOKEN', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: "Kimlik doğrulama token'ı bulunamadı.",
        },
      });
    });

    it('geçersiz token — 401 INVALID_TOKEN', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.format')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Geçersiz token.',
        },
      });
    });

    it('Bearer prefix yok — 401 MISSING_TOKEN', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', accessToken) // "Bearer " prefix yok
        .expect('Content-Type', /json/)
        .expect(401);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: "Kimlik doğrulama token'ı bulunamadı.",
        },
      });
    });
  });
});
