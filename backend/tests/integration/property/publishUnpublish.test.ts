/**
 * Integration Tests: PATCH /api/v1/properties/:id/publish & /unpublish
 *
 * Test Kapsamı:
 * (a) publish → isPublished=true
 * (b) unpublish → isPublished=false
 * (c) Idempotency: zaten publish olan ilanı tekrar publish → HTTP 200, isPublished=true
 * (d) Yetkisiz erişim → HTTP 401
 * Property 11: Publish/Unpublish Idempotency — N kez publish → isPublished=true; N kez unpublish → isPublished=false
 *
 * Validates: Requirements 10.6, 6.1–6.4, 7.1–7.5
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
      title: 'Publish Test İlan',
      slug: 'publish-test-' + Date.now() + '-' + Math.random().toString(36).slice(2),
      listingType: 'FOR_SALE',
      propertyType: 'APARTMENT',
      price: 500000,
      city: 'İstanbul',
      district: 'Kadıköy',
      address: 'Test Adres',
      isPublished: false,
      createdById: userId,
      ...overrides,
    },
  });
}

describe('PATCH /api/v1/properties/:id/publish and /unpublish', () => {
  let testUserId: string;
  let authToken: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        username: 'publishtest_' + Date.now(),
        email: 'publish_' + Date.now() + '@test.com',
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
  // (a) publish → isPublished=true
  // ─────────────────────────────────────────────────────────────────────────

  it('publish sets isPublished to true and returns 200', async () => {
    // Validates: Requirements 10.6, 6.1
    const property = await createTestProperty(testUserId, { isPublished: false });

    const res = await request(app)
      .patch(`${BASE_URL}/${property.id}/publish`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.isPublished).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // (b) unpublish → isPublished=false
  // ─────────────────────────────────────────────────────────────────────────

  it('unpublish sets isPublished to false and returns 200', async () => {
    // Validates: Requirements 10.6, 7.1
    const property = await createTestProperty(testUserId, { isPublished: true });

    const res = await request(app)
      .patch(`${BASE_URL}/${property.id}/unpublish`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.isPublished).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // (c) Idempotency — Property 11: Publish/Unpublish Idempotency
  // Feature: property-management-api, Property 11: Publish/Unpublish Idempotency
  // ─────────────────────────────────────────────────────────────────────────

  it('Property 11: publish is idempotent — multiple publishes always result in isPublished=true', async () => {
    // Validates: Requirements 10.6, 6.1 (idempotency)
    const property = await createTestProperty(testUserId, { isPublished: false });

    // Publish 3 times
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .patch(`${BASE_URL}/${property.id}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      expect(res.body.data.isPublished).toBe(true);
    }
  });

  it('Property 11: unpublish is idempotent — multiple unpublishes always result in isPublished=false', async () => {
    // Validates: Requirements 10.6, 7.1 (idempotency)
    const property = await createTestProperty(testUserId, { isPublished: true });

    // Unpublish 3 times
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .patch(`${BASE_URL}/${property.id}/unpublish`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      expect(res.body.data.isPublished).toBe(false);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // (d) Yetkisiz erişim → 401
  // ─────────────────────────────────────────────────────────────────────────

  it('should return 401 for publish when Authorization header is missing', async () => {
    // Validates: Requirements 10.6, 6.2
    const property = await createTestProperty(testUserId);

    const res = await request(app)
      .patch(`${BASE_URL}/${property.id}/publish`)
      .expect(401);

    expect(res.body.error.code).toBe('MISSING_TOKEN');
  });

  it('should return 401 for unpublish when Authorization header is missing', async () => {
    // Validates: Requirements 10.6, 7.2
    const property = await createTestProperty(testUserId, { isPublished: true });

    const res = await request(app)
      .patch(`${BASE_URL}/${property.id}/unpublish`)
      .expect(401);

    expect(res.body.error.code).toBe('MISSING_TOKEN');
  });
});
