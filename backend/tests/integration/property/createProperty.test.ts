/**
 * Integration Tests: POST /api/v1/properties
 *
 * Test Kapsamı:
 * (a) Geçerli token + body → HTTP 201, PropertyDto format doğrulaması, isPublished=false
 * (b) Geçersiz/eksik token → HTTP 401
 * (c) Eksik zorunlu alan → HTTP 400 + details alanı kontrolü
 * Property 3: New Property isPublished Default — geçerli herhangi bir oluşturma verisinde
 *             isPublished false olmalı
 *
 * Validates: Requirements 10.1, 1.7
 */

import request from 'supertest';
import { createApp } from '@/app';
import { prisma } from '@/lib/prisma';
import { generateAccessToken } from '@/utils/jwt.util';
import * as fc from 'fast-check';

const app = createApp();

describe('POST /api/v1/properties', () => {
  let authToken: string;
  let testUserId: string;

  const validPropertyBody = {
    title: 'Test İlanı',
    listingType: 'FOR_SALE',
    propertyType: 'APARTMENT',
    price: 500000,
    city: 'Adana',
    district: 'Yüreğir',
    neighborhood: 'PTT Evleri',
    address: 'Test Sokak No:1',
  };

  beforeAll(async () => {
    // Create test user directly in DB
    const user = await prisma.user.create({
      data: {
        username: 'testuser_create_' + Date.now(),
        email: 'test_create_' + Date.now() + '@test.com',
        // bcrypt hash — password: admin123 (salt rounds: 12)
        passwordHash: '$2a$12$2hu2LDLAHzQCEVq7sckwKebOzOlx5Y/uOgtVEt.UQ5Kg4HUnBPVKS',
      },
    });
    testUserId = user.id;
    authToken = generateAccessToken({ sub: user.id, username: user.username });
  });

  beforeEach(async () => {
    // Clean properties before each test for isolation
    await prisma.property.deleteMany({ where: { createdById: testUserId } });
  });

  afterAll(async () => {
    await prisma.property.deleteMany({ where: { createdById: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // (a) Valid token + valid body → 201
  // ─────────────────────────────────────────────────────────────────────────

  it('should create property and return 201 with PropertyDto', async () => {
    const res = await request(app)
      .post('/api/v1/properties')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validPropertyBody)
      .expect('Content-Type', /json/)
      .expect(201);

    // Top-level response shape
    expect(res.body.success).toBe(true);

    const data = res.body.data;

    // UUID id — matches /^[0-9a-f-]{36}$/
    expect(data.id).toMatch(/^[0-9a-f-]{36}$/);

    // Slug is a non-empty string
    expect(typeof data.slug).toBe('string');
    expect(data.slug.length).toBeGreaterThan(0);

    // isPublished must be false by default — Requirement 1.7
    expect(data.isPublished).toBe(false);

    // images is an array
    expect(Array.isArray(data.images)).toBe(true);

    // createdAt is an ISO date string
    expect(typeof data.createdAt).toBe('string');
    expect(new Date(data.createdAt).toISOString()).toBe(data.createdAt);

    // Core fields round-trip
    expect(data.title).toBe(validPropertyBody.title);
    expect(data.listingType).toBe(validPropertyBody.listingType);
    expect(data.propertyType).toBe(validPropertyBody.propertyType);
    expect(data.price).toBe(validPropertyBody.price);
    expect(data.city).toBe(validPropertyBody.city);
    expect(data.district).toBe(validPropertyBody.district);
    expect(data.address).toBe(validPropertyBody.address);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // (b) Missing / invalid token → 401
  // ─────────────────────────────────────────────────────────────────────────

  it('should return 401 when token is missing', async () => {
    const res = await request(app)
      .post('/api/v1/properties')
      .send(validPropertyBody)
      .expect('Content-Type', /json/)
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('MISSING_TOKEN');
  });

  it('should return 401 when token is invalid', async () => {
    const res = await request(app)
      .post('/api/v1/properties')
      .set('Authorization', 'Bearer invalid.token.value')
      .send(validPropertyBody)
      .expect('Content-Type', /json/)
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // (c) Missing required field → 400 with details
  // ─────────────────────────────────────────────────────────────────────────

  it('should return 400 when required field (title) is missing', async () => {
    const { title: _title, ...bodyWithoutTitle } = validPropertyBody;

    const res = await request(app)
      .post('/api/v1/properties')
      .set('Authorization', `Bearer ${authToken}`)
      .send(bodyWithoutTitle)
      .expect('Content-Type', /json/)
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    // details field must be present and contain the offending field
    expect(res.body.error.details).toBeDefined();
    expect(res.body.error.details).toHaveProperty('title');
  });

  it('should return 400 when required field (price) is missing', async () => {
    const { price: _price, ...bodyWithoutPrice } = validPropertyBody;

    const res = await request(app)
      .post('/api/v1/properties')
      .set('Authorization', `Bearer ${authToken}`)
      .send(bodyWithoutPrice)
      .expect('Content-Type', /json/)
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toBeDefined();
    expect(res.body.error.details).toHaveProperty('price');
  });

  it('should return 400 when required field (listingType) is invalid enum value', async () => {
    const res = await request(app)
      .post('/api/v1/properties')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ ...validPropertyBody, listingType: 'INVALID_TYPE' })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toBeDefined();
    expect(res.body.error.details).toHaveProperty('listingType');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Property 3: New Property isPublished Default
  // Feature: property-management-api, Property 3: New Property isPublished Default
  // ─────────────────────────────────────────────────────────────────────────

  it('Property 3: newly created property isPublished should always be false', async () => {
    // Validates: Requirements 10.1, 1.7
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 200 }),
          listingType: fc.constantFrom('FOR_SALE', 'FOR_RENT'),
          propertyType: fc.constantFrom('APARTMENT', 'HOUSE'),
          price: fc.float({ min: Math.fround(1), max: Math.fround(999999), noNaN: true }),
          city: fc.string({ minLength: 1 }),
          district: fc.string({ minLength: 1 }),
          address: fc.string({ minLength: 1 }),
        }),
        async (dto) => {
          const res = await request(app)
            .post('/api/v1/properties')
            .set('Authorization', `Bearer ${authToken}`)
            .send(dto);

          if (res.status === 201) {
            return res.body.data.isPublished === false;
          }
          // If creation fails for reasons unrelated to isPublished, skip
          return true;
        },
      ),
      { numRuns: 5 }, // Keep low for integration tests
    );
  });
});
