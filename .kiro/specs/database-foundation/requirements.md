# Requirements Document

## Introduction

Bu doküman, gayrimenkul yönetim sisteminin veritabanı katmanı için gereksinimleri tanımlar (Sprint 2). Sprint 1'de kurulan Express.js + TypeScript altyapısı üzerine, PostgreSQL ve Prisma ORM kullanılarak veri modelleri, ilişkiler, indeksler ve seed mekanizması geliştirilecektir. Bu sprint kapsamında yalnızca veritabanı katmanı ele alınmakta; authentication, controller/service katmanı ve frontend kapsam dışındadır.

## Glossary

- **Database**: PostgreSQL ilişkisel veritabanı sunucusu
- **Prisma**: Node.js/TypeScript için tip güvenli ORM aracı
- **PrismaClient**: Prisma tarafından üretilen, veritabanı sorgularını çalıştıran istemci sınıfı
- **Schema**: `prisma/schema.prisma` dosyasında tanımlanan veri modeli tanımı
- **Migration**: Şema değişikliklerini veritabanına uygulayan Prisma migration dosyaları
- **Seed**: Geliştirme ortamı için başlangıç verisi oluşturan script
- **Soft Delete**: Kaydı fiziksel olarak silmek yerine `deletedAt` alanını doldurarak işaretleme yöntemi
- **Singleton**: Uygulama genelinde yalnızca bir PrismaClient örneğinin bulunmasını sağlayan tasarım deseni
- **UUID**: Universally Unique Identifier — birincil anahtar olarak kullanılan benzersiz kimlik formatı
- **Slug**: URL'de kullanılmak üzere oluşturulan, benzersiz ve okunabilir metin tanımlayıcı
- **ListingType**: İlan türünü belirten enum — `FOR_SALE` (satılık) veya `FOR_RENT` (kiralık)
- **PropertyType**: Mülk türünü belirten enum — `APARTMENT`, `HOUSE`, `LAND`, `OFFICE`, `SHOP`, `WAREHOUSE`, `OTHER`
- **HeatingType**: Isıtma türünü belirten enum — `NATURAL_GAS`, `ELECTRIC`, `FLOOR_HEATING`, `COAL`, `NONE`, `OTHER`
- **DeedStatus**: Tapu durumunu belirten enum — `FREEHOLD`, `CONDOMINIUM`, `FLOOR_EASEMENT`, `SHARED`, `OTHER`
- **User**: Sisteme kayıtlı kullanıcıyı temsil eden veri modeli
- **Property**: Gayrimenkul ilanını temsil eden veri modeli
- **PropertyImage**: İlana ait fotoğrafı temsil eden veri modeli
- **DatabaseService**: PrismaClient singleton örneğini yöneten servis modülü

---

## Requirements

### Requirement 1: Prisma Kurulumu ve Şema Yapılandırması

**User Story:** Bir backend geliştirici olarak Prisma ORM'nin PostgreSQL ile doğru şekilde yapılandırılmasını istiyorum; böylece veri modellerini tip güvenli biçimde yönetebilir ve migration akışını düzenli tutabilirim.

#### Acceptance Criteria

1. THE Schema SHALL `datasource db` bloğunda provider olarak `postgresql` tanımlamalı ve bağlantı URL'sini `DATABASE_URL` ortam değişkeninden okumalıdır.
2. THE Schema SHALL `generator client` bloğunda provider olarak `prisma-client-js` tanımlamalı ve üretilen client kodunun çıktı dizinini `./src/generated/prisma-client` olarak belirtmelidir.
3. WHEN `npx prisma migrate dev` komutu çalıştırıldığında, THE Database SHALL migration dosyalarını `prisma/migrations` dizinine oluşturmalıdır.
4. WHEN `npx prisma generate` komutu çalıştırıldığında, THE Schema SHALL tip güvenli PrismaClient kodunu `./src/generated/prisma-client` dizinine üretmelidir.
5. IF `DATABASE_URL` ortam değişkeni tanımlı değilse, THEN THE DatabaseService SHALL uygulamayı sıfırdan çıkış kodu ile sonlandırmalı ve hata çıktısında `DATABASE_URL` adını açıkça belirtmelidir.
6. WHEN `npx prisma migrate dev` komutu veritabanına ulaşamadığında, THE Database SHALL bağlantı hatasını bildirerek migration işlemini durdurmali ve mevcut şemayı değiştirmemelidir.

---

### Requirement 2: User Veri Modeli

**User Story:** Bir backend geliştirici olarak kullanıcı verilerini saklamak istiyorum; böylece ilerleyen sprintlerde kimlik doğrulama ve ilan sahipliği ilişkisi kurulabilsin.

#### Acceptance Criteria

1. THE Schema SHALL `User` modelini şu zorunlu alanlarla tanımlamalıdır: `id` (UUID, primary key, auto-generated), `username` (String, en fazla 50 karakter, unique), `email` (String, en fazla 254 karakter, unique), `passwordHash` (String, en az 60 karakter), `isActive` (Boolean, default: true), `createdAt` (DateTime, default: now()), `updatedAt` (DateTime, her yazma işleminde otomatik güncellenir).
2. THE Schema SHALL `User` modelinde `email` alanı için büyük/küçük harf duyarsız (case-insensitive) unique kısıt tanımlamalıdır; `user@example.com` ve `User@Example.com` aynı değer olarak değerlendirilmelidir.
3. THE Schema SHALL `User` modelinde `username` alanı için yalnızca alfanümerik karakter ve alt çizgi (`_`) içeren değerlere izin veren unique kısıt tanımlamalıdır.
4. WHEN iki farklı kullanıcı aynı `email` değeriyle (büyük/küçük harf farkı gözetilmeksizin) oluşturulmaya çalışıldığında, THE Database SHALL ikinci kayıt oluşturma işlemini reddetmeli ve herhangi bir kısmi kayıt oluşturmamalıdır.
5. WHEN iki farklı kullanıcı aynı `username` değeriyle oluşturulmaya çalışıldığında, THE Database SHALL ikinci kayıt oluşturma işlemini reddetmeli ve herhangi bir kısmi kayıt oluşturmamalıdır.

---

### Requirement 3: Enum Tanımları

**User Story:** Bir backend geliştirici olarak ilan ve mülk kategorilerini tip güvenli enum'larla ifade etmek istiyorum; böylece geçersiz değerlerin veritabanına yazılması önlensin.

#### Acceptance Criteria

1. THE Schema SHALL `ListingType` enum'unu `FOR_SALE` ve `FOR_RENT` değerleriyle tanımlamalıdır.
2. THE Schema SHALL `PropertyType` enum'unu `APARTMENT`, `HOUSE`, `LAND`, `OFFICE`, `SHOP`, `WAREHOUSE`, `OTHER` değerleriyle tanımlamalıdır.
3. THE Schema SHALL `HeatingType` enum'unu `NATURAL_GAS`, `ELECTRIC`, `FLOOR_HEATING`, `COAL`, `NONE`, `OTHER` değerleriyle tanımlamalıdır.
4. THE Schema SHALL `DeedStatus` enum'unu `FREEHOLD`, `CONDOMINIUM`, `FLOOR_EASEMENT`, `SHARED`, `OTHER` değerleriyle tanımlamalıdır.
5. WHEN `Property` kaydı oluşturulurken tanımsız bir enum değeri kullanıldığında, THE Schema/PrismaClient SHALL kayıt işlemini validation hatası ile reddetmeli ve herhangi bir kısmi kayıt oluşturulmamalıdır.

---

### Requirement 4: Property Veri Modeli

**User Story:** Bir backend geliştirici olarak gayrimenkul ilanlarının tüm ayrıntılarını (konum, özellikler, durum) tek bir modelde saklamak istiyorum; böylece ilan listeleme ve detay sayfaları için gereken veri yapısı hazır olsun.

#### Acceptance Criteria

1. THE Schema SHALL `Property` modelini zorunlu kimlik alanlarıyla tanımlamalıdır: `id` (UUID, primary key, auto-generated), `slug` (String, unique), `title` (String), `listingType` (ListingType), `propertyType` (PropertyType).
2. THE Schema SHALL `Property` modelinde fiyat ve konum alanlarını tanımlamalıdır: `price` (Decimal), `city` (String), `district` (String), `address` (String).
3. THE Schema SHALL `Property` modelinde aşağıdaki opsiyonel alanları tanımlamalıdır: `description` (String?), `neighborhood` (String?), `grossArea` (Decimal?), `netArea` (Decimal?), `roomCount` (Int?), `livingRoomCount` (Int?), `bathroomCount` (Int?), `floor` (Int?), `totalFloor` (Int?), `buildingAge` (Int?), `heatingType` (HeatingType?), `dues` (Decimal?), `deedStatus` (DeedStatus?), `latitude` (Float?), `longitude` (Float?), `videoUrl` (String?), `virtualTourUrl` (String?).
4. THE Schema SHALL `Property` modelinde boolean özellik alanlarını varsayılan değerleriyle tanımlamalıdır: `furnished` (default: false), `balcony` (default: false), `elevator` (default: false), `parking` (default: false), `eligibleForCredit` (default: false), `exchangeAvailable` (default: false), `isFeatured` (default: false), `isPublished` (default: false).
5. THE Schema SHALL `Property` modelinde zaman damgası ve sahiplik alanlarını tanımlamalıdır: `createdAt` (DateTime, default: now()), `updatedAt` (DateTime, auto-update), `deletedAt` (DateTime?, nullable — soft delete için), `createdById` (String, UUID, FK → User.id).
6. WHEN `slug` alanı boş string olarak `Property` kaydı oluşturulmaya çalışıldığında, THE Database SHALL unique kısıt gereği yalnızca bir boş slug'a izin vermelidir.
7. WHEN `deletedAt` alanı doldurulmuş bir `Property` kaydı sorgulandığında, THE DatabaseService SHALL bu kaydı varsayılan filtrelere dahil etmemelidir.

---

### Requirement 5: PropertyImage Veri Modeli

**User Story:** Bir backend geliştirici olarak bir ilana ait fotoğrafları ayrı bir tabloda saklamak istiyorum; böylece bir ilana birden fazla fotoğraf eklenebilsin ve kapak fotoğrafı belirlenebilsin.

#### Acceptance Criteria

1. THE Schema SHALL `PropertyImage` modelini şu alanlarla tanımlamalıdır: `id` (UUID, primary key, auto-generated), `propertyId` (UUID, FK → Property.id), `imageUrl` (String, en fazla 2048 karakter), `publicId` (String, en fazla 255 karakter), `displayOrder` (Int), `isCover` (Boolean, default: false), `createdAt` (DateTime, default: now()).
2. THE Schema SHALL `PropertyImage` modelinde `(propertyId, displayOrder)` çifti için composite unique kısıt tanımlamalıdır; aynı ilan içinde iki fotoğraf aynı sıraya sahip olamaz.
3. THE Schema SHALL `PropertyImage` modelinde bir `Property` için en fazla bir kapak fotoğrafı olmasını sağlamak amacıyla `(propertyId, isCover)` üzerinde kısmi unique kısıt uygulamalıdır; `isCover = true` olan yalnızca bir kayda izin verilmelidir.
4. WHEN bir `Property` kaydı fiziksel olarak silindiğinde (hard-delete), THE Database SHALL ilişkili `PropertyImage` kayıtlarını da kademeli olarak silmelidir (cascade delete).
5. WHEN aynı `Property` için birden fazla `PropertyImage` kaydı oluşturulduğunda, THE Database SHALL her birini bağımsız kayıt olarak saklamalıdır.

---

### Requirement 6: İlişkiler

**User Story:** Bir backend geliştirici olarak User, Property ve PropertyImage modelleri arasındaki ilişkilerin veritabanı düzeyinde tanımlanmasını istiyorum; böylece referans bütünlüğü sağlansın.

#### Acceptance Criteria

1. THE Schema SHALL `User` ile `Property` arasında One-to-Many ilişki tanımlamalıdır: bir kullanıcı birden fazla ilan oluşturabilir.
2. THE Schema SHALL `Property` ile `PropertyImage` arasında One-to-Many ilişki tanımlamalıdır: bir ilana sınırsayıda fotoğraf eklenebilir.
3. THE Schema SHALL `Property.createdById` alanını `User.id`'ye referans eden foreign key olarak tanımlamalıdır.
4. THE Schema SHALL `PropertyImage.propertyId` alanını `Property.id`'ye referans eden foreign key olarak tanımlamalıdır; bu ilişki için `onDelete: Cascade` davranışı tanımlanmalıdır.
5. WHEN `User` kaydı silinmeye çalışıldığında ve kullanıcıya ait `deletedAt IS NULL` olan `Property` kayıtları varsa, THE Database SHALL silme işlemini referans bütünlüğü hatası ile reddetmelidir.

---

### Requirement 7: Veritabanı İndeksleri

**User Story:** Bir backend geliştirici olarak sık sorgulanan alanlara indeks eklenmesini istiyorum; böylece ilan listeleme ve filtreleme sorguları performanslı çalışsın.

#### Acceptance Criteria

1. THE Schema SHALL `Property.slug` alanı için unique indeks tanımlamalıdır.
2. THE Schema SHALL `Property.city` alanı için indeks tanımlamalıdır.
3. THE Schema SHALL `Property.district` alanı için indeks tanımlamalıdır.
4. THE Schema SHALL `Property.price` alanı için indeks tanımlamalıdır.
5. THE Schema SHALL `Property.listingType` alanı için indeks tanımlamalıdır.
6. THE Schema SHALL `Property.propertyType` alanı için indeks tanımlamalıdır.
7. THE Schema SHALL `Property.isPublished` alanı için indeks tanımlamalıdır.
8. THE Schema SHALL `Property.deletedAt` alanı için indeks tanımlamalıdır; soft-delete filtresi (`deletedAt IS NULL`) tüm sorgularda uygulanacağından bu indeks sorgu planlamasını doğrudan etkiler.
9. THE Schema SHALL `Property.createdById` alanı için indeks tanımlamalıdır; bu alan foreign key kolonu olup user-property join sorgularında kullanılır.
10. THE Schema SHALL `(city, listingType, isPublished)` alanları üzerinde bir composite indeks tanımlamalıdır; bu üçlü filtre kombinasyonu ilan listeleme sorgularında birlikte kullanılan en yaygın pattern'dir.

---

### Requirement 8: Soft Delete Mekanizması

**User Story:** Bir backend geliştirici olarak ilan kayıtlarının fiziksel olarak silinmemesini istiyorum; böylece silinen ilanlar geri yüklenebilsin ve veri geçmişi korunabilsin.

#### Acceptance Criteria

1. THE Schema SHALL `Property` modelinde `deletedAt` alanını `DateTime?` (nullable) olarak tanımlamalıdır.
2. WHEN bir `Property` kaydı "silindiğinde", THE DatabaseService SHALL yalnızca `deletedAt` alanını mevcut zaman damgasıyla güncellemeli; fiziksel silme yapmamalıdır.
3. WHILE `deletedAt` alanı `null` olan kayıtlar aktif kabul edilirken, THE DatabaseService SHALL varsayılan sorgularda yalnızca `deletedAt IS NULL` koşulunu sağlayan kayıtları döndürmelidir.
4. WHEN `deletedAt` dolu bir `Property` kaydı için geri yükleme yapıldığında, THE DatabaseService SHALL `deletedAt` alanını `null` olarak güncellemelidir.
5. THE Schema SHALL `PropertyImage` modeli için fiziksel silme (cascade delete) kullanmalıdır; `PropertyImage` için soft delete uygulanmamalıdır.

---

### Requirement 9: PrismaClient Singleton Pattern

**User Story:** Bir backend geliştirici olarak uygulama boyunca tek bir PrismaClient örneğinin kullanılmasını istiyorum; böylece geliştirme ortamında Hot Reload sırasında bağlantı havuzu tükenmesi önlensin.

#### Acceptance Criteria

1. THE DatabaseService SHALL PrismaClient'ı singleton pattern ile başlatmalıdır: uygulama ömrü boyunca yalnızca bir örnek oluşturulmalıdır.
2. WHILE `NODE_ENV` değişkeni `development` iken, THE DatabaseService SHALL PrismaClient örneğini `global` nesnesine bağlamalıdır; böylece Hot Reload sonrası mevcut örnek yeniden kullanılmalı, yeni bir örnek oluşturulmamalıdır.
3. WHILE `NODE_ENV` değişkeni `production` iken, THE DatabaseService SHALL PrismaClient örneğini `global` nesnesine bağlamamalı; modül kapsamında doğrudan tutmalıdır.
4. THE DatabaseService SHALL `prisma` adıyla dışa aktarılmış tek bir PrismaClient örneği sağlamalıdır.
5. WHEN uygulama SIGTERM veya SIGINT sinyali aldığında, THE DatabaseService SHALL `prisma.$disconnect()` metodunu çağırarak bağlantıyı kapatmalıdır.
6. WHEN `prisma.$disconnect()` çağrısı başarısız olduğunda, THE DatabaseService SHALL hatayı loglayarak süreci sonlandırmalıdır; sessizce yutmamalıdır.

---

### Requirement 10: Seed Verisi

**User Story:** Bir backend geliştirici olarak geliştirme ortamında başlangıç verisi içeren bir seed scripti olmasını istiyorum; böylece veritabanını sıfırdan başlatırken elle veri girmek zorunda kalmayayım.

#### Acceptance Criteria

1. THE Seed_Script SHALL en az 1 admin kullanıcı kaydı oluşturmalıdır; kullanıcının `username`, `email` ve `passwordHash` alanları doldurulmuş olmalıdır.
2. THE Seed_Script SHALL en az 2 örnek `Property` kaydı oluşturmalıdır; her kayıt `title`, `slug`, `price`, `listingType`, `propertyType`, `city`, `district`, `address` ve `createdById` alanlarıyla birlikte oluşturulmalıdır.
3. THE Seed_Script SHALL her örnek ilan için en az 1 adet `PropertyImage` kaydı oluşturmalıdır.
4. WHEN `npx prisma db seed` komutu birden fazla kez çalıştırıldığında, THE Seed_Script SHALL mevcut kayıtlarla çakışmayı önlemek için `upsert` veya önce silme stratejisi kullanmalıdır.
5. WHEN Seed_Script başarıyla tamamlandığında, THE Seed_Script SHALL oluşturulan kayıt sayısını konsola bildirmelidir.

---

### Requirement 11: Veritabanı Bağlantı Testi

**User Story:** Bir backend geliştirici olarak veritabanı bağlantısını doğrulayan otomatik bir test olmasını istiyorum; böylece CI/CD ortamında veritabanı erişilebilirliği garantilensin.

#### Acceptance Criteria

1. THE Test_Suite SHALL `prisma.$connect()` çağrısının başarıyla tamamlandığını doğrulayan en az 1 test içermelidir.
2. WHEN veritabanı bağlantısı başarıyla kurulduğunda, THE Test_Suite SHALL testi geçmiş (pass) olarak işaretlemelidir.
3. WHEN veritabanına erişilemeyen bir ortamda test çalıştırıldığında, THE Test_Suite SHALL bağlantı hatasını yakalamalı ve açıklayıcı bir hata mesajıyla testi başarısız (fail) olarak işaretlemelidir.
4. WHEN test tamamlandıktan sonra, THE Test_Suite SHALL `prisma.$disconnect()` çağırarak bağlantıyı kapatmalıdır.
