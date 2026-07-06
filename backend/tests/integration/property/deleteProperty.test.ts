/**
 * Integration Tests: DELETE /api/v1/properties/:id
 *
 * Test Kapsamı:
 * (a) Soft-delete sonrası GET /properties listesinde görünmez
 * (b) Soft-deleted ilanı tekrar silmeye çalışınca HTTP 404
 * (c) Yetkisiz erişim → HTTP 401
 * Property 4: Soft-Delete Exclusion Invariant — soft-delete sonrası list ve detail sorgularında ilan görünmemeli
 *
 * Validates: Requirements 10.5, 5.1–5.5
 */

import request from 'supertest';
import { createApp } from '@/app';
import { prisma } from '@/lib/prisma';
import { generateAccessToken } from '@/utils/jwt.util';

const app = createApp();
const BASE_URL = '/api/v1/properties';

async function createTestProperty(userId: string, overrides: Record<string, unknown> = {}) {
  return prisma.property.create({
    data: {
      title: 'Delete Test İlan',
      slug: 'delete-test-' + Date.now() + '-' + Math.random().toString(36).slice(2),
      listingType: 'FOR_SALE',
      propertyType: 'APARTMENT',
      price: 500000,
      city: 'İstanbul',
      district: 'Kadıköy',
      address: 'Test Adres',
      isPublished: true,
      createdById: userId,
      ...overrides,
    },
  });
}

describe('DELETE /api/v1/properties/:id', () => {
  let testUserId: string;
  let authToken: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        username: 'deletetest_' + Date.now(),
        email: 'delete_' + Date.now() + '@test.com',
        passwordHash: '$2a$12$2hu2LDLAHzQCEVq7sckwKebOzOlx5Y/uOgtVEt.UQ5Kg4HUnBPVKS',
      },
    });
    testUserId = user.id;
    authToken = generateAccessToken({ sub: user.id, username: user.username });
  });

  beforeEach(async () => {
    await prisma.property.deleteMany({ where: { createdById: testUserId } });
  });

  afterAll(async () => {
    await prisma.property.deleteMany({ where: { createdById: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Basic soft-delete → 200 with success message
  // ─────────────────────────────────────────────────────────────────────────

  it('should soft-delete listing and return 200 with success message', async () => {
    const property = await createTestProperty(testUserId);

    const res = await request(app)
      .delete(`${BASE_URL}/${property.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe('İlan başarıyla silindi.');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // (a) Soft-delete sonrası liste ve detayda görünmez — Property 4
  // Feature: property-management-api, Property 4: Soft-Delete Exclusion Invariant
  // ─────────────────────────────────────────────────────────────────────────

  it('Property 4: soft-deleted listing not visible in list or detail', async () => {
    // Validates: Requirements 10.5, 5.1, 5.4
    const property = await createTestProperty(testUserId, { isPublished: true });

    // Soft-delete via API
    await request(app)
      .delete(`${BASE_URL}/${property.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // List check: deleted listing must not appear
    const listRes = await request(app).get(BASE_URL).expect(200);
    const ids = (listRes.body.data.data as Array<{ id: string }>).map((p) => p.id);
    expect(ids).not.toContain(property.id);

    // Detail check: deleted listing must return 404
    const detailRes = await request(app).get(`${BASE_URL}/${property.id}`).expect(404);
    expect(detailRes.body.error.code).toBe('PROPERTY_NOT_FOUND');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // (b) Soft-deleted ilanı tekrar silmeye çalışınca → 404
  // ─────────────────────────────────────────────────────────────────────────

  it('should return 404 when trying to delete an already soft-deleted listing', async () => {
    // Validates: Requirements 10.5, 5.3
    const property = await createTestProperty(testUserId);

    // First delete
    await request(app)
      .delete(`${BASE_URL}/${property.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // Second delete attempt
    const res = await request(app)
      .delete(`${BASE_URL}/${property.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);

    expect(res.body.error.code).toBe('PROPERTY_NOT_FOUND');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // (c) Yetkisiz erişim → 401
  // ─────────────────────────────────────────────────────────────────────────

  it('should return 401 when Authorization header is missing', async () => {
    // Validates: Requirements 10.5, 5.2
    const property = await createTestProperty(testUserId);

    const res = await request(app)
      .delete(`${BASE_URL}/${property.id}`)
      .expect(401);

    expect(res.body.error.code).toBe('MISSING_TOKEN');
  });
});
