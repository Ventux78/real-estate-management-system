/**
 * Integration Tests: GET /api/v1/properties/:id
 *
 * Test Kapsamı:
 * (a) Mevcut ilan → HTTP 200, tam PropertyDto formatı
 * (b) Soft-delete edilmiş ilan → HTTP 404
 * (c) Var olmayan UUID → HTTP 404
 * (d) Geçersiz UUID formatı → HTTP 400
 * Property 4: Soft-Delete Exclusion Invariant — soft-delete edilmiş ilan GET /:id ile erişilememeli
 * Property 8: Get-After-Create Consistency — oluşturulan ilan ID ile sorgulandığında aynı değerleri döndürmeli
 *
 * Validates: Requirements 10.3, 3.1–3.4
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
      title: 'Get Test İlan',
      slug: 'get-test-' + Date.now() + '-' + Math.random().toString(36).slice(2),
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

describe('GET /api/v1/properties/:id', () => {
  let testUserId: string;
  let authToken: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        username: 'gettest_' + Date.now(),
        email: 'get_' + Date.now() + '@test.com',
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
  // (a) Mevcut ilan → 200 with PropertyDto
  // ─────────────────────────────────────────────────────────────────────────

  it('should return 200 with full PropertyDto for existing listing', async () => {
    const property = await createTestProperty(testUserId);
    const res = await request(app).get(`${BASE_URL}/${property.id}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(property.id);
    expect(res.body.data.title).toBe(property.title);
    expect(Array.isArray(res.body.data.images)).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // (b) Soft-deleted → 404
  // Feature: property-management-api, Property 4: Soft-Delete Exclusion Invariant
  // ─────────────────────────────────────────────────────────────────────────

  it('Property 4: soft-deleted listing returns 404', async () => {
    const property = await createTestProperty(testUserId);
    await prisma.property.update({ where: { id: property.id }, data: { deletedAt: new Date() } });
    const res = await request(app).get(`${BASE_URL}/${property.id}`).expect(404);
    expect(res.body.error.code).toBe('PROPERTY_NOT_FOUND');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // (c) Var olmayan UUID → 404
  // ─────────────────────────────────────────────────────────────────────────

  it('should return 404 for non-existent UUID', async () => {
    const res = await request(app)
      .get(`${BASE_URL}/00000000-0000-4000-a000-000000000000`)
      .expect(404);
    expect(res.body.error.code).toBe('PROPERTY_NOT_FOUND');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // (d) Geçersiz UUID formatı → 400
  // ─────────────────────────────────────────────────────────────────────────

  it('should return 400 for invalid UUID format', async () => {
    const res = await request(app).get(`${BASE_URL}/not-a-uuid`).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Property 8: Get-After-Create Consistency
  // Feature: property-management-api, Property 8: Get-After-Create Consistency
  // ─────────────────────────────────────────────────────────────────────────

  it('Property 8: GET after POST returns consistent data for all required fields', async () => {
    // Validates: Requirements 10.3, 3.1–3.4
    const body = {
      title: 'Round Trip Test İlanı',
      listingType: 'FOR_SALE',
      propertyType: 'APARTMENT',
      price: 750000,
      city: 'Ankara',
      district: 'Çankaya',
      neighborhood: 'Kızılay',
      address: 'Atatürk Caddesi No:1',
    };
    const createRes = await request(app)
      .post('/api/v1/properties')
      .set('Authorization', `Bearer ${authToken}`)
      .send(body)
      .expect(201);
    const id = createRes.body.data.id as string;
    const getRes = await request(app).get(`${BASE_URL}/${id}`).expect(200);
    expect(getRes.body.data.id).toBe(id);
    expect(getRes.body.data.title).toBe(body.title);
    expect(getRes.body.data.price).toBe(body.price);
    expect(getRes.body.data.city).toBe(body.city);
    expect(getRes.body.data.district).toBe(body.district);
    expect(getRes.body.data.listingType).toBe(body.listingType);
    expect(getRes.body.data.propertyType).toBe(body.propertyType);
    expect(getRes.body.data.isPublished).toBe(false);
  });
});
