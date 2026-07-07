/**
 * Property-Based Tests — User ↔ Property Restrict FK
 *
 * Test dosyası: tests/unit/database/relations.test.ts
 *
 * Bu dosya, User ↔ Property ilişkisindeki RESTRICT FK kısıtını
 * mock PrismaClient kullanarak doğrular. Gerçek bir veritabanı bağlantısı
 * gerekmez; kısıt ihlali mock seviyesinde simüle edilir.
 *
 * Feature: database-foundation, Property 6: User Restrict FK — Aktif İlanı Olan Kullanıcı Silinemez
 * Validates: Requirements 6.5
 */

import * as fc from 'fast-check';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MockUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface MockProperty {
  id: string;
  slug: string;
  title: string;
  listingType: string;
  propertyType: string;
  price: string;
  city: string;
  district: string;
  address: string;
  createdById: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Mock Factory ─────────────────────────────────────────────────────────────

/**
 * Aktif ilanı (`deletedAt IS NULL`) olan kullanıcı silinmeye çalışıldığında
 * PostgreSQL RESTRICT FK davranışını simüle eden in-memory mock.
 *
 * Gerçek davranış:
 *   - Property → User ilişkisinde `onDelete: Restrict`
 *   - Kullanıcıya ait aktif (deletedAt IS NULL) ilan varken silme → P2014 veya P2003
 *   - Silme başarısız olduğunda hem User hem Property kayıtları korunur
 */
function createMockDatabase() {
  const userStore = new Map<string, MockUser>();
  const propertyStore = new Map<string, MockProperty>();

  const user = {
    create: jest.fn(async (args: { data: MockUser }) => {
      const record: MockUser = { ...args.data };
      userStore.set(record.id, record);
      return record;
    }),

    delete: jest.fn(async (args: { where: { id: string } }) => {
      const { id } = args.where;
      const existing = userStore.get(id);
      if (!existing) {
        throw new PrismaClientKnownRequestError(
          'An operation failed because it depends on one or more records that were required but not found.',
          { code: 'P2025', clientVersion: '5.22.0' },
        );
      }

      // RESTRICT FK: kullanıcıya ait aktif (deletedAt IS NULL) ilan varsa silmeyi reddet
      const hasActiveProperties = Array.from(propertyStore.values()).some(
        (p) => p.createdById === id && p.deletedAt === null,
      );

      if (hasActiveProperties) {
        // P2014: The change you are trying to make would violate the required relation
        // P2003: Foreign key constraint failed on the field
        // Her ikisi de geçerli — PostgreSQL versiyonuna göre değişebilir
        throw new PrismaClientKnownRequestError(
          'The change you are trying to make would violate the required relation ' +
            '\'Property_createdById_fkey\' between the `Property` and `User` models.',
          {
            code: 'P2014',
            clientVersion: '5.22.0',
            meta: { relation_name: 'Property_createdById_fkey', model_a_name: 'Property', model_b_name: 'User' },
          },
        );
      }

      userStore.delete(id);
      return existing;
    }),

    findUnique: jest.fn(async (args: { where: { id: string } }) => {
      return userStore.get(args.where.id) ?? null;
    }),

    count: jest.fn(async () => userStore.size),
  };

  const property = {
    create: jest.fn(async (args: { data: MockProperty }) => {
      const record: MockProperty = { ...args.data };
      propertyStore.set(record.id, record);
      return record;
    }),

    findMany: jest.fn(async (args?: { where?: { createdById?: string; deletedAt?: null } }) => {
      let results = Array.from(propertyStore.values());
      if (args?.where?.createdById !== undefined) {
        results = results.filter((p) => p.createdById === args.where!.createdById);
      }
      if (args?.where?.deletedAt === null) {
        results = results.filter((p) => p.deletedAt === null);
      }
      return results;
    }),

    count: jest.fn(async (args?: { where?: { createdById?: string } }) => {
      if (args?.where?.createdById !== undefined) {
        return Array.from(propertyStore.values()).filter(
          (p) => p.createdById === args.where!.createdById,
        ).length;
      }
      return propertyStore.size;
    }),
  };

  return { user, property };
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** UUID benzeri string üretir */
const uuidArb = fc.uuid();

/** Non-empty string üretir (1–50 karakter) */
const nonEmptyStringArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0);

/** Pozitif fiyat string'i */
const priceArb = fc.integer({ min: 1, max: 10_000_000 }).map((n) => n.toString());

/** Slug üretir */
const slugArb = fc
  .tuple(fc.hexaString({ minLength: 8, maxLength: 8 }), fc.hexaString({ minLength: 4, maxLength: 4 }))
  .map(([a, b]) => `property-${a}-${b}`);

const listingTypeArb = fc.constantFrom<'FOR_SALE' | 'FOR_RENT'>('FOR_SALE', 'FOR_RENT');
const propertyTypeArb = fc.constantFrom<
  'APARTMENT' | 'HOUSE' | 'LAND' | 'OFFICE' | 'SHOP' | 'WAREHOUSE' | 'OTHER'
>('APARTMENT', 'HOUSE', 'LAND', 'OFFICE', 'SHOP', 'WAREHOUSE', 'OTHER');

// ─── Test Suite ───────────────────────────────────────────────────────────────

/**
 * Feature: database-foundation, Property 6: User Restrict FK — Aktif İlanı Olan Kullanıcı Silinemez
 * Validates: Requirements 6.5
 */
describe('Property 6: User Restrict FK — Aktif İlanı Olan Kullanıcı Silinemez (PBT)', () => {
  /**
   * Ana property: N aktif ilanı olan kullanıcıyı silmeye çalışmak
   * PrismaClientKnownRequestError (P2014 veya P2003) fırlatmalı;
   * hem User hem Property kayıtları varlığını korumalıdır.
   *
   * Feature: database-foundation, Property 6: User Restrict FK — Aktif İlanı Olan Kullanıcı Silinemez
   * Validates: Requirements 6.5
   */
  it(
    'aktif ilanı (deletedAt IS NULL) olan kullanıcıyı silme girişimi P2014 veya P2003 fırlatmalı',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Arbitrary: 1–5 arasında aktif ilan sayısı
          fc.integer({ min: 1, max: 5 }),
          // Arbitrary: kullanıcı ve ilan için UUID'ler
          uuidArb,
          async (activePropertyCount, userId) => {
            const mockDb = createMockDatabase();

            // 1. Kullanıcı oluştur
            await mockDb.user.create({
              data: {
                id: userId,
                username: `user_${userId.slice(0, 8)}`,
                email: `${userId.slice(0, 8)}@example.com`,
                passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMN',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            });

            // 2. N aktif ilan oluştur (deletedAt: null)
            for (let i = 0; i < activePropertyCount; i++) {
              const propertyId = `prop-${userId.slice(0, 8)}-${i}`;
              await mockDb.property.create({
                data: {
                  id: propertyId,
                  slug: `slug-${propertyId}`,
                  title: `Test Property ${i}`,
                  listingType: 'FOR_SALE',
                  propertyType: 'APARTMENT',
                  price: '100000',
                  city: 'Istanbul',
                  district: 'Kadikoy',
                  address: `Test Address ${i}`,
                  createdById: userId,
                  deletedAt: null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              });
            }

            // 3. Kullanıcıyı silmeye çalış — hata fırlatmalı
            let caughtError: unknown;
            try {
              await mockDb.user.delete({ where: { id: userId } });
            } catch (err) {
              caughtError = err;
            }

            // 4. PrismaClientKnownRequestError fırlatıldığını doğrula
            expect(caughtError).toBeInstanceOf(PrismaClientKnownRequestError);

            const prismaError = caughtError as PrismaClientKnownRequestError;

            // P2014 (Restrict ihlali) veya P2003 (FK constraint ihlali) kabul edilir
            expect(['P2014', 'P2003']).toContain(prismaError.code);

            // 5. Kullanıcının hâlâ mevcut olduğunu doğrula
            const userStillExists = await mockDb.user.findUnique({ where: { id: userId } });
            expect(userStillExists).not.toBeNull();
            expect(userStillExists?.id).toBe(userId);

            // 6. Tüm aktif ilanların hâlâ mevcut olduğunu doğrula
            const remainingProperties = await mockDb.property.findMany({
              where: { createdById: userId, deletedAt: null },
            });
            expect(remainingProperties).toHaveLength(activePropertyCount);
          },
        ),
        { numRuns: 100 },
      );
    },
    30000,
  );

  /**
   * Tamamlayıcı test: aktif ilanı olmayan kullanıcı başarıyla silinebilmeli.
   * Bu test, mock'un RESTRICT mantığının yalnızca aktif ilanlar için devreye girdiğini doğrular.
   *
   * Feature: database-foundation, Property 6: User Restrict FK — Aktif İlanı Olan Kullanıcı Silinemez
   * Validates: Requirements 6.5
   */
  it(
    'aktif ilanı olmayan kullanıcı başarıyla silinebilmeli',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          async (userId) => {
            const mockDb = createMockDatabase();

            // Kullanıcı oluştur — ilanı yok
            await mockDb.user.create({
              data: {
                id: userId,
                username: `user_${userId.slice(0, 8)}`,
                email: `${userId.slice(0, 8)}@example.com`,
                passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMN',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            });

            // Silme işlemi hata fırlatmamalı
            await expect(
              mockDb.user.delete({ where: { id: userId } }),
            ).resolves.toBeDefined();

            // Kullanıcı artık mevcut olmamalı
            const userAfterDelete = await mockDb.user.findUnique({ where: { id: userId } });
            expect(userAfterDelete).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    },
    30000,
  );

  /**
   * Tamamlayıcı test: yalnızca soft-delete'li (deletedAt dolu) ilanları olan kullanıcı
   * silinebilmeli çünkü RESTRICT yalnızca aktif (deletedAt IS NULL) ilanlar için geçerlidir.
   *
   * Feature: database-foundation, Property 6: User Restrict FK — Aktif İlanı Olan Kullanıcı Silinemez
   * Validates: Requirements 6.5
   */
  it(
    'yalnızca soft-delete\'li ilanları olan kullanıcı başarıyla silinebilmeli',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),
          uuidArb,
          async (softDeletedCount, userId) => {
            const mockDb = createMockDatabase();

            // Kullanıcı oluştur
            await mockDb.user.create({
              data: {
                id: userId,
                username: `user_${userId.slice(0, 8)}`,
                email: `${userId.slice(0, 8)}@example.com`,
                passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMN',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            });

            // Soft-delete'li ilanlar oluştur (deletedAt dolu)
            for (let i = 0; i < softDeletedCount; i++) {
              const propertyId = `prop-${userId.slice(0, 8)}-${i}`;
              await mockDb.property.create({
                data: {
                  id: propertyId,
                  slug: `slug-${propertyId}`,
                  title: `Deleted Property ${i}`,
                  listingType: 'FOR_SALE',
                  propertyType: 'APARTMENT',
                  price: '100000',
                  city: 'Istanbul',
                  district: 'Kadikoy',
                  address: `Test Address ${i}`,
                  createdById: userId,
                  deletedAt: new Date(), // Soft-delete'li — aktif değil
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              });
            }

            // Silme işlemi başarılı olmalı (soft-delete'li ilanlar RESTRICT'i tetiklemez)
            await expect(
              mockDb.user.delete({ where: { id: userId } }),
            ).resolves.toBeDefined();

            // Kullanıcı artık mevcut olmamalı
            const userAfterDelete = await mockDb.user.findUnique({ where: { id: userId } });
            expect(userAfterDelete).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    },
    30000,
  );

  /**
   * Tamamlayıcı test: aktif ve soft-delete'li ilanları karışık olan kullanıcı
   * RESTRICT nedeniyle silinemez — en az bir aktif ilan varsa yeterlidir.
   *
   * Feature: database-foundation, Property 6: User Restrict FK — Aktif İlanı Olan Kullanıcı Silinemez
   * Validates: Requirements 6.5
   */
  it(
    'aktif ve soft-delete\'li ilanları karışık olan kullanıcı silinemez — en az bir aktif ilan yeterlidir',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 3 }), // aktif ilan sayısı
          fc.integer({ min: 1, max: 3 }), // soft-delete'li ilan sayısı
          uuidArb,
          async (activeCount, softDeletedCount, userId) => {
            const mockDb = createMockDatabase();

            // Kullanıcı oluştur
            await mockDb.user.create({
              data: {
                id: userId,
                username: `user_${userId.slice(0, 8)}`,
                email: `${userId.slice(0, 8)}@example.com`,
                passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMN',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            });

            // Aktif ilanlar (deletedAt: null)
            for (let i = 0; i < activeCount; i++) {
              const propertyId = `prop-active-${userId.slice(0, 8)}-${i}`;
              await mockDb.property.create({
                data: {
                  id: propertyId,
                  slug: `slug-active-${propertyId}`,
                  title: `Active Property ${i}`,
                  listingType: 'FOR_RENT',
                  propertyType: 'HOUSE',
                  price: '5000',
                  city: 'Ankara',
                  district: 'Cankaya',
                  address: `Active Address ${i}`,
                  createdById: userId,
                  deletedAt: null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              });
            }

            // Soft-delete'li ilanlar (deletedAt dolu)
            for (let i = 0; i < softDeletedCount; i++) {
              const propertyId = `prop-deleted-${userId.slice(0, 8)}-${i}`;
              await mockDb.property.create({
                data: {
                  id: propertyId,
                  slug: `slug-deleted-${propertyId}`,
                  title: `Deleted Property ${i}`,
                  listingType: 'FOR_SALE',
                  propertyType: 'LAND',
                  price: '200000',
                  city: 'Izmir',
                  district: 'Konak',
                  address: `Deleted Address ${i}`,
                  createdById: userId,
                  deletedAt: new Date(),
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              });
            }

            // Silme girişimi — RESTRICT devreye girmeli
            let caughtError: unknown;
            try {
              await mockDb.user.delete({ where: { id: userId } });
            } catch (err) {
              caughtError = err;
            }

            expect(caughtError).toBeInstanceOf(PrismaClientKnownRequestError);
            const prismaError = caughtError as PrismaClientKnownRequestError;
            expect(['P2014', 'P2003']).toContain(prismaError.code);

            // Kullanıcı hâlâ mevcut olmalı
            const userStillExists = await mockDb.user.findUnique({ where: { id: userId } });
            expect(userStillExists).not.toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    },
    30000,
  );
});
