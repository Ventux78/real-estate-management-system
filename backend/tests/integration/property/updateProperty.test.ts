/**
 * Integration Tests: PUT /api/v1/properties/:id
 *
 * Test Kapsamı:
 * (a) Kısmi güncelleme → yalnızca gönderilen alanlar değişti
 * (b) title güncelleme → yeni slug generateSlug ile tutarlı
 * (c) Yetkisiz erişim → HTTP 401
 * (d) Var olmayan ilan → HTTP 404
 * Property 9: Partial Update Isolation — gönderilmeyen alanlar değişmemeli
 * Property 10: Title-to-Slug Derivation on Update — slug generateSlug çıktısıyla tutarlı olmalı
 *
 * Validates: Requirements 10.4, 4.1–4.6
 */

import request from 'supertest';
import { createApp } from '@/app';
import { prisma } from '@/lib/prisma';
import { generateAccessToken } from '@/utils/jwt.util';
import { generateSlug } from '@/modules/property/utils/slugUtils';

const app = createApp();
const BASE_URL = '/api/v1/properties';

async function createTestProperty(userId: string, overrides: Record<string, unknown> = {}) {
  return prisma.property.create({
    data: {
      title: 'Update Test İlan',
      slug: 'update-test-' + Date.now() + '-' + Math.random().toString(36).slice(2),
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

describe('PUT /api/v1/properties/:id', () => {
  let testUserId: string;
  let authToken: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        username: 'updatetest_' + Date.now(),
        email: 'update_' + Date.now() + '@test.com',
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
  // (a) Kısmi güncelleme — Property 9: Partial Update Isolation
  // Feature: property-management-api, Property 9: Partial Update Isolation
  // ─────────────────────────────────────────────────────────────────────────

  it('Property 9: partial update only changes sent fields, leaves others unchanged', async () => {
    // Validates: Requirements 10.4, 4.1
    const property = await createTestProperty(testUserId, { city: 'İstanbul', price: 500000 });

    const res = await request(app)
      .put(`${BASE_URL}/${property.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ district: 'Beşiktaş' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Updated field
    expect(res.body.data.district).toBe('Beşiktaş');

    // Unchanged fields
    expect(res.body.data.city).toBe('İstanbul');
    expect(res.body.data.price).toBe(500000);
    expect(res.body.data.title).toBe(property.title);
    expect(res.body.data.listingType).toBe(property.listingType);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // (b) title güncelleme — Property 10: Title-to-Slug Derivation on Update
  // Feature: property-management-api, Property 10: Title-to-Slug Derivation on Update
  // ─────────────────────────────────────────────────────────────────────────

  it('Property 10: updating title produces slug consistent with generateSlug', async () => {
    // Validates: Requirements 10.4, 4.5
    const property = await createTestProperty(testUserId);
    const newTitle = 'İstanbul Üsküdar Kiralık Daire';

    const res = await request(app)
      .put(`${BASE_URL}/${property.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: newTitle });

    expect(res.status).toBe(200);

    const baseSlug = generateSlug(newTitle);
    // Slug should start with baseSlug (may have numeric suffix like -2, -3 for uniqueness)
    expect(res.body.data.slug).toMatch(new RegExp(`^${baseSlug}(-\\d+)?$`));
  });

  // ─────────────────────────────────────────────────────────────────────────
  // (c) Yetkisiz erişim → 401
  // ─────────────────────────────────────────────────────────────────────────

  it('should return 401 when Authorization header is missing', async () => {
    const property = await createTestProperty(testUserId);
    const res = await request(app)
      .put(`${BASE_URL}/${property.id}`)
      .send({ district: 'Beşiktaş' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MISSING_TOKEN');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // (d) Var olmayan ilan → 404
  // ─────────────────────────────────────────────────────────────────────────

  it('should return 404 for non-existent listing', async () => {
    const res = await request(app)
      .put(`${BASE_URL}/00000000-0000-4000-a000-000000000000`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ district: 'Beşiktaş' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PROPERTY_NOT_FOUND');
  });
});
