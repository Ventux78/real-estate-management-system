# Requirements Document

## Introduction

Bu belge, **Property Management API** (Sprint 4) için gereksinimleri tanımlar. Sistem; Express + TypeScript + Prisma + PostgreSQL + JWT altyapısı üzerine inşa edilmiş bir gayrimenkul yönetim API'sinin ilan (property) modülünü kapsar.

Feature-based mimari içinde `modules/property/` klasörü altında geliştirilecek olan bu modül; ilan oluşturma, listeleme, güncelleme, soft-delete, yayına alma/kaldırma ve detay görüntüleme işlevlerini sağlar. Mevcut `auth` modülü referans alınarak aynı katmanlı mimari (Repository → Service → Controller) uygulanır.

## Glossary

- **Property_API**: Property modülünün tüm HTTP endpoint'lerini yöneten Express Router ve Controller katmanı
- **Property_Service**: İlan iş kurallarını uygulayan servis katmanı; Controller tarafından çağrılır, HTTP detaylarından bağımsızdır
- **Property_Repository**: Prisma üzerinden veritabanı işlemlerini yürüten katman; soft-delete filtrelerini otomatik olarak uygular
- **Property_Validator**: Zod şemaları aracılığıyla request verilerini doğrulayan doğrulama katmanı
- **JWT_Middleware**: Authorization başlığındaki Bearer token'ı doğrulayan ve `req.user`'ı dolduran middleware (`authenticate`)
- **Slug**: İlan başlığından üretilen, URL-dostu, benzersiz tanımlayıcı string; Türkçe karakterler ASCII'ye normalize edilir, boşluklar tire ile değiştirilir
- **Soft_Delete**: Kaydı fiziksel olarak silmek yerine `deletedAt` alanını dolduran silme stratejisi
- **PaginatedResponse**: `{ data: [], pagination: { page, limit, total, pages } }` formatında sayfalanmış yanıt
- **ListingType**: İlan türü — `FOR_SALE` (satılık) veya `FOR_RENT` (kiralık)
- **PropertyType**: Emlak türü — `APARTMENT`, `HOUSE`, `LAND`, `OFFICE`, `SHOP`, `WAREHOUSE`, `OTHER`
- **AppError**: Tüm operasyonel hataların türetildiği base sınıf; `statusCode`, `code` ve `message` taşır
- **SuccessResponse**: `{ success: true, data: T, meta?: object }` formatında standart başarı yanıtı

---

## Requirements

### Requirement 1: İlan Oluşturma

**User Story:** As a backend user (admin/agent), I want to create a new real estate listing so that I can register properties for sale or rent on the system.

#### Acceptance Criteria

1. WHEN geçerli bir JWT Bearer token ve zorunlu ilan alanları (`title` max 200 karakter, `listingType` geçerli enum, `propertyType` geçerli enum, `price` > 0, `city`, `district`, `address`) içeren bir `POST /api/v1/properties` isteği alındığında, THE Property_Service SHALL `createdById` alanını JWT token'dan alınan kullanıcı ID'siyle doldurarak yeni bir ilan kaydı oluşturur ve HTTP 201 ile `SuccessResponse<PropertyDto>` döndürür.

2. WHEN `POST /api/v1/properties` isteği `Authorization` başlığı olmadan veya geçersiz bir token ile geldiğinde, THE JWT_Middleware SHALL isteği reddeder ve HTTP 401 `UNAUTHORIZED` hata yanıtı döndürür.

3. WHEN `POST /api/v1/properties` isteğinde zorunlu alanlardan biri eksik, `price <= 0`, `title` 200 karakteri aşıyor veya `listingType`/`propertyType` geçersiz bir enum değeri içeriyorsa, THE Property_Validator SHALL isteği reddeder ve HTTP 400 `VALIDATION_ERROR` hata yanıtı ile hangi alanların hatalı olduğunu `details` alanında döndürür.

4. WHEN yeni bir ilan oluşturulduğunda, THE Property_Service SHALL `title` değerinden slug üretir: Türkçe karakterleri ASCII karşılığına çevirir (ş→s, ı→i vb.), küçük harfe çevirir, boşluk ve özel karakterleri tire (`-`) ile değiştirir, ardışık tireleri tekil tireye indirger ve baş/son tireleri siler.

5. IF üretilen slug veritabanında zaten mevcutsa, THEN THE Property_Service SHALL slug'ın sonuna `-2`, `-3` ... `-10` şeklinde numara ekleyerek benzersiz bir slug bulur; 10 deneme de başarısız olursa HTTP 409 `SLUG_CONFLICT` hatası döndürür.

6. WHEN yeni bir ilan başarıyla oluşturulduğunda, THE Property_Service SHALL yeni ilanın ID'sini ve oluşturulma zamanını içeren bir log kaydı oluşturur.

7. THE Property_Service SHALL yeni oluşturulan ilanın `isPublished` değerini varsayılan olarak `false` olarak ayarlar.

8. IF JWT token geçerli ancak token içindeki kullanıcı ID'si veritabanında bulunamazsa, THEN THE Property_Service SHALL HTTP 404 `USER_NOT_FOUND` hata yanıtı döndürür.

---

### Requirement 2: İlan Listeleme ve Filtreleme

**User Story:** As an API user, I want to list properties with pagination and filters so that I can quickly find listings matching specific criteria.

#### Acceptance Criteria

1. WHEN `GET /api/v1/properties` isteği alındığında, THE Property_Repository SHALL `deletedAt IS NULL` koşulunu otomatik olarak uygular ve `PaginatedResponse` formatında ilan listesi döndürür.

2. WHEN `GET /api/v1/properties` isteğinde `page` ve `limit` query parametreleri belirtildiğinde, THE Property_API SHALL offset tabanlı sayfalama uygular ve yanıtta `{ page, limit, total, pages }` içeren `pagination` nesnesi döndürür; burada `pages = Math.ceil(total / limit)`.

3. WHEN `page` veya `limit` parametreleri belirtilmediğinde, THE Property_API SHALL `page=1` ve `limit=10` varsayılan değerlerini kullanır.

4. WHEN `page < 1`, `limit < 1` veya `limit > 100` değerleri gönderildiğinde, THE Property_Validator SHALL isteği reddeder ve HTTP 400 `VALIDATION_ERROR` döndürür.

5. WHEN `GET /api/v1/properties` isteğinde `city`, `district`, `listingType`, `propertyType` veya `isPublished` query parametrelerinden biri veya birkaçı belirtildiğinde, THE Property_Repository SHALL yalnızca belirtilen kriterlere uyan ilanları döndürür.

6. WHEN `minimumPrice` ve/veya `maximumPrice` query parametreleri belirtildiğinde, THE Property_Repository SHALL `price >= minimumPrice AND price <= maximumPrice` aralığını uygular; IF `minimumPrice > maximumPrice` ise THEN HTTP 400 `VALIDATION_ERROR` döndürür.

7. WHEN `sortBy` parametresi `price`, `createdAt`, `updatedAt` veya `title` değerlerinden biri olarak belirtildiğinde, THE Property_API SHALL ilanları belirtilen alana göre sıralar; `sortOrder` belirtilmediğinde `desc` kullanılır; `sortBy` belirtilmediğinde `createdAt desc` kullanılır.

8. IF `sortBy` geçersiz bir alan adı, `sortOrder` `asc`/`desc` dışında bir değer, `listingType` geçersiz bir enum veya `isPublished` boolean dışında bir değer içeriyorsa, THEN THE Property_Validator SHALL HTTP 400 `VALIDATION_ERROR` döndürür.

---

### Requirement 3: Tek İlan Detayı

**User Story:** As an API user, I want to view the full details of a specific listing so that I can access complete information about a property.

#### Acceptance Criteria

1. WHEN geçerli bir UUID formatında `:id` parametresiyle `GET /api/v1/properties/:id` isteği alındığında ve ilan mevcutsa, THE Property_Repository SHALL `deletedAt IS NULL` koşulunu uygulayarak ilanı tüm alanlarıyla (images dahil) getirir ve HTTP 200 ile `SuccessResponse<PropertyDto>` döndürür.

2. IF belirtilen `:id` ile eşleşen ilan bulunamazsa veya `deletedAt` dolu bir kayıtsa, THEN THE Property_Service SHALL HTTP 404 `PROPERTY_NOT_FOUND` hata yanıtı döndürür.

3. IF `:id` parametresi UUID formatında değilse, THEN THE Property_Validator SHALL HTTP 400 `VALIDATION_ERROR` döndürür.

4. IF veritabanı bağlantısı veya servis erişilemez durumdaysa, THEN THE Property_API SHALL HTTP 500 döndürür ve hata detaylarını response body'de açıklamaz.

---

### Requirement 4: İlan Güncelleme

**User Story:** As an authenticated user, I want to update an existing listing so that I can correct or update property information.

#### Acceptance Criteria

1. WHEN geçerli bir JWT Bearer token ve en az bir güncelleme alanı içeren `PUT /api/v1/properties/:id` isteği alındığında, THE Property_Service SHALL yalnızca gönderilen alanları günceller (partial update), `updatedAt` alanını günceller ve HTTP 200 ile güncellenmiş `SuccessResponse<PropertyDto>` döndürür.

2. WHEN `PUT /api/v1/properties/:id` isteği `Authorization` başlığı olmadan veya geçersiz bir token ile geldiğinde, THE JWT_Middleware SHALL isteği reddeder ve HTTP 401 `UNAUTHORIZED` hata yanıtı döndürür.

3. IF güncellenmek istenen ilan bulunamazsa veya soft-delete edilmişse, THEN THE Property_Service SHALL HTTP 404 `PROPERTY_NOT_FOUND` hata yanıtı döndürür.

4. WHEN `PUT /api/v1/properties/:id` isteğinde gönderilen herhangi bir alan geçersizse (title > 150 karakter, price < 0.01, alanlar < 0.01 m², boş body), THE Property_Validator SHALL HTTP 400 `VALIDATION_ERROR` döndürür.

5. WHEN `title` alanı güncellendiğinde, THE Property_Service SHALL yeni bir slug üretir ve benzersizliğini doğrular; IF yeni slug başka bir ilana aitse THEN HTTP 409 `SLUG_CONFLICT` döndürür.

6. WHEN bir ilan başarıyla güncellendiğinde, THE Property_Service SHALL ilanın ID'sini ve güncellenme zamanını içeren bir log kaydı oluşturur.

---

### Requirement 5: Soft Delete

**User Story:** As an authenticated user, I want to remove a listing from the system while keeping the data recoverable in the database.

#### Acceptance Criteria

1. WHEN geçerli bir JWT Bearer token ile `DELETE /api/v1/properties/:id` isteği alındığında, THE Property_Repository SHALL kaydı fiziksel olarak silmek yerine `deletedAt` alanını o anki UTC timestamp ile doldurur ve HTTP 200 ile başarı mesajı döndürür.

2. WHEN `DELETE /api/v1/properties/:id` isteği `Authorization` başlığı olmadan veya geçersiz bir token ile geldiğinde, THE JWT_Middleware SHALL isteği reddeder ve HTTP 401 `UNAUTHORIZED` hata yanıtı döndürür.

3. IF silinmek istenen ilan bulunamazsa veya zaten soft-delete edilmişse, THEN THE Property_Service SHALL HTTP 404 `PROPERTY_NOT_FOUND` hata yanıtı döndürür.

4. WHILE `deletedAt` alanı dolu olan bir ilan mevcutsa, THE Property_Repository SHALL bu kaydı yalnızca public listeleme ve detay sorgularında otomatik olarak filtreler (admin/internal sorgular harici).

5. WHEN bir ilan başarıyla soft-delete edildiğinde, THE Property_Service SHALL ilanın ID'sini ve silinme zamanını içeren bir log kaydı oluşturur.

---

### Requirement 6: İlanı Yayına Alma

**User Story:** As an authenticated user, I want to publish a ready listing so that it becomes visible to end users.

#### Acceptance Criteria

1. WHEN geçerli bir JWT Bearer token ile `PATCH /api/v1/properties/:id/publish` isteği alındığında, THE Property_Service SHALL ilanın `isPublished` alanını `true` olarak günceller ve HTTP 200 ile güncel `SuccessResponse<PropertyDto>` döndürür; ilan zaten yayındaysa işlem idempotent olarak başarılı sayılır.

2. WHEN `PATCH /api/v1/properties/:id/publish` isteği `Authorization` başlığı olmadan veya geçersiz bir token ile geldiğinde, THE JWT_Middleware SHALL isteği reddeder ve HTTP 401 `UNAUTHORIZED` hata yanıtı döndürür.

3. IF yayına alınmak istenen ilan bulunamazsa veya soft-delete edilmişse, THEN THE Property_Service SHALL HTTP 404 `PROPERTY_NOT_FOUND` hata yanıtı döndürür.

4. WHEN bir ilan başarıyla yayına alındığında, THE Property_Service SHALL ilanın ID'sini ve yayına alınma zamanını içeren bir log kaydı oluşturur.

5. IF `:id` parametresi UUID formatında değilse, THEN THE Property_Validator SHALL HTTP 400 `VALIDATION_ERROR` döndürür.

---

### Requirement 7: İlanı Yayından Kaldırma

**User Story:** As an authenticated user, I want to unpublish an active listing so that I can temporarily hide it from users.

#### Acceptance Criteria

1. WHEN geçerli bir JWT Bearer token ile `PATCH /api/v1/properties/:id/unpublish` isteği alındığında, THE Property_Service SHALL ilanın `isPublished` alanını `false` olarak günceller ve HTTP 200 ile güncel `SuccessResponse<PropertyDto>` döndürür; ilan zaten yayında değilse işlem idempotent olarak başarılı sayılır.

2. WHEN `PATCH /api/v1/properties/:id/unpublish` isteği `Authorization` başlığı olmadan veya geçersiz bir token ile geldiğinde, THE JWT_Middleware SHALL isteği reddeder ve HTTP 401 `UNAUTHORIZED` hata yanıtı döndürür.

3. IF yayından kaldırılmak istenen ilan bulunamazsa veya soft-delete edilmişse, THEN THE Property_Service SHALL HTTP 404 `PROPERTY_NOT_FOUND` hata yanıtı döndürür.

4. IF `:id` parametresi UUID formatında değilse, THEN THE Property_Validator SHALL HTTP 400 `VALIDATION_ERROR` döndürür.

5. WHEN bir ilan başarıyla yayından kaldırıldığında, THE Property_Service SHALL ilanın ID'sini ve yayından kaldırılma zamanını içeren bir log kaydı oluşturur.

---

### Requirement 8: Validation Katmanı

**User Story:** As a system architect, I want all API inputs to be validated before reaching the business layer so that invalid data never reaches the database.

#### Acceptance Criteria

1. THE Property_Validator SHALL `CreatePropertySchema` adında bir Zod şeması sağlar; `title` (string, 1–200 karakter), `listingType` (FOR_SALE | FOR_RENT), `propertyType` (APARTMENT | HOUSE | LAND | OFFICE | SHOP | WAREHOUSE | OTHER), `price` (number, > 0), `city` (string, min 1), `district` (string, min 1), `address` (string, min 1) alanlarını zorunlu olarak doğrular; opsiyonel alan varsa tip ve sınır kurallarını da doğrular.

2. THE Property_Validator SHALL `UpdatePropertySchema` adında bir Zod şeması sağlar; `CreatePropertySchema`'nın tüm alanlarını opsiyonel (`.partial()`) olarak tanımlar ve body'nin en az bir alan içermesini zorunlu kılar.

3. THE Property_Validator SHALL `PaginationSchema` adında bir Zod şeması sağlar; `page` (int, min: 1, default: 1), `limit` (int, min: 1, max: 100, default: 10), `sortBy` (price | createdAt | updatedAt | title, default: createdAt), `sortOrder` (asc | desc, default: desc) alanlarını doğrular ve `minimumPrice`, `maximumPrice`, `city`, `district`, `listingType`, `propertyType`, `isPublished` filtre alanlarını opsiyonel olarak doğrular.

4. THE Property_Validator SHALL `IdParamSchema` adında bir Zod şeması sağlar; `:id` parametresinin RFC 4122 uyumlu UUID formatında olduğunu doğrular.

5. IF herhangi bir Zod doğrulaması başarısız olursa, THEN THE Property_API SHALL global `errorHandler` aracılığıyla HTTP 400 `VALIDATION_ERROR` ve hatalı alanların listesini `details` içinde döndürür.

---

### Requirement 9: Hata Yönetimi

**User Story:** As an API consumer, I want all error responses to have a consistent format with meaningful error codes so that I can handle errors programmatically.

#### Acceptance Criteria

1. THE Property_API SHALL `AppError` sınıfını kullanarak tüm operasyonel hataları fırlatır; bu hatalar global `errorHandler` tarafından `{ success: false, error: { code, message, details? } }` formatına dönüştürülür.

2. WHEN bir kaynak bulunamadığında, THE Property_Service SHALL HTTP 404 ve `PROPERTY_NOT_FOUND` kodu içeren bir `AppError` fırlatır.

3. WHEN kimlik doğrulama başarısız olduğunda, THE JWT_Middleware SHALL HTTP 401 ve `UNAUTHORIZED` kodu içeren bir `AppError` fırlatır.

4. IF beklenmeyen bir sunucu hatası oluşursa, THEN THE Property_API SHALL production ortamında HTTP 500 döndürür ve stack trace / iç hata detaylarını response body'de açıklamaz.

5. WHEN bir slug çakışması 10 deneme sonunda çözülemezse, THE Property_Service SHALL HTTP 409 `SLUG_CONFLICT` hatası döndürür; normal akışta (1–9 denemede çözülürse) dışarıya hata yansıtmaz.

---

### Requirement 10: Entegrasyon Testleri

**User Story:** As a developer, I want all API endpoints to be covered by integration tests so that I can quickly detect regression errors.

#### Acceptance Criteria

1. THE Property_API SHALL `POST /api/v1/properties` için en az şu senaryoları kapsayan entegrasyon testleri içerir: (a) geçerli token + geçerli body ile HTTP 201 ve oluşturulan ilan dönüşü, (b) geçersiz/eksik token ile HTTP 401, (c) eksik zorunlu alan ile HTTP 400.

2. THE Property_API SHALL `GET /api/v1/properties` için en az şu senaryoları kapsayan entegrasyon testleri içerir: (a) varsayılan pagination ile doğru format, (b) `city` filtresi ile yalnızca eşleşen ilanlar, (c) `isPublished=true` filtresi, (d) `sortBy=price&sortOrder=asc` sıralaması.

3. THE Property_API SHALL `GET /api/v1/properties/:id` için en az şu senaryoları kapsayan entegrasyon testleri içerir: (a) mevcut ilan ile HTTP 200, (b) varolmayan ID ile HTTP 404, (c) geçersiz UUID formatı ile HTTP 400.

4. THE Property_API SHALL `PUT /api/v1/properties/:id` için en az şu senaryoları kapsayan entegrasyon testleri içerir: (a) kısmi güncelleme ile yanıtta yalnızca değiştirilen alanların güncellendiği doğrulaması, (b) yetkisiz erişim ile HTTP 401, (c) varolmayan ilan ile HTTP 404.

5. THE Property_API SHALL `DELETE /api/v1/properties/:id` için en az şu senaryoları kapsayan entegrasyon testleri içerir: (a) soft-delete sonrası `GET /properties` listesinde ilanın görünmediği, (b) soft-delete edilmiş ilanı tekrar silmeye çalışınca HTTP 404, (c) yetkisiz erişim ile HTTP 401.

6. THE Property_API SHALL `PATCH /api/v1/properties/:id/publish` ve `/unpublish` için en az şu senaryoları kapsayan entegrasyon testleri içerir: (a) publish sonrası `isPublished=true` doğrulaması, (b) unpublish sonrası `isPublished=false` doğrulaması, (c) idempotency: zaten publish olan ilanı tekrar publish etmek HTTP 200 döndürür, (d) yetkisiz erişim ile HTTP 401.

7. WHEN pagination testleri çalıştırıldığında, THE Property_API SHALL her kombinasyon için `pagination.pages` değerinin `Math.ceil(pagination.total / pagination.limit)` ile tam olarak eşit olduğunu doğrular.
