# Design Document — Property Management API

## Overview

Bu belge, gayrimenkul yönetim sisteminin **Property Management API** (Sprint 4) modülünün teknik tasarımını tanımlar. Mevcut `auth` modülünün katmanlı mimarisini (Repository → Service → Controller) referans alarak `modules/property/` klasörü altında tam CRUD + yayın yönetimi sağlayan bir REST API geliştirilecektir.

### Amaç

Kimliği doğrulanmış kullanıcıların gayrimenkul ilanı oluşturabilmesini, güncelleyebilmesini, soft-delete yapabilmesini, yayına alıp kaldırabilmesini; herkese açık listeleme ve detay sorgularının ise kimlik doğrulaması gerektirmeden çalışmasını sağlamak.

### Temel Tasarım Kararları

- **`auth` modülü referans alınır.** Aynı `Repository → Service → Controller` katmanlaması uygulanır; Prisma doğrudan controller veya service katmanına eklenmez, repository katmanından geçer.
- **Slug üretimi saf fonksiyon olarak implement edilir.** Türkçe karakter normalleştirilmesi + benzersizlik kontrolü `slugUtils.ts` yardımcı dosyasında toplanır; böylece bağımsız olarak test edilebilir.
- **Soft-delete tüm sorgularda otomatik filtrelenir.** Repository metodları `deletedAt: null` koşulunu implicitly uygular; service katmanı bu detayı yönetmez.
- **Zod şemaları `property.validation.ts`'te merkezilenir.** Global `errorHandler` ZodError'ı otomatik olarak 400 VALIDATION_ERROR'a dönüştürdüğünden controller'da try/catch gerekmez.
- **fast-check zaten kurulu (`devDependencies`).** Property-based testler için ek bağımlılık gerekmez.

---

## Architecture

Sistem mevcut Express + TypeScript + Prisma + PostgreSQL altyapısı üzerine kuruludur. Property modülü bu altyapıya şu katmanla entegre olur:

```
HTTP Request
     │
     ▼
┌─────────────────────────────────────────┐
│  authenticate middleware (JWT doğrulama) │  ← auth modülünden yeniden kullanılır
│  (korunan route'larda)                  │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│  property.validation.ts (Zod şemaları)  │  ← Controller inline validate eder
│  CreatePropertySchema                   │
│  UpdatePropertySchema                   │
│  PaginationSchema                       │
│  IdParamSchema                          │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│  property.controller.ts                 │  ← HTTP katmanı
│  PropertyController                     │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│  property.service.ts                    │  ← Business logic
│  PropertyService                        │
│  + slugUtils.ts (yardımcı)              │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│  property.repository.ts                 │  ← Veritabanı katmanı
│  PropertyRepository                     │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│  Prisma Client (src/lib/prisma.ts)      │  ← PostgreSQL
└─────────────────────────────────────────┘
```

### Dizin Yapısı

```
src/
└── modules/
    └── property/
        ├── index.ts                  # Public exports
        ├── property.routes.ts        # Express Router tanımları
        ├── property.controller.ts    # HTTP katmanı
        ├── property.service.ts       # Business logic
        ├── property.repository.ts    # Prisma sorguları
        ├── property.validation.ts    # Zod şemaları
        ├── property.types.ts         # TypeScript tip tanımları
        └── utils/
            └── slugUtils.ts          # Slug üretimi ve uniqueness kontrolü

tests/
├── unit/
│   └── property/
│       ├── slugUtils.test.ts         # Slug saf fonksiyon testleri
│       └── property.validation.test.ts
└── integration/
    └── property/
        ├── createProperty.test.ts
        ├── listProperties.test.ts
        ├── getProperty.test.ts
        ├── updateProperty.test.ts
        ├── deleteProperty.test.ts
        └── publishUnpublish.test.ts
```

---

## Components and Interfaces

### property.routes.ts

```typescript
import { Router } from 'express';
import { authenticate } from '@/modules/auth/auth.middleware';
import { propertyController } from './property.controller';

const propertyRouter = Router();

// Public routes
propertyRouter.get('/', propertyController.list);
propertyRouter.get('/:id', propertyController.getById);

// Protected routes
propertyRouter.post('/', authenticate, propertyController.create);
propertyRouter.put('/:id', authenticate, propertyController.update);
propertyRouter.delete('/:id', authenticate, propertyController.softDelete);
propertyRouter.patch('/:id/publish', authenticate, propertyController.publish);
propertyRouter.patch('/:id/unpublish', authenticate, propertyController.unpublish);

export default propertyRouter;
```

Router `/api/v1/properties` prefix'iyle `routes/index.ts`'e mount edilir.

---

### property.controller.ts

Controller TEK sorumluluğu: HTTP katmanı. Zod ile validate et → service çağır → response formatla.

```typescript
export const propertyController = {
  async create(req, res, next): Promise<void>;    // POST /
  async list(req, res, next): Promise<void>;      // GET /
  async getById(req, res, next): Promise<void>;   // GET /:id
  async update(req, res, next): Promise<void>;    // PUT /:id
  async softDelete(req, res, next): Promise<void>;// DELETE /:id
  async publish(req, res, next): Promise<void>;   // PATCH /:id/publish
  async unpublish(req, res, next): Promise<void>; // PATCH /:id/unpublish
};
```

Her method:
1. `schema.parse(req.body | req.query | req.params)` ile validate eder — ZodError global handler'a gider
2. `propertyService.method(dto, userId?)` çağırır
3. `SuccessResponse<T>` formatında yanıt döndürür

---

### property.service.ts

Business logic. Prisma detayları yoktur; repository'den geçer.

```typescript
export const propertyService = {
  async createProperty(dto: CreatePropertyDto, userId: string): Promise<PropertyDto>;
  async listProperties(query: PaginationQuery): Promise<PaginatedPropertyResult>;
  async getPropertyById(id: string): Promise<PropertyDto>;
  async updateProperty(id: string, dto: UpdatePropertyDto): Promise<PropertyDto>;
  async softDeleteProperty(id: string): Promise<void>;
  async publishProperty(id: string): Promise<PropertyDto>;
  async unpublishProperty(id: string): Promise<PropertyDto>;
};
```

**Slug üretimi akışı (`createProperty` ve `updateProperty`):**
1. `generateSlug(title)` çağırarak base slug oluştur
2. `propertyRepository.findBySlug(slug)` ile kontrol et
3. Çakışma yoksa devam et; varsa `-2` ... `-10` suffix'leriyle dene
4. 10 denemede çözülemezse `throw new AppError(409, 'SLUG_CONFLICT')`

---

### property.repository.ts

Prisma sorgularını barındırır. Tüm sorgularda `deletedAt: null` filtresi implicitly uygulanır.

```typescript
export const propertyRepository = {
  async create(data: PropertyCreateInput): Promise<Property>;
  async findMany(params: FindManyParams): Promise<[Property[], number]>;
  async findById(id: string): Promise<Property | null>;
  async update(id: string, data: PropertyUpdateInput): Promise<Property>;
  async softDelete(id: string): Promise<Property>;
  async findBySlug(slug: string): Promise<Property | null>;
};
```

`findMany` metodu transaction kullanarak veriyi ve toplam sayıyı (`count`) tek sorguda döndürür. Soft-delete filter: `where: { deletedAt: null, ...filters }`.

---

### property.validation.ts

```typescript
// ─── CreatePropertySchema ───────────────────────────────────────────────────
export const createPropertySchema = z.object({
  title: z.string().min(1).max(200),
  listingType: z.enum(['FOR_SALE', 'FOR_RENT']),
  propertyType: z.enum(['APARTMENT','HOUSE','LAND','OFFICE','SHOP','WAREHOUSE','OTHER']),
  price: z.number().positive(),
  city: z.string().min(1),
  district: z.string().min(1),
  address: z.string().min(1),
  // Opsiyonel alanlar
  description: z.string().optional(),
  neighborhood: z.string().optional(),
  grossArea: z.number().positive().optional(),
  netArea: z.number().positive().optional(),
  roomCount: z.number().int().min(0).optional(),
  // ... diğer opsiyonel alanlar
});

// ─── UpdatePropertySchema ───────────────────────────────────────────────────
export const updatePropertySchema = createPropertySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'En az bir alan güncellenmeli.',
  });

// ─── PaginationSchema ───────────────────────────────────────────────────────
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['price','createdAt','updatedAt','title']).default('createdAt'),
  sortOrder: z.enum(['asc','desc']).default('desc'),
  city: z.string().optional(),
  district: z.string().optional(),
  listingType: z.enum(['FOR_SALE','FOR_RENT']).optional(),
  propertyType: z.enum(['APARTMENT','HOUSE','LAND','OFFICE','SHOP','WAREHOUSE','OTHER']).optional(),
  isPublished: z.coerce.boolean().optional(),
  minimumPrice: z.coerce.number().positive().optional(),
  maximumPrice: z.coerce.number().positive().optional(),
}).refine(
  (data) => !(data.minimumPrice && data.maximumPrice && data.minimumPrice > data.maximumPrice),
  { message: 'minimumPrice, maximumPrice değerinden büyük olamaz.' }
);

// ─── IdParamSchema ──────────────────────────────────────────────────────────
export const idParamSchema = z.object({
  id: z.string().uuid('Geçerli bir UUID giriniz.'),
});

export type CreatePropertyDto = z.infer<typeof createPropertySchema>;
export type UpdatePropertyDto = z.infer<typeof updatePropertySchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;
```

---

### utils/slugUtils.ts

Slug üretimi saf fonksiyon olarak implement edilir; dışarıya hiçbir I/O bağımlılığı sızmaz.

```typescript
/**
 * Türkçe karakter haritası:
 * ş→s, ı→i, ğ→g, ü→u, ö→o, ç→c
 * Büyük harf karşılıkları da normalize edilir.
 */
export function generateSlug(title: string): string;

/**
 * Base slug üretir, ardından repository üzerinden uniqueness kontrol eder.
 * Çakışmada -2...-10 suffix ekler.
 * 10 denemede başarısız olursa AppError(409, 'SLUG_CONFLICT') fırlatır.
 */
export async function generateUniqueSlug(
  title: string,
  findBySlug: (slug: string) => Promise<unknown>,
  excludeId?: string
): Promise<string>;
```

`generateSlug` algoritması:
1. Türkçe karakterleri map et: `ş→s, Ş→s, ı→i, İ→i, ğ→g, Ğ→g, ü→u, Ü→u, ö→o, Ö→o, ç→c, Ç→c`
2. Küçük harfe çevir
3. `[^a-z0-9\s-]` karakterlerini sil
4. Boşlukları tire ile değiştir
5. Ardışık tireleri tekil tireye indir: `/-+/g → '-'`
6. Baş/son tireleri sil: `.trim()`

---

## Data Models

### PropertyDto (API Response)

Service ve Controller katmanları arasında kullanılan tiplenmiş DTO; Prisma `Property` modelinden türetilir, hassas alanlar filtrelenir.

```typescript
export interface PropertyDto {
  id: string;
  slug: string;
  title: string;
  listingType: 'FOR_SALE' | 'FOR_RENT';
  propertyType: 'APARTMENT' | 'HOUSE' | 'LAND' | 'OFFICE' | 'SHOP' | 'WAREHOUSE' | 'OTHER';
  price: number;
  city: string;
  district: string;
  address: string;
  description: string | null;
  neighborhood: string | null;
  grossArea: number | null;
  netArea: number | null;
  roomCount: number | null;
  livingRoomCount: number | null;
  bathroomCount: number | null;
  floor: number | null;
  totalFloor: number | null;
  buildingAge: number | null;
  heatingType: string | null;
  dues: number | null;
  deedStatus: string | null;
  latitude: number | null;
  longitude: number | null;
  videoUrl: string | null;
  virtualTourUrl: string | null;
  furnished: boolean;
  balcony: boolean;
  elevator: boolean;
  parking: boolean;
  eligibleForCredit: boolean;
  exchangeAvailable: boolean;
  isFeatured: boolean;
  isPublished: boolean;
  createdById: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  images: PropertyImageDto[];
}

export interface PropertyImageDto {
  id: string;
  imageUrl: string;
  publicId: string;
  displayOrder: number;
  isCover: boolean;
}
```

### PaginatedPropertyResult

```typescript
export interface PaginatedPropertyResult {
  data: PropertyDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number; // Math.ceil(total / limit)
  };
}
```

### Prisma Model Özeti

Mevcut `schema.prisma`'daki `Property` modeli tüm gereksinimleri karşılar:
- `slug: String @unique` — slug benzersizliği DB seviyesinde de garantilenmiş
- `isPublished: Boolean @default(false)` — varsayılan yayınsız
- `deletedAt: DateTime?` — soft-delete alanı
- `@@index([city, listingType, isPublished])` — composite index listeleme performansı için
- `@@index([deletedAt])` — soft-delete filtresi için

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Bu feature için `fast-check` (zaten `devDependencies`'de mevcut) kullanılarak property-based testler yazılacaktır.

---

### Property 1: Slug Format Invariant

*For any* string input (boş olmayan), `generateSlug()` fonksiyonu her zaman yalnızca `[a-z0-9-]` karakterlerinden oluşan, baş veya son tire içermeyen, ardışık tire bulundurmayan bir slug döndürmelidir.

**Validates: Requirements 1.4**

---

### Property 2: Slug Uniqueness Convergence

*For any* title ve N adet çakışan slug (N ∈ [0..9]), `generateUniqueSlug()` N+1. denemeyle başarılı bir slug üretmelidir. N = 10 olduğunda ise `SLUG_CONFLICT` hatası fırlatmalıdır.

**Validates: Requirements 1.5, 9.5**

---

### Property 3: New Property isPublished Default

*For any* geçerli ilan oluşturma verisi, oluşturulan ilanın `isPublished` değeri `false` olmalıdır.

**Validates: Requirements 1.7**

---

### Property 4: Soft-Delete Exclusion Invariant

*For any* soft-delete edilmiş ilan, `GET /api/v1/properties` ve `GET /api/v1/properties/:id` endpoint'leri bu ilanı döndürmemelidir. `deletedAt` alanı non-null olduğu sürece bu kural her zaman geçerlidir.

**Validates: Requirements 2.1, 5.1, 5.4**

---

### Property 5: Pagination Formula Invariant

*For any* (total, limit) çifti (limit ≥ 1), `pagination.pages` değeri her zaman `Math.ceil(total / limit)`'e eşit olmalıdır.

**Validates: Requirements 2.2, 10.7**

---

### Property 6: Filter Correctness

*For any* filtre kombinasyonu (`city`, `district`, `listingType`, `propertyType`, `isPublished`, `minimumPrice`, `maximumPrice`) ve herhangi bir ilan listesi, döndürülen her ilanın ilgili filtre koşullarını karşılaması gerekir. Hiçbir dönen ilan filtre dışında olmamalıdır.

**Validates: Requirements 2.5, 2.6**

---

### Property 7: Sort Order Invariant

*For any* liste sorgusu ve `sortBy` + `sortOrder` kombinasyonu, döndürülen dizideki komşu `(a[i], a[i+1])` çiftleri için `sortOrder=asc` ise `a[i].field ≤ a[i+1].field`, `sortOrder=desc` ise `a[i].field ≥ a[i+1].field` olmalıdır.

**Validates: Requirements 2.7**

---

### Property 8: Get-After-Create Consistency (Round-Trip)

*For any* başarıyla oluşturulan ilan, ID ile `GET /api/v1/properties/:id` sorgulandığında tüm zorunlu alanlar aynı değerle dönmelidir (write-then-read round-trip consistency).

**Validates: Requirements 3.1**

---

### Property 9: Partial Update Isolation

*For any* güncelleme isteği (geçerli alan alt kümesi), güncellenmek üzere gönderilmeyen alanlar `PUT /api/v1/properties/:id` sonrasında değişmemelidir.

**Validates: Requirements 4.1**

---

### Property 10: Title-to-Slug Derivation on Update

*For any* `title` içeren güncelleme isteği, oluşturulan yeni slug, yeni title'dan `generateSlug()` uygulanarak üretilmiş değerle tutarlı olmalıdır (format ve içerik açısından).

**Validates: Requirements 4.5**

---

### Property 11: Publish/Unpublish Idempotency

*For any* ilan, `publish` işlemi N kez (N ≥ 1) uygulandığında sonuç her zaman `isPublished=true` olmalıdır. Aynı şekilde `unpublish` işlemi N kez uygulandığında sonuç her zaman `isPublished=false` olmalıdır.

**Validates: Requirements 6.1, 7.1**

---

### Property 12: Validation Schema Completeness

*For any* geçerli (valid) `CreatePropertyDto` nesnesi, `createPropertySchema.parse()` başarıyla sonuçlanmalıdır. *For any* zorunlu alanı eksik veya kural dışı değer içeren nesne, parse işlemi `ZodError` fırlatmalıdır.

**Validates: Requirements 8.1, 8.5**

---

### Property 13: UpdatePropertySchema Minimum Fields

*For any* boş obje (`{}`), `updatePropertySchema.parse()` ZodError fırlatmalıdır. *For any* en az bir geçerli alan içeren obje, parse başarılı olmalıdır.

**Validates: Requirements 8.2**

---

**Property Reflection — Redundancy Review:**

- Property 4 (soft-delete exclusion), Property 3 (isPublished default) ve Property 11 (idempotency) farklı invariant'ları test eder — birleştirilmez.
- Property 8 (round-trip), Property 9 (partial update isolation) mantıksal olarak ayrı: biri oluşturma, diğeri güncelleme sırasındaki izolasyonu test eder.
- Property 5 (pagination formula) ve Property 6 (filter correctness) farklı boyutları kapsar — birleştirilmez.
- Property 12 ve 13 Zod şemalarının farklı kurallarını test eder — birleştirilmez.

---

## Error Handling

Tüm hatalar mevcut global `errorHandler` üzerinden yönetilir. Property modülü hiçbir zaman raw HTTP response yazmaz; daima `next(err)` ile hatayı iletir.

### Hata Kodu Kataloğu

| HTTP | Code | Durum |
|------|------|-------|
| 400 | `VALIDATION_ERROR` | Zod parse hatası — eksik alan, geçersiz tip, kural ihlali |
| 401 | `MISSING_TOKEN` | Authorization header yok |
| 401 | `INVALID_TOKEN` | JWT imzası geçersiz |
| 401 | `TOKEN_EXPIRED` | JWT süresi dolmuş |
| 404 | `PROPERTY_NOT_FOUND` | İlan bulunamadı veya soft-deleted |
| 404 | `USER_NOT_FOUND` | Token geçerli ama kullanıcı DB'de yok |
| 409 | `SLUG_CONFLICT` | 10 slug denemesi de çakışmalı |
| 500 | `INTERNAL_SERVER_ERROR` | Beklenmedik hata (production'da detay gizlenir) |

### Hata Fırlatma Kuralları

- **Controller**: Sadece Zod parse hatalarını propagate eder (otomatik). Business hata atmaz.
- **Service**: `AppError` fırlatır — `PROPERTY_NOT_FOUND`, `SLUG_CONFLICT`, `USER_NOT_FOUND`.
- **Repository**: Prisma hatalarını service'e iletir; wrapping yapmaz (service kararı verir).
- **Middleware**: `authenticate` → `MISSING_TOKEN`, `INVALID_TOKEN`, `TOKEN_EXPIRED`.

### Slug Çakışma Akışı

```
generateUniqueSlug("istanbul evi"):
  base = "istanbul-evi"
  attempt 1: slug = "istanbul-evi"          → EXISTS → continue
  attempt 2: slug = "istanbul-evi-2"        → EXISTS → continue
  ...
  attempt 9: slug = "istanbul-evi-9"        → FREE   → return "istanbul-evi-9"

  # 10. denemede de çakışırsa:
  attempt 10: slug = "istanbul-evi-10"      → EXISTS → throw AppError(409, 'SLUG_CONFLICT')
```

---

## Testing Strategy

### Yaklaşım

Dual testing: property-based testler genel doğruluğu, entegrasyon testleri spesifik senaryoları doğrular. `fast-check` (mevcut) property testleri için kullanılır.

### Property-Based Testler (Unit — `tests/unit/property/`)

Property-based testler saf fonksiyon veya iyi izole edilmiş iş mantığı üzerinde çalışır. Her test minimum 100 iterasyonla çalıştırılır.

**`slugUtils.test.ts`**:
```
// Feature: property-management-api, Property 1: Slug Format Invariant
fc.property(fc.string({ minLength: 1 }), (title) => {
  const slug = generateSlug(title);
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug === '';
});

// Feature: property-management-api, Property 2: Slug Uniqueness Convergence
// N çakışma senaryolarıyla generateUniqueSlug testi
```

**`property.validation.test.ts`**:
```
// Feature: property-management-api, Property 12: Validation Schema Completeness
// Feature: property-management-api, Property 13: UpdatePropertySchema Minimum Fields
// Feature: property-management-api, Property 5: Pagination Formula Invariant (pure math)
```

### Entegrasyon Testleri (`tests/integration/property/`)

Test ortamı: test veritabanı (`.env.test`), `beforeEach` ile veri temizliği, `supertest` ile HTTP istekleri.

**`createProperty.test.ts`** (Requirement 10.1):
- Geçerli token + body → 201 + PropertyDto format doğrulaması (Property 3: isPublished=false)
- Geçersiz/eksik token → 401
- Eksik zorunlu alan → 400 + details alanında hatalı field

**`listProperties.test.ts`** (Requirement 10.2):
- Varsayılan pagination → `{ data: [], pagination: { page:1, limit:10, total, pages } }` (Property 5)
- `city` filtresi → yalnızca eşleşen (Property 6)
- `isPublished=true` filtresi (Property 6)
- `sortBy=price&sortOrder=asc` → ardışık pair kontrolü (Property 7)
- Soft-deleted ilanlar listelenmez (Property 4)

**`getProperty.test.ts`** (Requirement 10.3):
- Mevcut ilan → 200 + tam PropertyDto (Property 8)
- Soft-deleted ilan → 404 (Property 4)
- Var olmayan UUID → 404
- Geçersiz UUID format → 400

**`updateProperty.test.ts`** (Requirement 10.4):
- Partial update → sadece gönderilen alanlar değişti (Property 9)
- Title güncelleme → yeni slug türetildi (Property 10)
- Yetkisiz erişim → 401
- Var olmayan ilan → 404

**`deleteProperty.test.ts`** (Requirement 10.5):
- Soft-delete sonrası list'te görünmez (Property 4)
- Soft-deleted ilanı tekrar sil → 404
- Yetkisiz erişim → 401

**`publishUnpublish.test.ts`** (Requirement 10.6):
- publish → isPublished=true (Property 11)
- unpublish → isPublished=false (Property 11)
- Idempotency: zaten publish → 200 + isPublished=true (Property 11)
- Yetkisiz erişim → 401

### Test Konfigurasyon Notları

- `jest --runInBand` zaten `package.json`'da tanımlı (test isolation için seri çalıştırma)
- `test:integration` script'i mevcut: `jest tests/integration --runInBand`
- Her property test için tag yorum formatı: `// Feature: property-management-api, Property N: <kısa açıklama>`
- Minimum iterasyon: `fc.assert(fc.property(...), { numRuns: 100 })`
