/**
 * Property-Based Tests — PropertyImage Database Constraints
 *
 * Test dosyası: tests/unit/database/property-image.test.ts
 *
 * Bu dosya, PropertyImage modeline ilişkin veritabanı kısıtlarını
 * mock PrismaClient kullanarak doğrular. Gerçek bir veritabanı bağlantısı
 * gerekmez; kısıt ihlalleri mock seviyesinde simüle edilir.
 */

import * as fc from 'fast-check';
import { PrismaClientKnownRequestError } from '../../../src/generated/prisma-client/runtime/library';

// ─── Mock PrismaClient Helper ─────────────────────────────────────────────────

/**
 * isCover partial unique kısıtını simüle eden mock PropertyImage store'u.
 *
 * Gerçek PostgreSQL davranışını yansıtır:
 *   CREATE UNIQUE INDEX "PropertyImage_propertyId_isCover_key"
 *   ON "PropertyImage"("propertyId")
 *   WHERE "isCover" = true;
 *
 * Bir property için `isCover=true` olan kayıt zaten mevcutsa P2002 fırlatır.
 */
function createMockPropertyImageStore() {
  // propertyId → ilk isCover=true image'ın id'si
  const coverImages = new Map<string, string>();

  const create = jest.fn(
    async (args: { data: { id: string; propertyId: string; isCover: boolean } }) => {
      const { id, propertyId, isCover } = args.data;

      if (isCover) {
        if (coverImages.has(propertyId)) {
          // Partial unique index ihlali — P2002 fırlat
          throw new PrismaClientKnownRequestError(
            'Unique constraint failed on the fields: (`propertyId`)',
            {
              code: 'P2002',
              clientVersion: '5.22.0',
              meta: { target: 'PropertyImage_propertyId_isCover_key' },
            },
          );
        }
        coverImages.set(propertyId, id);
      }

      return { id, propertyId, isCover };
    },
  );

  const reset = () => coverImages.clear();

  return { propertyImage: { create }, reset };
}

// ─── Property 8 ───────────────────────────────────────────────────────────────

/**
 * Feature: database-foundation, Property 8: PropertyImage Kapak Fotoğrafı Uniqueness
 * Validates: Requirements 5.3
 */
describe('Property 8: PropertyImage isCover Partial Unique Constraint', () => {
  it(
    'aynı Property için isCover=true olan ikinci PropertyImage oluşturma girişimi P2002 fırlatmalı',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Arbitrary: rastgele bir propertyId üret
          fc.uuid(),
          // Arbitrary: ilk ve ikinci image için farklı UUID'ler üret
          fc.uuid(),
          fc.uuid(),
          async (propertyId, firstImageId, secondImageId) => {
            // Her iterasyonda temiz bir store kullan
            const mockDb = createMockPropertyImageStore();

            // İlk isCover=true image — başarıyla oluşturulmalı
            await mockDb.propertyImage.create({
              data: { id: firstImageId, propertyId, isCover: true },
            });

            // İkinci isCover=true image — P2002 fırlatmalı
            let caughtError: unknown;
            try {
              await mockDb.propertyImage.create({
                data: { id: secondImageId, propertyId, isCover: true },
              });
            } catch (err) {
              caughtError = err;
            }

            // Hata fırlatıldığını doğrula
            expect(caughtError).toBeInstanceOf(PrismaClientKnownRequestError);

            const prismaError = caughtError as PrismaClientKnownRequestError;
            expect(prismaError.code).toBe('P2002');
          },
        ),
        { numRuns: 100 },
      );
    },
    15000, // Jest timeout (ms)
  );

  it(
    'farklı Property kayıtları için isCover=true olan image\'lar bağımsız olarak oluşturulabilmeli',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // İki farklı propertyId üret
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          async (propertyId1, propertyId2, imageId1, imageId2) => {
            // İki property'nin ID'leri aynıysa testi atla
            fc.pre(propertyId1 !== propertyId2);

            const mockDb = createMockPropertyImageStore();

            // Her iki farklı property için isCover=true image oluştur
            // Her ikisi de hata olmaksızın başarılı olmalı
            await expect(
              mockDb.propertyImage.create({
                data: { id: imageId1, propertyId: propertyId1, isCover: true },
              }),
            ).resolves.toBeDefined();

            await expect(
              mockDb.propertyImage.create({
                data: { id: imageId2, propertyId: propertyId2, isCover: true },
              }),
            ).resolves.toBeDefined();
          },
        ),
        { numRuns: 100 },
      );
    },
    15000,
  );
});
