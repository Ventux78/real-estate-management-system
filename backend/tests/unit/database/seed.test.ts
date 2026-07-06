/**
 * Feature: database-foundation, Property 7: Seed İdempotency
 * Validates: Requirements 10.4
 *
 * Bu test, seed() fonksiyonunun birden fazla kez çalıştırıldığında
 * User, Property ve PropertyImage kayıt sayılarının sabit kaldığını doğrular.
 * Mock PrismaClient kullanılır — gerçek veritabanı bağlantısı gerekmez.
 */

import * as fc from 'fast-check';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MockUser {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  isActive: boolean;
}

interface MockProperty {
  id: string;
  slug: string;
}

interface MockPropertyImage {
  id: string;
  propertyId: string;
  publicId: string;
  displayOrder: number;
}

type UpsertArgs<T> = {
  where: Record<string, unknown>;
  update: Record<string, unknown>;
  create: T;
};

// ─── Mock Factory ─────────────────────────────────────────────────────────────

/**
 * Creates an in-memory store that simulates idempotent upsert behaviour.
 * The mock tracks all records inserted, enabling count verification.
 */
function createMockPrismaClient() {
  // In-memory stores keyed by unique identifiers
  const userStore = new Map<string, MockUser>();
  const propertyStore = new Map<string, MockProperty>();
  const propertyImageStore = new Map<string, MockPropertyImage>();

  const user = {
    upsert: jest.fn(async (args: UpsertArgs<MockUser>) => {
      const email = (args.where as { email: string }).email;
      if (userStore.has(email)) {
        return userStore.get(email) as MockUser;
      }
      const record: MockUser = { ...args.create, id: args.create.id || `user-${email}` };
      userStore.set(email, record);
      return record;
    }),
    count: jest.fn(async () => userStore.size),
  };

  const property = {
    upsert: jest.fn(async (args: UpsertArgs<MockProperty & { createdById: string }>) => {
      const slug = (args.where as { slug: string }).slug;
      if (propertyStore.has(slug)) {
        return propertyStore.get(slug) as MockProperty;
      }
      const record: MockProperty = { id: `property-${slug}`, slug };
      propertyStore.set(slug, record);
      return record;
    }),
    count: jest.fn(async () => propertyStore.size),
  };

  const propertyImage = {
    upsert: jest.fn(
      async (args: UpsertArgs<MockPropertyImage & { imageUrl: string; isCover: boolean }>) => {
        const key = (
          args.where as { propertyId_displayOrder: { propertyId: string; displayOrder: number } }
        ).propertyId_displayOrder;
        const compositeKey = `${key.propertyId}::${key.displayOrder}`;

        if (propertyImageStore.has(compositeKey)) {
          return propertyImageStore.get(compositeKey) as MockPropertyImage;
        }
        const record: MockPropertyImage = {
          id: `img-${compositeKey}`,
          propertyId: key.propertyId,
          publicId: args.create.publicId,
          displayOrder: key.displayOrder,
        };
        propertyImageStore.set(compositeKey, record);
        return record;
      },
    ),
    count: jest.fn(async () => propertyImageStore.size),
  };

  const $disconnect = jest.fn().mockResolvedValue(undefined);

  return {
    user,
    property,
    propertyImage,
    $disconnect,
    // Expose stores for inspection
    _stores: { userStore, propertyStore, propertyImageStore },
  };
}

// ─── Module mock setup ────────────────────────────────────────────────────────

// We mock the generated PrismaClient and the prisma module-level instance
// used inside seed.ts. Each test uses jest.isolateModules to get a fresh
// copy of the seed module with a dedicated mock client.

jest.mock('@/generated/prisma-client', () => {
  // Placeholder — overridden per-test via jest.isolateModules
  return { PrismaClient: jest.fn() };
});

// ─── Helper ──────────────────────────────────────────────────────────────────

type SeedModule = { seed: () => Promise<void> };

/**
 * Loads a fresh seed module wired to the provided mock client instance.
 */
async function loadSeedWithMock(
  mockClient: ReturnType<typeof createMockPrismaClient>,
): Promise<SeedModule> {
  let mod!: SeedModule;

  jest.isolateModules(() => {
    jest.mock('@/generated/prisma-client', () => {
      const MockPrismaClient = jest.fn().mockImplementation(() => mockClient);
      return { PrismaClient: MockPrismaClient };
    });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mod = require('../../../prisma/seed') as SeedModule;
  });

  return mod;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Seed — Property 7: Seed İdempotency (Requirements 10.4)', () => {
  let consoleSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.resetModules();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Property 7: Seed İdempotency
  // seed() 3 kez çalıştırıldığında kayıt sayıları sabit kalmalıdır
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Property 7: Seed İdempotency
   * Validates: Requirements 10.4
   *
   * For any N ≥ 1 times the seed script is executed consecutively,
   * after each execution, the User, Property, and PropertyImage record
   * counts MUST remain constant — seed must not duplicate existing records.
   */
  it('Property 7: running seed() 3 times must not increase User, Property, or PropertyImage counts', async () => {
    await fc.assert(
      fc.asyncProperty(
        // We don't need external arbitrary inputs here — the property holds
        // unconditionally for the fixed seed data. We use fc.constant(null)
        // to satisfy fast-check's requirement for at least one arbitrary while
        // still running 100 iterations to confirm stability.
        fc.constant(null),
        async () => {
          jest.resetModules();

          const mockClient = createMockPrismaClient();
          const mod = await loadSeedWithMock(mockClient);

          // Run seed 3 times in sequence
          await mod.seed();
          const countsAfterRun1 = {
            users: await mockClient.user.count(),
            properties: await mockClient.property.count(),
            images: await mockClient.propertyImage.count(),
          };

          await mod.seed();
          const countsAfterRun2 = {
            users: await mockClient.user.count(),
            properties: await mockClient.property.count(),
            images: await mockClient.propertyImage.count(),
          };

          await mod.seed();
          const countsAfterRun3 = {
            users: await mockClient.user.count(),
            properties: await mockClient.property.count(),
            images: await mockClient.propertyImage.count(),
          };

          // After the first run there should be exactly 1 user, 2 properties, 2 images
          expect(countsAfterRun1.users).toBe(1);
          expect(countsAfterRun1.properties).toBe(2);
          expect(countsAfterRun1.images).toBe(2);

          // Run 2 must equal run 1
          expect(countsAfterRun2.users).toBe(countsAfterRun1.users);
          expect(countsAfterRun2.properties).toBe(countsAfterRun1.properties);
          expect(countsAfterRun2.images).toBe(countsAfterRun1.images);

          // Run 3 must equal run 1
          expect(countsAfterRun3.users).toBe(countsAfterRun1.users);
          expect(countsAfterRun3.properties).toBe(countsAfterRun1.properties);
          expect(countsAfterRun3.images).toBe(countsAfterRun1.images);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Supporting: upsert is called — not insert
  // ══════════════════════════════════════════════════════════════════════════
  it('seed() uses upsert strategy for User, Property, and PropertyImage', async () => {
    jest.resetModules();
    const mockClient = createMockPrismaClient();
    const mod = await loadSeedWithMock(mockClient);

    await mod.seed();

    // All writes should go through upsert — no createMany / create calls
    expect(mockClient.user.upsert).toHaveBeenCalled();
    expect(mockClient.property.upsert).toHaveBeenCalled();
    expect(mockClient.propertyImage.upsert).toHaveBeenCalled();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Supporting: exact record structure after first run
  // ══════════════════════════════════════════════════════════════════════════
  it('seed() creates exactly 1 user, 2 properties, and 2 images on first run', async () => {
    jest.resetModules();
    const mockClient = createMockPrismaClient();
    const mod = await loadSeedWithMock(mockClient);

    await mod.seed();

    expect(await mockClient.user.count()).toBe(1);
    expect(await mockClient.property.count()).toBe(2);
    expect(await mockClient.propertyImage.count()).toBe(2);
  });
});
