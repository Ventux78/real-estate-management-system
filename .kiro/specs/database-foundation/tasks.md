# Implementation Plan: database-foundation

## Overview

Bu plan, Sprint 2 veritabanı katmanını yedi aşamada hayata geçirir: Prisma kurulumu, şema tanımı, PrismaClient singleton, migration, seed scripti, test dosyaları ve doğrulama. Mevcut Express + TypeScript altyapısı değiştirilmez; yalnızca genişletilir.

Tüm kod TypeScript ile yazılır. Property-based testler `fast-check` kullanır (zaten `devDependencies`'te mevcut).

---

## Tasks

- [x] 1. Prisma kurulumu ve proje yapılandırması
  - `@prisma/client` ve `prisma` paketlerini ekle
  - `package.json`'a `prisma db seed` konfigürasyonu ve `db:generate`, `db:migrate`, `db:seed`, `db:studio` scriptlerini ekle
  - `tsconfig.json`'a `@/lib/*` path alias'ını ekle
  - `.env` ve `.env.example` dosyalarına `DATABASE_URL` satırını ekle
  - `src/generated/prisma-client/` dizinini `.gitignore`'a ekle
  - `src/config/env.ts`'de `DATABASE_URL` alanını `z.string()` (zorunlu) olarak güncelle
  - _Requirements: 1.1, 1.2, 1.5_

- [x] 2. Prisma şeması
  - [x] 2.1 Generator ve datasource bloklarını yaz
    - `prisma/schema.prisma` dosyasını oluştur
    - `datasource db` → provider: `postgresql`, url: `env("DATABASE_URL")`
    - `generator client` → provider: `prisma-client-js`, output: `"./src/generated/prisma-client"`
    - _Requirements: 1.1, 1.2_

  - [x] 2.2 Enum tanımlarını yaz
    - `ListingType`, `PropertyType`, `HeatingType`, `DeedStatus` enum'larını ekle
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 2.3 User modelini yaz
    - `id`, `username`, `email`, `passwordHash`, `isActive`, `createdAt`, `updatedAt` alanlarını tanımla
    - `@unique` kısıtlarını ekle; `properties` relation field'ını tanımla
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.4 Property modelini yaz
    - Zorunlu kimlik, fiyat ve konum alanlarını tanımla
    - Opsiyonel fiziksel özellik alanlarını ekle
    - Boolean özellik alanlarını varsayılan değerleriyle ekle
    - `createdAt`, `updatedAt`, `deletedAt`, `createdById` alanlarını ekle
    - `@@index` ve composite index direktiflerini ekle
    - `createdBy User` ve `images PropertyImage[]` relation field'larını ekle
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.1–7.10_

  - [x] 2.5 PropertyImage modelini yaz
    - `id`, `propertyId`, `imageUrl`, `publicId`, `displayOrder`, `isCover`, `createdAt` alanlarını tanımla
    - `@@unique([propertyId, displayOrder])` composite unique kısıtını ekle
    - `property Property` relation field'ını `onDelete: Cascade` ile ekle
    - _Requirements: 5.1, 5.2, 6.2, 6.4_

- [x] 3. İlk migration oluşturma
  - `npx prisma migrate dev --name init` komutunu çalıştır
  - Oluşturulan migration SQL dosyasını doğrula
  - Migration dosyasına `PropertyImage_propertyId_isCover_key` partial unique index için ham SQL adımını ekle:
    ```sql
    CREATE UNIQUE INDEX "PropertyImage_propertyId_isCover_key"
    ON "PropertyImage"("propertyId")
    WHERE "isCover" = true;
    ```
  - `npx prisma generate` ile client kodunu üret
  - _Requirements: 1.3, 1.4, 5.3_

- [x] 4. PrismaClient singleton
  - `src/lib/prisma.ts` dosyasını oluştur
  - `NODE_ENV === 'development'` iken `global.__prisma` kullan; diğer ortamlarda modül kapsamında tut
  - SIGTERM ve SIGINT sinyallerinde `prisma.$disconnect()` çağır; hata sessizce yutulmamalı
  - `prisma.$disconnect()` başarısız olursa `console.error` ile logla ve `process.exit(1)` yap
  - `export const prisma` ile singleton'ı dışa aktar
  - `tsconfig.json` `paths` alanına `"@/lib/*": ["src/lib/*"]` ekle (henüz eklenmemişse)
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 5. Checkpoint — Temel altyapı hazır
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Seed scripti
  - [x] 6.1 `prisma/seed.ts` dosyasını yaz
    - `prisma` client'ını import et
    - 1 admin `User` kaydını `upsert` stratejisiyle oluştur (`where: { email }`)
    - 2 `Property` kaydını `upsert` stratejisiyle oluştur (biri `FOR_SALE`, biri `FOR_RENT`); `where: { slug }`
    - Her ilan için en az 1 `PropertyImage` kaydını `upsert` stratejisiyle oluştur
    - Başarı durumunda oluşturulan kayıt sayısını konsola yaz
    - Hata durumunda `console.error` ile logla ve `process.exit(1)` yap
    - `finally` bloğunda `prisma.$disconnect()` çağır
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [-] 6.2 Property 7 için property testi yaz — Seed İdempotency
    - **Property 7: Seed İdempotency**
    - **Validates: Requirements 10.4**
    - `seed()` fonksiyonunu 3 kez arka arkaya çalıştır
    - Her çalıştırma sonrası `User`, `Property`, `PropertyImage` sayılarının sabit kaldığını doğrula
    - Test dosyası: `tests/unit/database/seed.test.ts`

- [x] 7. Unit testler — PrismaClient singleton
  - [x] 7.1 Singleton davranış testlerini yaz
    - `tests/unit/lib/prisma.test.ts` dosyasını oluştur
    - `NODE_ENV=development` ortamında aynı örneğin döndürüldüğünü doğrula
    - `NODE_ENV=production` ortamında global'e bağlanmadığını doğrula
    - SIGTERM / SIGINT handler'larının `$disconnect()` çağırdığını doğrula
    - `$disconnect()` hata fırlattığında `console.error` çağrıldığını ve `process.exit(1)` yapıldığını doğrula
    - _Requirements: 9.1, 9.2, 9.3, 9.5, 9.6_

- [ ] 8. Property-based testler — Veritabanı kısıtları
  - [-] 8.1 Property 1 için property testi yaz — User Email Unique (Case-Insensitive)
    - **Property 1: User E-posta Unique Kısıtı (Case-Insensitive)**
    - **Validates: Requirements 2.2, 2.4**
    - `fc.emailAddress()` arbitrary ile email üret; `toUpperCase()` varyantıyla ikinci kayıt dene
    - İkinci insert'in `PrismaClientKnownRequestError` (P2002) fırlattığını doğrula
    - `numRuns: 100` ile çalıştır
    - Test dosyası: `tests/unit/database/user-constraints.test.ts`

  - [-] 8.2 Property 2 için property testi yaz — User Username Unique
    - **Property 2: User Kullanıcı Adı Unique Kısıtı**
    - **Validates: Requirements 2.3, 2.5**
    - `fc.string({ minLength: 1, maxLength: 50 })` arbitrary ile username üret
    - Aynı username ile iki kayıt deneyince P2002 fırlattığını doğrula
    - `numRuns: 100` ile çalıştır
    - Test dosyası: `tests/unit/database/user-constraints.test.ts`

  - [-] 8.3 Property 3 için property testi yaz — Property Soft-Delete Lifecycle
    - **Property 3: Property Soft-Delete Lifecycle**
    - **Validates: Requirements 4.7, 8.2, 8.3, 8.4**
    - Geçerli `Property` field değerleri ile arbitrary oluştur
    - (a) Soft-delete sonrası `deletedAt !== null` ve fiziksel kayıt var
    - (b) `deletedAt IS NULL` filtreli sorgu bu kaydı döndürmüyor
    - (c) Restore sonrası kayıt tekrar görünür
    - `numRuns: 100` ile çalıştır
    - Test dosyası: `tests/unit/database/property-softdelete.test.ts`

  - [-] 8.4 Property 4 için property testi yaz — PropertyImage Composite Unique DisplayOrder
    - **Property 4: PropertyImage Composite Unique — DisplayOrder**
    - **Validates: Requirements 5.2**
    - `fc.integer()` ile `displayOrder` üret; aynı `(propertyId, displayOrder)` çiftiyle iki insert dene
    - İkincisinin P2002 fırlattığını doğrula; farklı `displayOrder`'ların kabul edildiğini doğrula
    - `numRuns: 100` ile çalıştır
    - Test dosyası: `tests/unit/database/property-image.test.ts`

  - [-] 8.5 Property 5 için property testi yaz — PropertyImage Cascade Delete
    - **Property 5: PropertyImage Cascade Delete**
    - **Validates: Requirements 5.4, 5.5, 6.4**
    - `fc.integer({ min: 1, max: 10 })` ile image sayısı üret
    - N image'a sahip `Property` oluştur → `Property`'yi hard-delete yap
    - `PropertyImage` count'unun 0 olduğunu doğrula
    - `numRuns: 100` ile çalıştır
    - Test dosyası: `tests/unit/database/property-image.test.ts`

  - [x] 8.6 Property 6 için property testi yaz — User Restrict FK
    - **Property 6: User Restrict FK — Aktif İlanı Olan Kullanıcı Silinemez**
    - **Validates: Requirements 6.5**
    - `fc.integer({ min: 1, max: 5 })` ile aktif ilan sayısı üret
    - N aktif ilanı (`deletedAt IS NULL`) olan `User` oluştur → `User`'ı silmeyi dene
    - `PrismaClientKnownRequestError` (P2014 veya P2003) fırlattığını doğrula
    - Hem `User` hem `Property` kayıtlarının hâlâ mevcut olduğunu doğrula
    - `numRuns: 100` ile çalıştır
    - Test dosyası: `tests/unit/database/relations.test.ts`

  - [-] 8.7 Property 8 için property testi yaz — PropertyImage isCover Partial Unique
    - **Property 8: PropertyImage Kapak Fotoğrafı Uniqueness**
    - **Validates: Requirements 5.3**
    - Aynı `Property` için `isCover=true` olan iki `PropertyImage` oluşturmayı dene
    - İkincisinin P2002 fırlattığını doğrula
    - `numRuns: 100` ile çalıştır
    - Test dosyası: `tests/unit/database/property-image.test.ts`

- [x] 9. Integration testi — Veritabanı bağlantısı
  - [x] 9.1 Bağlantı doğrulama testlerini yaz
    - `tests/integration/database.test.ts` dosyasını oluştur
    - `beforeAll` içinde `prisma.$connect()` çağır
    - `afterAll` içinde `prisma.$disconnect()` çağır
    - `prisma.$connect()` başarıyla tamamlandığında testi geçmiş işaretle
    - `prisma.$queryRaw\`SELECT 1\`` sorgusu çalıştır ve yanıt doğrula
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 10. Final checkpoint — Tüm testler ve derleme
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- `*` ile işaretli görevler opsiyoneldir; daha hızlı MVP için atlanabilir
- Her görev, ilgili gereksinimlere izlenebilirlik için referans içerir
- Property testleri `fast-check` kullanır (zaten `devDependencies`'te mevcut); her test `numRuns: 100` ile çalıştırılır
- Integration testleri (`tests/integration/database.test.ts`) gerçek PostgreSQL bağlantısı gerektirir; CI ortamında PostgreSQL servisi sağlanmalıdır
- Property-based testler mock PrismaClient ile de çalıştırılabilir; gerçek veritabanı gerekmez
- `src/generated/prisma-client/` dizini `.gitignore`'a eklenmeli; her ortamda `prisma generate` ile üretilir
- Partial unique index (`isCover`) Prisma şeması ile desteklenemez; migration dosyasına ham SQL adımı eklenir (Görev 3)
- `DATABASE_URL` `env.ts`'de Sprint 2'den itibaren zorunlu (`z.string()`) hale getirilir; Sprint 1'deki opsiyonel tanım güncellenir

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["2.2", "2.3"] },
    { "id": 2, "tasks": ["2.4", "2.5"] },
    { "id": 3, "tasks": ["6.1", "7.1", "9.1"] },
    { "id": 4, "tasks": ["6.2", "8.1", "8.2", "8.3", "8.4", "8.5", "8.6", "8.7"] }
  ]
}
```
