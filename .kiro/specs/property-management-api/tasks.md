# Implementation Plan: Property Management API

## Overview

`auth` modülünün katmanlı mimarisini (Repository → Service → Controller) referans alarak `src/modules/property/` klasörü altında tam CRUD + yayın yönetimi sağlayan bir REST API. Uygulama sırası: tür tanımları → doğrulama şemaları → slug yardımcısı → repository → service → controller → routes → entegrasyon.

---

## Tasks

- [x] 1. Modül iskeletini ve TypeScript tip tanımlarını oluştur
  - [x] 1.1 `src/modules/property/` dizin yapısını ve boş dosyaları oluştur
    - `property.types.ts`, `property.validation.ts`, `property.repository.ts`, `property.service.ts`, `property.controller.ts`, `property.routes.ts`, `index.ts` ve `utils/slugUtils.ts` dosyalarını oluştur
    - `tests/unit/property/` ve `tests/integration/property/` dizinlerini hazırla
    - _Requirements: 1.1, 2.1, 8.1_

  - [x] 1.2 `property.types.ts` içinde `PropertyDto`, `PropertyImageDto` ve `PaginatedPropertyResult` arayüzlerini yaz
    - `PropertyDto`: tüm Property model alanlarını (Prisma Decimal/Date → number/string dönüşümü dahil) içerir; `images: PropertyImageDto[]` barındırır
    - `PaginatedPropertyResult`: `{ data: PropertyDto[]; pagination: { page, limit, total, pages } }` formatında
    - `CreatePropertyDto` ve `UpdatePropertyDto` için Zod inference placeholder'larını ekle
    - _Requirements: 1.1, 2.2, 3.1_

- [x] 2. Zod doğrulama şemalarını yaz
  - [x] 2.1 `property.validation.ts` içinde dört Zod şemasını implement et
    - `createPropertySchema`: zorunlu alanlar (`title` 1–200 karakter, `listingType`, `propertyType`, `price > 0`, `city`, `district`, `address`) + opsiyonel Property alanları
    - `updatePropertySchema`: `createPropertySchema.partial()` + en az bir alan zorunluluğu (`.refine(Object.keys(data).length > 0)`)
    - `paginationSchema`: `page`, `limit`, `sortBy`, `sortOrder` varsayılan değerleriyle; filtre alanları; `minimumPrice > maximumPrice` refinement
    - `idParamSchema`: RFC 4122 UUID doğrulaması
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 2.2 Property-based test: `createPropertySchema` ve `updatePropertySchema` şema bütünlüğünü doğrula
    - **Property 12: Validation Schema Completeness** — geçerli `CreatePropertyDto` nesneleri her zaman parse edilmeli, zorunlu alan eksik/kural dışı değer içerenler `ZodError` fırlatmalı
    - **Property 13: UpdatePropertySchema Minimum Fields** — boş `{}` nesnesi `ZodError` fırlatmalı, en az bir geçerli alan içeren nesne başarılı olmalı
    - **Validates: Requirements 8.1, 8.2, 8.5**
    - Dosya: `tests/unit/property/property.validation.test.ts`

- [x] 3. Slug yardımcısını implement et
  - [x] 3.1 `utils/slugUtils.ts` içinde `generateSlug(title: string): string` saf fonksiyonunu yaz
    - Türkçe karakter haritasını uygula: `ş→s, Ş→s, ı→i, İ→i, ğ→g, Ğ→g, ü→u, Ü→u, ö→o, Ö→o, ç→c, Ç→c`
    - Küçük harfe çevir → `[^a-z0-9\s-]` karakterleri sil → boşlukları `-` ile değiştir → ardışık tireleri tekil yap → baş/son tireleri sil
    - _Requirements: 1.4_

  - [x] 3.2 Property-based test: `generateSlug` format invariantını doğrula
    - **Property 1: Slug Format Invariant** — herhangi bir boş olmayan string için üretilen slug yalnızca `[a-z0-9-]` içermeli, baş/son tire olmamalı, ardışık tire bulunmamalı
    - **Validates: Requirements 1.4**
    - Dosya: `tests/unit/property/slugUtils.test.ts`

  - [x] 3.3 `utils/slugUtils.ts` içinde `generateUniqueSlug(title, findBySlug, excludeId?)` async fonksiyonunu yaz
    - Base slug oluştur → `findBySlug` ile çakışma kontrol et → çakışmada `-2`...`-10` suffix'leriyle yeniden dene → 10 denemede çözülemezse `AppError(409, 'SLUG_CONFLICT')` fırlat
    - _Requirements: 1.5, 9.5_

  - [x] 3.4 Property-based test: `generateUniqueSlug` yakınsama garantisini doğrula
    - **Property 2: Slug Uniqueness Convergence** — N ∈ [0..9] çakışan slug için N+1. denemede başarılı slug üretilmeli; N=10 olduğunda `SLUG_CONFLICT` hatası fırlatılmalı
    - **Validates: Requirements 1.5, 9.5**
    - Dosya: `tests/unit/property/slugUtils.test.ts`

- [x] 4. Checkpoint — Birim testlerini çalıştır
  - Ensure all unit tests pass, ask the user if questions arise.

- [x] 5. Repository katmanını implement et
  - [x] 5.1 `property.repository.ts` içinde tüm Prisma sorgularını yaz
    - `create(data)`: `images` ilişkisini include ederek oluştur
    - `findMany(params)`: `where: { deletedAt: null, ...filters }` + `prisma.$transaction([findMany, count])` ile veri + toplam sayı döndür; `price` alanı `minimumPrice`/`maximumPrice` için Prisma `gte`/`lte` ile fil­trelenecek
    - `findById(id)`: `deletedAt: null` filtreli, `images` include edilmiş tekil sorgu
    - `update(id, data)`: `images` include ile güncelle
    - `softDelete(id)`: `deletedAt: new Date()` ile güncelle
    - `findBySlug(slug)`: benzersizlik kontrolü için tekil sorgu (soft-deleted dahil)
    - _Requirements: 1.1, 2.1, 2.5, 2.6, 3.1, 5.1, 5.4_

- [x] 6. Service katmanını implement et
  - [x] 6.1 `property.service.ts` içinde `createProperty(dto, userId)` metodunu implement et
    - `userId` ile kullanıcı varlığını doğrula (`USER_NOT_FOUND` → 404)
    - `generateUniqueSlug` ile slug üret
    - `isPublished: false` (default) ile `propertyRepository.create()` çağır
    - Başarı log kaydı (`console.info` veya `logger`) ekle
    - _Requirements: 1.1, 1.6, 1.7, 1.8_

  - [x] 6.2 `property.service.ts` içinde `listProperties(query)` metodunu implement et
    - `propertyRepository.findMany()` çağır
    - `pages = Math.ceil(total / limit)` hesapla
    - `PaginatedPropertyResult` formatında döndür
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 2.7_

  - [x] 6.3 `property.service.ts` içinde `getPropertyById(id)` metodunu implement et
    - `propertyRepository.findById()` çağır; null dönerse `AppError(404, 'PROPERTY_NOT_FOUND')` fırlat
    - _Requirements: 3.1, 3.2_

  - [x] 6.4 `property.service.ts` içinde `updateProperty(id, dto)` metodunu implement et
    - İlanı bul (`PROPERTY_NOT_FOUND` → 404); `title` varsa `generateUniqueSlug` çağır
    - `propertyRepository.update()` ile kaydet; başarı log kaydı ekle
    - _Requirements: 4.1, 4.3, 4.5, 4.6_

  - [x] 6.5 `property.service.ts` içinde `softDeleteProperty(id)` ve `publishProperty(id)` / `unpublishProperty(id)` metodlarını implement et
    - `softDelete`: ilan kontrol → `propertyRepository.softDelete()` → log kaydı
    - `publish`: ilan kontrol → `isPublished: true` ile update → log kaydı (idempotent)
    - `unpublish`: ilan kontrol → `isPublished: false` ile update → log kaydı (idempotent)
    - _Requirements: 5.1, 5.3, 5.5, 6.1, 6.3, 6.4, 7.1, 7.3, 7.5_

- [x] 7. Controller ve Routes katmanını implement et
  - [x] 7.1 `property.controller.ts` içinde tüm handler'ları yaz
    - Her handler: `schema.parse(req.body | req.query | req.params)` → `propertyService.method()` → `SuccessResponse<T>` formatında yanıt
    - `create`: `createPropertySchema.parse(req.body)` + `req.user!.id` → 201
    - `list`: `paginationSchema.parse(req.query)` → 200
    - `getById`: `idParamSchema.parse(req.params)` → 200
    - `update`: `idParamSchema` + `updatePropertySchema` → 200
    - `softDelete`: `idParamSchema` → 200
    - `publish` / `unpublish`: `idParamSchema` → 200
    - _Requirements: 1.1, 1.2, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 9.1_

  - [x] 7.2 `property.routes.ts` ve `index.ts` dosyalarını tamamla; `routes/index.ts`'e `/properties` prefix ile mount et
    - Public: `GET /`, `GET /:id`
    - Protected (`authenticate`): `POST /`, `PUT /:id`, `DELETE /:id`, `PATCH /:id/publish`, `PATCH /:id/unpublish`
    - _Requirements: 1.2, 2.1, 4.2, 5.2, 6.2, 7.2_

- [x] 8. Checkpoint — Derleme ve lint kontrolü
  - Ensure TypeScript compilation (`npm run type-check`) and lint (`npm run lint`) pass with no errors, ask the user if questions arise.

- [x] 9. Entegrasyon testlerini yaz
  - [x] 9.1 `tests/integration/property/createProperty.test.ts` dosyasını oluştur
    - (a) Geçerli token + body → HTTP 201, `PropertyDto` format doğrulaması, `isPublished=false`
    - (b) Geçersiz/eksik token → HTTP 401
    - (c) Eksik zorunlu alan → HTTP 400 + `details` alanı kontrolü
    - **Property 3: New Property isPublished Default** — geçerli herhangi bir oluşturma verisinde `isPublished` `false` olmalı
    - **Validates: Requirements 10.1, 1.7**

  - [x] 9.2 `tests/integration/property/listProperties.test.ts` dosyasını oluştur
    - (a) Varsayılan pagination → `{ page:1, limit:10, total, pages }` format
    - (b) `city` filtresi → yalnızca eşleşen ilanlar
    - (c) `isPublished=true` filtresi
    - (d) `sortBy=price&sortOrder=asc` → ardışık çift kontrolü
    - (e) Soft-deleted ilanlar listede görünmez
    - **Property 5: Pagination Formula Invariant** — `pages === Math.ceil(total / limit)` her koşulda
    - **Property 6: Filter Correctness** — dönen her ilan filtre koşullarını karşılamalı
    - **Property 7: Sort Order Invariant** — ardışık `(a[i], a[i+1])` çiftlerinde sıralama invariantı
    - **Property 4: Soft-Delete Exclusion Invariant** — `deletedAt` non-null olan ilanlar listelenmemeli
    - **Validates: Requirements 10.2, 2.1–2.7**

  - [x] 9.3 `tests/integration/property/getProperty.test.ts` dosyasını oluştur
    - (a) Mevcut ilan → HTTP 200, tam `PropertyDto`
    - (b) Soft-deleted ilan → HTTP 404
    - (c) Var olmayan UUID → HTTP 404
    - (d) Geçersiz UUID formatı → HTTP 400
    - **Property 8: Get-After-Create Consistency** — oluşturulan ilan ID'siyle sorgulandığında tüm zorunlu alanlar aynı değerle dönmeli
    - **Property 4: Soft-Delete Exclusion Invariant** — soft-deleted ilan `GET /:id` ile erişilememeli
    - **Validates: Requirements 10.3, 3.1–3.4**

  - [x] 9.4 `tests/integration/property/updateProperty.test.ts` dosyasını oluştur
    - (a) Kısmi güncelleme → yalnızca gönderilen alanlar değişti
    - (b) `title` güncelleme → yeni slug türetildi (`generateSlug` çıktısı ile tutarlı)
    - (c) Yetkisiz erişim → HTTP 401
    - (d) Var olmayan ilan → HTTP 404
    - **Property 9: Partial Update Isolation** — gönderilmeyen alanlar değişmemeli
    - **Property 10: Title-to-Slug Derivation on Update** — yeni slug, yeni title'dan `generateSlug` uygulanarak üretilmiş değerle tutarlı olmalı
    - **Validates: Requirements 10.4, 4.1–4.6**

  - [x] 9.5 `tests/integration/property/deleteProperty.test.ts` dosyasını oluştur
    - (a) Soft-delete sonrası `GET /properties` listesinde görünmez
    - (b) Soft-deleted ilanı tekrar silmeye çalışınca HTTP 404
    - (c) Yetkisiz erişim → HTTP 401
    - **Property 4: Soft-Delete Exclusion Invariant** — soft-delete sonrası list ve detail sorgularında ilan görünmemeli
    - **Validates: Requirements 10.5, 5.1–5.5**

  - [x] 9.6 `tests/integration/property/publishUnpublish.test.ts` dosyasını oluştur
    - (a) `publish` → `isPublished=true`
    - (b) `unpublish` → `isPublished=false`
    - (c) Idempotency: zaten publish olan ilanı tekrar publish → HTTP 200, `isPublished=true`
    - (d) Yetkisiz erişim → HTTP 401
    - **Property 11: Publish/Unpublish Idempotency** — N kez publish → `isPublished=true`; N kez unpublish → `isPublished=false`
    - **Validates: Requirements 10.6, 6.1–6.4, 7.1–7.5**

- [x] 10. Final Checkpoint — Tüm testleri çalıştır
  - Ensure all unit and integration tests pass (`npm test`), ask the user if questions arise.

---

## Notes

- `*` ile işaretli alt görevler isteğe bağlıdır; MVP için atlanabilir
- Her görev gereksinimlere traceability için referanslar içerir
- Property-based testler `fast-check` (mevcut `devDependencies`) ile yazılır; minimum 100 iterasyon (`numRuns: 100`)
- Her property test dosyasında yorum formatı: `// Feature: property-management-api, Property N: <kısa açıklama>`
- Entegrasyon testleri test veritabanı gerektirir (`.env.test`); `beforeEach` ile veri temizliği, `supertest` ile HTTP istekleri
- `jest --runInBand` zaten `package.json`'da tanımlı — seri çalıştırma için ek yapılandırma gerekmez

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1", "3.1"] },
    { "id": 3, "tasks": ["2.2", "3.2", "3.3"] },
    { "id": 4, "tasks": ["3.4", "5.1"] },
    { "id": 5, "tasks": ["6.1", "6.2", "6.3"] },
    { "id": 6, "tasks": ["6.4", "6.5"] },
    { "id": 7, "tasks": ["7.1"] },
    { "id": 8, "tasks": ["7.2"] },
    { "id": 9, "tasks": ["9.1", "9.2", "9.3", "9.4", "9.5", "9.6"] }
  ]
}
```
