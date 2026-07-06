/**
 * Integration Tests — GET /api/v1/properties
 *
 * Validates: Requirements 10.2, 2.1–2.7
 *
 * (a) Default pagination format
 * (b) city filter — only matching listings returned  (Property 6: Filter Correctness)
 * (c) isPublished=true filter — only published listings returned
 * (d) sortBy=price&sortOrder=asc — consecutive pair check  (Property 7: Sort Order Invariant)
 * (e) Soft-deleted listings excluded  (Property 4: Soft-Delete Exclusion Invariant)
 */

import request from 'supertest';
import { createApp } from '@/app';
import { prisma } from '@/lib/prisma';
import { generateAccessToken } from '@/utils/jwt.util';

const app = createApp();
const BASE_URL = '/api/v1/properties';

// ─── Helper ──────────────────────────────────────────────────────────────────

async function createTestProperty(
  userId: string,
  overrides: Record<string, unknown> = {},
) {
  return prisma.property.create({
    data: {
      title: 'Test İlan ' + Date.now() + Math.random(),
      slug: 'test-' + Date.now() + '-' + Math.random().toString(36).slice(2),
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

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('GET /api/v1/properties', () => {
  let testUserId: string;
  let authToken: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        username: 'listtest_' + Date.now(),
        email: 'list_' + Date.now() + '@test.com',
        passwordHash:
          '$2a$12$2hu2LDLAHzQCEVq7sckwKebOzOlx5Y/uOgtVEt.UQ5Kg4HUnBPVKS',
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

  // ── (a) Default pagination format ──────────────────────────────────────────

  it('should return paginated result with default pagination format', async () => {
    await createTestProperty(testUserId);

    const res = await request(app).get(BASE_URL).expect(200);

    expect(res.body.success).toBe(true);

    const { pagination } = res.body.data as {
      pagination: { page: number; limit: number; total: number; pages: number };
    };

    expect(pagination).toHaveProperty('page');
    expect(pagination).toHaveProperty('limit');
    expect(pagination).toHaveProperty('total');
    expect(pagination).toHaveProperty('pages');

    // Property 5: Pagination Formula Invariant
    // Feature: property-management-api, Property 5: Pagination Formula Invariant
    // pages === Math.ceil(total / limit) must always hold
    expect(pagination.pages).toBe(Math.ceil(pagination.total / pagination.limit));

    expect(Array.isArray(res.body.data.data)).toBe(true);
  });

  // ── (b) city filter (Property 6) ───────────────────────────────────────────

  it('Property 6: city filter returns only matching listings', async () => {
    // Feature: property-management-api, Property 6: Filter Correctness
    // Every returned listing must satisfy the city filter condition
    await createTestProperty(testUserId, { city: 'Ankara', isPublished: true });
    await createTestProperty(testUserId, { city: 'İzmir', isPublished: true });

    const res = await request(app).get(BASE_URL + '?city=Ankara').expect(200);

    expect(res.body.success).toBe(true);

    const listings = res.body.data.data as Array<{ city: string }>;
    expect(listings.length).toBeGreaterThan(0);

    listings.forEach((p) => {
      expect(p.city).toBe('Ankara');
    });
  });

  // ── (c) isPublished filter ─────────────────────────────────────────────────

  it('isPublished=true filter returns only published listings', async () => {
    await createTestProperty(testUserId, { isPublished: true });
    await createTestProperty(testUserId, { isPublished: false });

    const res = await request(app)
      .get(BASE_URL + '?isPublished=true')
      .expect(200);

    expect(res.body.success).toBe(true);

    const listings = res.body.data.data as Array<{ isPublished: boolean }>;
    // At least the published one must appear
    expect(listings.length).toBeGreaterThan(0);

    listings.forEach((p) => {
      expect(p.isPublished).toBe(true);
    });
  });

  // ── (d) Sort order (Property 7) ────────────────────────────────────────────

  it('Property 7: sortBy=price&sortOrder=asc returns ascending order', async () => {
    // Feature: property-management-api, Property 7: Sort Order Invariant
    // Consecutive pairs must satisfy listings[i].price <= listings[i+1].price
    await createTestProperty(testUserId, { price: 300000, isPublished: true });
    await createTestProperty(testUserId, { price: 100000, isPublished: true });
    await createTestProperty(testUserId, { price: 200000, isPublished: true });

    const res = await request(app)
      .get(BASE_URL + '?sortBy=price&sortOrder=asc&isPublished=true')
      .expect(200);

    expect(res.body.success).toBe(true);

    const listings = res.body.data.data as Array<{ price: number }>;
    expect(listings.length).toBeGreaterThanOrEqual(3);

    for (let i = 0; i < listings.length - 1; i++) {
      const current = listings[i]!;
      const next = listings[i + 1]!;
      expect(current.price).toBeLessThanOrEqual(next.price);
    }
  });

  // ── (e) Soft-delete exclusion (Property 4) ─────────────────────────────────

  it('Property 4: soft-deleted listings do not appear in list', async () => {
    // Feature: property-management-api, Property 4: Soft-Delete Exclusion Invariant
    // Listings with a non-null deletedAt must never be present in the response
    const property = await createTestProperty(testUserId, { isPublished: true });

    // Soft-delete by setting deletedAt directly via Prisma
    await prisma.property.update({
      where: { id: property.id },
      data: { deletedAt: new Date() },
    });

    const res = await request(app).get(BASE_URL).expect(200);

    expect(res.body.success).toBe(true);

    const ids = (res.body.data.data as Array<{ id: string }>).map((p) => p.id);
    expect(ids).not.toContain(property.id);
  });
});
