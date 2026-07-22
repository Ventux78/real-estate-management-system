/**
 * Property Validation — Property-Based Tests
 * Feature: property-management-api
 *
 * Tests:
 *   - Property 12: Validation Schema Completeness
 *   - Property 13: UpdatePropertySchema Minimum Fields
 *
 * Validates: Requirements 8.1, 8.2, 8.5
 */

import * as fc from 'fast-check';
import { ZodError } from 'zod';
import {
  createPropertySchema,
  updatePropertySchema,
} from '@/modules/property/property.validation';

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const validCreateDto = fc.record({
  title: fc.string({ minLength: 1, maxLength: 200 }),
  listingType: fc.constantFrom('FOR_SALE', 'FOR_RENT'),
  propertyType: fc.constantFrom(
    'APARTMENT',
    'HOUSE',
    'LAND',
    'OFFICE',
    'SHOP',
    'WAREHOUSE',
    'OTHER',
  ),
  price: fc.float({ min: Math.fround(0.01), max: Math.fround(1_000_000), noNaN: true }),
  city: fc.string({ minLength: 1 }),
  district: fc.string({ minLength: 1 }),
  neighborhood: fc.string({ minLength: 1 }),
  address: fc.string({ minLength: 1 }),
});

// ─── Property 12: Validation Schema Completeness ─────────────────────────────

describe('Property 12: Validation Schema Completeness', () => {
  // Feature: property-management-api, Property 12: Validation Schema Completeness

  it('valid CreatePropertyDto objects always parse successfully', () => {
    fc.assert(
      fc.property(validCreateDto, (dto) => {
        const result = createPropertySchema.safeParse(dto);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('objects missing required fields always throw ZodError', () => {
    // Generate a required-field name to omit
    const requiredFields = [
      'title',
      'listingType',
      'propertyType',
      'price',
      'city',
      'district',
      'neighborhood',
      'address',
    ] as const;

    fc.assert(
      fc.property(
        validCreateDto,
        fc.constantFrom(...requiredFields),
        (dto, fieldToOmit) => {
          const partial = { ...dto };
          delete (partial as Record<string, unknown>)[fieldToOmit];

          const result = createPropertySchema.safeParse(partial);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error).toBeInstanceOf(ZodError);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('objects with invalid listingType always throw ZodError', () => {
    fc.assert(
      fc.property(
        validCreateDto,
        fc.string().filter((s) => s !== 'FOR_SALE' && s !== 'FOR_RENT'),
        (dto, invalidListingType) => {
          const invalid = { ...dto, listingType: invalidListingType };
          const result = createPropertySchema.safeParse(invalid);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error).toBeInstanceOf(ZodError);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('objects with non-positive price always throw ZodError', () => {
    fc.assert(
      fc.property(
        validCreateDto,
        fc.oneof(
          fc.constant(0),
          fc.float({ max: Math.fround(-0.001), noNaN: true }),
        ),
        (dto, invalidPrice) => {
          const invalid = { ...dto, price: invalidPrice };
          const result = createPropertySchema.safeParse(invalid);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error).toBeInstanceOf(ZodError);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('objects with empty required string fields always throw ZodError', () => {
    const stringFields = ['title', 'city', 'district', 'address'] as const;

    fc.assert(
      fc.property(
        validCreateDto,
        fc.constantFrom(...stringFields),
        (dto, fieldToEmpty) => {
          const invalid = { ...dto, [fieldToEmpty]: '' };
          const result = createPropertySchema.safeParse(invalid);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error).toBeInstanceOf(ZodError);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 13: UpdatePropertySchema Minimum Fields ────────────────────────

describe('Property 13: UpdatePropertySchema Minimum Fields', () => {
  // Feature: property-management-api, Property 13: UpdatePropertySchema Minimum Fields

  it('empty object {} always throws ZodError', () => {
    const result = updatePropertySchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(ZodError);
    }
  });

  it('object with at least one valid field always parses successfully', () => {
    // Test a few representative single-field objects
    const singleFieldCases = [
      { title: 'Test İlanı' },
      { price: 500000 },
      { city: 'İstanbul' },
      { listingType: 'FOR_SALE' as const },
      { propertyType: 'APARTMENT' as const },
      { district: 'Kadıköy' },
      { address: 'Test Sokak No:1' },
    ];

    for (const singleField of singleFieldCases) {
      const result = updatePropertySchema.safeParse(singleField);
      expect(result.success).toBe(true);
    }
  });

  it('any single valid field from CreatePropertyDto produces a successful parse', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.record({ title: fc.string({ minLength: 1, maxLength: 200 }) }),
          fc.record({ city: fc.string({ minLength: 1 }) }),
          fc.record({ district: fc.string({ minLength: 1 }) }),
          fc.record({ address: fc.string({ minLength: 1 }) }),
          fc.record({ price: fc.float({ min: Math.fround(0.01), max: Math.fround(1_000_000), noNaN: true }) }),
          fc.record({ listingType: fc.constantFrom('FOR_SALE', 'FOR_RENT') }),
          fc.record({
            propertyType: fc.constantFrom(
              'APARTMENT',
              'HOUSE',
              'LAND',
              'OFFICE',
              'SHOP',
              'WAREHOUSE',
              'OTHER',
            ),
          }),
        ),
        (singleFieldDto) => {
          const result = updatePropertySchema.safeParse(singleFieldDto);
          expect(result.success).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('fully valid CreatePropertyDto objects also parse with updatePropertySchema', () => {
    fc.assert(
      fc.property(validCreateDto, (dto) => {
        const result = updatePropertySchema.safeParse(dto);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
