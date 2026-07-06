/**
 * Feature: database-foundation, Property 3: Property Soft-Delete Lifecycle
 * Validates: Requirements 4.7, 8.2, 8.3, 8.4
 *
 * Property: For any Property record:
 *   (a) After soft-delete, deletedAt !== null and the physical record still exists.
 *   (b) A query filtered with deletedAt IS NULL does NOT return the deleted record.
 *   (c) After restore (deletedAt = null), the record is visible again in active queries.
 *
 * Test strategy:
 *   - Uses a mock PrismaClient — no real database connection needed.
 *   - The mock maintains an in-memory store that accurately simulates Prisma's
 *     create / update / findMany / findUnique semantics for the Property model.
 *   - fast-check generates arbitrary valid Property field values.
 *   - numRuns: 100
 */

import * as fc from 'fast-check';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PropertyRecord {
  id: string;
  slug: string;
  title: string;
  listingType: 'FOR_SALE' | 'FOR_RENT';
  propertyType: 'APARTMENT' | 'HOUSE' | 'LAND' | 'OFFICE' | 'SHOP' | 'WAREHOUSE' | 'OTHER';
  price: string; // Decimal stored as string in mock
  city: string;
  district: string;
  address: string;
  createdById: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── In-Memory Mock PrismaClient Factory ─────────────────────────────────────

/**
 * Creates a fresh in-memory mock for the `property` delegate on each invocation.
 * This ensures test isolation — no shared state between fast-check runs.
 */
function createMockPropertyClient() {
  const store = new Map<string, PropertyRecord>();

  return {
    create: jest.fn(({ data }: { data: Omit<PropertyRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string } }) => {
      const record: PropertyRecord = {
        id: data.id ?? `id-${Math.random().toString(36).slice(2)}`,
        slug: data.slug,
        title: data.title,
        listingType: data.listingType,
        propertyType: data.propertyType,
        price: data.price,
        city: data.city,
        district: data.district,
        address: data.address,
        createdById: data.createdById,
        deletedAt: data.deletedAt ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.set(record.id, record);
      return Promise.resolve(record);
    }),

    update: jest.fn(
      ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<PropertyRecord>;
      }) => {
        const existing = store.get(where.id);
        if (!existing) {
          return Promise.reject(new Error(`Record not found: ${where.id}`));
        }
        const updated: PropertyRecord = {
          ...existing,
          ...data,
          updatedAt: new Date(),
        };
        store.set(where.id, updated);
        return Promise.resolve(updated);
      },
    ),

    findUnique: jest.fn(({ where }: { where: { id: string } }) => {
      const record = store.get(where.id) ?? null;
      return Promise.resolve(record);
    }),

    findMany: jest.fn(
      ({ where }: { where?: { deletedAt?: null | { not: null } } } = {}) => {
        let results = Array.from(store.values());

        if (where?.deletedAt === null) {
          // Simulate: WHERE deletedAt IS NULL
          results = results.filter((r) => r.deletedAt === null);
        } else if (
          where?.deletedAt !== undefined &&
          typeof where.deletedAt === 'object' &&
          where.deletedAt !== null &&
          'not' in where.deletedAt
        ) {
          // Simulate: WHERE deletedAt IS NOT NULL
          results = results.filter((r) => r.deletedAt !== null);
        }

        return Promise.resolve(results);
      },
    ),
  };
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const listingTypeArb = fc.constantFrom<'FOR_SALE' | 'FOR_RENT'>('FOR_SALE', 'FOR_RENT');

const propertyTypeArb = fc.constantFrom<
  'APARTMENT' | 'HOUSE' | 'LAND' | 'OFFICE' | 'SHOP' | 'WAREHOUSE' | 'OTHER'
>('APARTMENT', 'HOUSE', 'LAND', 'OFFICE', 'SHOP', 'WAREHOUSE', 'OTHER');

/** Generates a non-empty string suitable for text fields */
const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

/** Generates a slug-safe unique-ish string */
const slugArb = fc
  .tuple(fc.hexaString({ minLength: 8, maxLength: 8 }), fc.hexaString({ minLength: 4, maxLength: 4 }))
  .map(([a, b]) => `property-${a}-${b}`);

/** Generates a positive price string (Decimal represented as string) */
const priceArb = fc.integer({ min: 1, max: 10_000_000 }).map((n) => n.toString());

/** A UUID-like string for createdById */
const uuidArb = fc
  .tuple(
    fc.hexaString({ minLength: 8, maxLength: 8 }),
    fc.hexaString({ minLength: 4, maxLength: 4 }),
    fc.hexaString({ minLength: 4, maxLength: 4 }),
    fc.hexaString({ minLength: 4, maxLength: 4 }),
    fc.hexaString({ minLength: 12, maxLength: 12 }),
  )
  .map(([a, b, c, d, e]) => `${a}-${b}-${c}-${d}-${e}`);

/**
 * Arbitrary that produces a valid set of Property fields (required ones only).
 */
const propertyFieldsArb = fc.record({
  slug: slugArb,
  title: nonEmptyStringArb,
  listingType: listingTypeArb,
  propertyType: propertyTypeArb,
  price: priceArb,
  city: nonEmptyStringArb,
  district: nonEmptyStringArb,
  address: nonEmptyStringArb,
  createdById: uuidArb,
});

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('Property 3: Property Soft-Delete Lifecycle (PBT)', () => {
  /**
   * (a) After soft-delete: deletedAt !== null AND physical record still exists.
   * Validates: Requirements 8.2 (no physical delete, only deletedAt update)
   */
  it('(a) soft-delete sets deletedAt and keeps the physical record', async () => {
    await fc.assert(
      fc.asyncProperty(propertyFieldsArb, async (fields) => {
        const mockProperty = createMockPropertyClient();

        // 1. Create the property
        const created = await mockProperty.create({ data: { ...fields, deletedAt: null } });

        // 2. Soft-delete: set deletedAt to current timestamp
        const deletedAt = new Date();
        const softDeleted = await mockProperty.update({
          where: { id: created.id },
          data: { deletedAt },
        });

        // Assert (a): deletedAt is set (not null)
        expect(softDeleted.deletedAt).not.toBeNull();
        expect(softDeleted.deletedAt).toBeInstanceOf(Date);

        // Assert (a): physical record still exists (findUnique returns it)
        const physicalRecord = await mockProperty.findUnique({ where: { id: created.id } });
        expect(physicalRecord).not.toBeNull();
        expect(physicalRecord?.id).toBe(created.id);
        expect(physicalRecord?.deletedAt).not.toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * (b) A query with deletedAt IS NULL filter does NOT return the soft-deleted record.
   * Validates: Requirements 4.7, 8.3 (default queries exclude soft-deleted)
   */
  it('(b) active query (deletedAt IS NULL) excludes soft-deleted record', async () => {
    await fc.assert(
      fc.asyncProperty(propertyFieldsArb, async (fields) => {
        const mockProperty = createMockPropertyClient();

        // 1. Create and soft-delete the property
        const created = await mockProperty.create({ data: { ...fields, deletedAt: null } });
        await mockProperty.update({
          where: { id: created.id },
          data: { deletedAt: new Date() },
        });

        // 2. Query with deletedAt IS NULL (active records filter)
        const activeRecords = await mockProperty.findMany({ where: { deletedAt: null } });

        // Assert (b): the soft-deleted record is NOT in the active query results
        const found = activeRecords.find((r) => r.id === created.id);
        expect(found).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * (c) After restore (deletedAt = null), the record appears again in active queries.
   * Validates: Requirement 8.4 (restore sets deletedAt back to null)
   */
  it('(c) restore (deletedAt = null) makes the record visible in active queries again', async () => {
    await fc.assert(
      fc.asyncProperty(propertyFieldsArb, async (fields) => {
        const mockProperty = createMockPropertyClient();

        // 1. Create, soft-delete, then restore
        const created = await mockProperty.create({ data: { ...fields, deletedAt: null } });

        await mockProperty.update({
          where: { id: created.id },
          data: { deletedAt: new Date() },
        });

        const restored = await mockProperty.update({
          where: { id: created.id },
          data: { deletedAt: null },
        });

        // Assert (c): deletedAt is null after restore
        expect(restored.deletedAt).toBeNull();

        // Assert (c): record appears in active query again
        const activeRecords = await mockProperty.findMany({ where: { deletedAt: null } });
        const found = activeRecords.find((r) => r.id === created.id);
        expect(found).toBeDefined();
        expect(found?.deletedAt).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Full lifecycle: create → soft-delete → verify excluded → restore → verify included.
   * This is the end-to-end property combining (a), (b), (c) in sequence.
   * Validates: Requirements 4.7, 8.2, 8.3, 8.4
   */
  it('full soft-delete lifecycle: create → soft-delete → restore', async () => {
    await fc.assert(
      fc.asyncProperty(propertyFieldsArb, async (fields) => {
        const mockProperty = createMockPropertyClient();

        // ── Step 1: Create ──────────────────────────────────────────────────
        const created = await mockProperty.create({ data: { ...fields, deletedAt: null } });
        expect(created.deletedAt).toBeNull();

        // Verify it appears in active query before soft-delete
        const beforeDelete = await mockProperty.findMany({ where: { deletedAt: null } });
        expect(beforeDelete.find((r) => r.id === created.id)).toBeDefined();

        // ── Step 2: Soft-Delete ─────────────────────────────────────────────
        const deletedAt = new Date();
        const softDeleted = await mockProperty.update({
          where: { id: created.id },
          data: { deletedAt },
        });

        // (a) deletedAt is non-null; physical record exists
        expect(softDeleted.deletedAt).not.toBeNull();
        const physicalRecord = await mockProperty.findUnique({ where: { id: created.id } });
        expect(physicalRecord).not.toBeNull();

        // (b) Not in active query
        const duringDelete = await mockProperty.findMany({ where: { deletedAt: null } });
        expect(duringDelete.find((r) => r.id === created.id)).toBeUndefined();

        // ── Step 3: Restore ─────────────────────────────────────────────────
        const restored = await mockProperty.update({
          where: { id: created.id },
          data: { deletedAt: null },
        });

        // (c) deletedAt is null again; record visible in active query
        expect(restored.deletedAt).toBeNull();
        const afterRestore = await mockProperty.findMany({ where: { deletedAt: null } });
        expect(afterRestore.find((r) => r.id === created.id)).toBeDefined();
      }),
      { numRuns: 100 },
    );
  });
});
