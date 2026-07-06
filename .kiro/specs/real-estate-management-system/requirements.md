# Requirements Document

## Introduction

Bu belge, profesyonel bir gayrimenkul ofisi için geliştirilecek olan **Profesyonel Gayrimenkul Yönetim Sistemi**'nin gereksinimlerini tanımlar. Sistem; tek bir admin tarafından masaüstü uygulama (PySide6) üzerinden yönetilecek, tüm ilanlar halka açık bir web sitesinde (Next.js) ziyaretçilere sunulacak ve aralarındaki iletişim Node.js/Express tabanlı bir REST API ile sağlanacaktır. Fotoğraflar Cloudinary üzerinde depolanacak, veriler PostgreSQL veritabanında Prisma ORM aracılığıyla yönetilecektir.

Kapsam; mimari tasarım, veritabanı tasarımı, API tasarımı, güvenlik mimarisi ve geliştirme yol haritası belgelerinin üretilmesidir. Kapsam dışı: kaynak kod üretimi, migration dosyaları, ORM kodu, UI tasarım dosyaları.

---

## Glossary

- **System**: Profesyonel Gayrimenkul Yönetim Sistemi'nin bütünü
- **API_Server**: Node.js/Express tabanlı REST API backend bileşeni
- **Admin_Client**: Python/PySide6 ile geliştirilmiş masaüstü yönetim uygulaması
- **Public_Website**: Next.js/React tabanlı, ziyaretçilere yönelik halka açık web arayüzü
- **Database**: PostgreSQL ve Prisma ORM ile yönetilen ilişkisel veritabanı
- **Storage_Service**: Cloudinary tabanlı görsel depolama ve yönetim servisi
- **Admin**: Sistemdeki tek yetkili kullanıcı; tüm CRUD işlemlerine erişim hakkına sahip
- **Visitor**: Herhangi bir kimlik doğrulaması yapmadan Public_Website'yi görüntüleyen kullanıcı
- **Property**: Bir gayrimenkul ilanını (konut, ticari, arsa vb.) temsil eden varlık
- **JWT**: Admin kimliğini doğrulamak için kullanılan JSON Web Token
- **ER_Diagram**: Entity-Relationship diyagramı; veritabanı tablolarını ve ilişkilerini gösteren metin tabanlı şema
- **Roadmap**: Sistemin bağımsız ve test edilebilir fazlar halinde geliştirilme planı

---

## Requirements

### Requirement 1: Sistem Mimarisi Tasarımı

**User Story:** As a software architect, I want to understand the communication flows between all components, so that I can build and maintain the system correctly.

#### Acceptance Criteria

1. THE System SHALL provide an architecture document that describes the communication flows between the Public_Website, API_Server, Admin_Client, Database, and Storage_Service components.
2. THE System SHALL define that the Admin_Client communicates exclusively with the API_Server over HTTPS REST calls, and never directly with the Database or Storage_Service.
3. THE System SHALL define that the Public_Website communicates exclusively with the API_Server over HTTPS REST calls in read-only mode.
4. THE System SHALL define that the API_Server communicates with the Database via Prisma ORM and with the Storage_Service via the Cloudinary SDK.
5. THE System SHALL document the data flow for each of the three external access paths: Visitor browsing, Admin authenticating, and Admin managing a Property, regardless of whether other architecture rules defined in this document are violated during those flows.
6. IF a component boundary is crossed, THEN THE architecture document SHALL specify the protocol, authentication mechanism, and data format used for that crossing.

---

### Requirement 2: Teknoloji Seçimi Gerekçesi

**User Story:** As a technical decision maker, I want to see comparative justifications for each selected technology against its alternatives, so that I can defend the technology choices to stakeholders.

#### Acceptance Criteria

1. THE System SHALL provide a technology justification document covering Express, PostgreSQL, Prisma ORM, Next.js, and PySide6.
2. FOR EACH technology, THE justification document SHALL list at least two alternative technologies and explain why the chosen technology was preferred for this project's constraints.
3. THE justification document SHALL evaluate each technology against criteria including development speed, ecosystem maturity, type safety, and operational simplicity.
4. WHERE a technology choice introduces a trade-off or known limitation, THE justification document SHALL state that trade-off explicitly.

---

### Requirement 3: Proje Klasör Yapısı

**User Story:** As a developer, I want to see the standard folder structures for the Frontend, Backend, and Python Admin application, so that I can scaffold the project in a consistent and scalable way.

#### Acceptance Criteria

1. THE System SHALL produce a directory tree for the API_Server project reflecting a modular, feature-based folder structure.
2. THE System SHALL produce a directory tree for the Public_Website project following Next.js App Router conventions.
3. THE System SHALL produce a directory tree for the Admin_Client project following Python packaging and PySide6 best practices.
4. THE directory trees SHALL include configuration, environment, and test directories as first-class citizens.
5. THE directory trees SHALL NOT include source code files or migration files; only folder and representative placeholder file names shall be listed.

---

### Requirement 4: Modüler Yapı Tanımı

**User Story:** As a developer, I want to understand the responsibilities of each module and its relationships with other modules, so that I can identify inter-module dependencies upfront.

#### Acceptance Criteria

1. THE System SHALL define the boundaries and responsibilities of the following modules: Authentication, Properties, Images, Users, Admin_Client, Public_Website, Storage, Database, Configuration.
2. FOR EACH module, THE module definition SHALL specify its inputs, outputs, and direct dependencies on other modules.
3. THE module definition SHALL identify which modules are internal to the API_Server and which are standalone applications.
4. WHEN a module depends on an external service, THE module definition SHALL name that service and describe the nature of the dependency.
5. THE System SHALL produce a dependency graph showing the relationships between all nine modules.

---

### Requirement 5: Veritabanı Tasarımı

**User Story:** As a database architect, I want to see the detailed schema of all tables, columns, data types, constraints, and index recommendations, so that I can create the database correctly and with good performance.

#### Acceptance Criteria

1. THE System SHALL produce a database schema document listing every table with its columns, data types, nullability, and default values.
2. FOR EACH table, THE schema document SHALL identify the primary key and all foreign key constraints with their referenced tables and columns.
3. THE schema document SHALL include index recommendations for all foreign key columns and all columns used in WHERE or ORDER BY clauses in expected queries.
4. THE schema document SHALL define the relationships between tables as one-to-one, one-to-many, or many-to-many and describe the business rule each relationship enforces.
5. THE System SHALL include a `properties` table containing at minimum: id, title, description, price, currency, area_sqm, property_type, listing_type, status, city, district, address, latitude, longitude, created_at, and updated_at columns.
6. THE System SHALL include an `images` table linked to the `properties` table, containing at minimum: id, property_id, cloudinary_public_id, url, is_cover, display_order, and created_at columns.
7. THE System SHALL include a `users` table for Admin authentication containing at minimum: id, email, password_hash, role, created_at, and updated_at columns.
8. WHERE full-text search on property listings is required, THE schema document SHALL recommend appropriate index types including GIN index for PostgreSQL full-text search.

---

### Requirement 6: ER Diyagramı

**User Story:** As a database architect, I want to see a text-based ER diagram, so that I can quickly understand table relationships without graphical tooling.

#### Acceptance Criteria

1. THE System SHALL produce a text-based ER diagram representing all database tables and the relationships between them.
2. THE ER_Diagram SHALL use a standard notation such as crow's foot or UML-style in ASCII/Unicode to indicate cardinality.
3. THE ER_Diagram SHALL display each table's primary key, foreign keys, and at least three representative non-key columns.
4. THE ER_Diagram SHALL be self-contained and readable without any additional tooling.

---

### Requirement 7: REST API Tasarımı

**User Story:** As a backend developer, I want to see the complete endpoint list for all CRUD operations, so that I can develop both the Admin_Client and the Public_Website against this contract.

#### Acceptance Criteria

1. THE System SHALL produce an API design document listing every endpoint with its HTTP method, path, request body schema, response body schema, and required authorization level.
2. THE API design document SHALL include endpoints for the following resource groups: Authentication (login, logout, token refresh), Properties (list, get, create, update, delete), Images (upload, reorder, set cover, delete), and Public (list properties with filters, get property detail).
3. FOR EACH endpoint, THE API design document SHALL specify whether the endpoint requires a valid JWT token or is publicly accessible without authentication.
4. THE API design document SHALL define pagination, filtering, and sorting parameters for all list endpoints.
5. THE API design document SHALL define standard error response structures including HTTP status code, error code string, and human-readable message fields.
6. WHEN an endpoint modifies the Storage_Service, THE API design document SHALL describe the expected sequence of API_Server operations; read-only endpoints SHALL NOT require this description.
7. THE Public_Website endpoints SHALL be read-only; THE API design document SHALL include no mutation endpoints under the public path prefix.

---

### Requirement 8: Güvenlik Mimarisi

**User Story:** As a security engineer, I want to see complete documentation of all security mechanisms from JWT management to file upload security, so that I can verify the system meets its security requirements.

#### Acceptance Criteria

1. THE System SHALL produce a security architecture document covering JWT token management, password hashing, input validation, rate limiting, HTTP security headers, CORS policy, environment variable management, Cloudinary access security, and file upload security.
2. WHEN the Admin authenticates, THE API_Server SHALL issue a short-lived access token and a longer-lived refresh token; THE security document SHALL specify recommended expiry durations for each.
3. THE security document SHALL specify that passwords are stored using bcrypt with a work factor of no less than 12.
4. THE security document SHALL specify that all user-supplied string inputs are validated against a schema before being processed by the API_Server.
5. THE security document SHALL specify that rate limiting is applied to the authentication endpoints with a threshold of no more than 10 requests per minute per IP address.
6. THE security document SHALL specify the HTTP security headers applied by Helmet.js including Content-Security-Policy, X-Content-Type-Options, and Strict-Transport-Security.
7. THE security document SHALL specify a CORS policy that allows requests only from the Public_Website origin and the Admin_Client origin.
8. THE security document SHALL specify that all secrets including database URL, JWT secret, and Cloudinary credentials are stored in environment variables and never committed to version control.
9. WHEN a file is uploaded via the Admin_Client, THE API_Server SHALL validate file MIME type and size before forwarding the file to the Storage_Service; THE security document SHALL specify the maximum allowed file size and permitted MIME types.
10. THE security document SHALL specify that Cloudinary upload credentials are used server-side only and are never exposed to the Public_Website or Admin_Client.

---

### Requirement 9: Geliştirme Yol Haritası

**User Story:** As a project manager, I want to see a development plan divided into independent and testable phases, so that I can coordinate developers on parallel work streams.

#### Acceptance Criteria

1. THE System SHALL produce a development roadmap document divided into sequential phases, where each phase delivers a testable and independently deployable increment.
2. THE Roadmap SHALL include at minimum the following phases: Project Scaffolding and Infrastructure, Database and API Foundation, Authentication Module, Property Management with CRUD and Image Upload, Public Website, Admin Desktop Client, and Security Hardening with Performance Optimization.
3. FOR EACH phase, THE Roadmap SHALL list the deliverables, the acceptance criteria for phase completion, and any prerequisite phases that must be completed first.
4. THE Roadmap SHALL identify which phases can be developed in parallel by independent developers.
5. WHERE a phase introduces a dependency on an external service such as Cloudinary or PostgreSQL, THE Roadmap SHALL include a step for verifying that service integration before the phase is considered complete.
6. THE Roadmap SHALL include a definition-of-done checklist applicable to all phases, covering unit tests, integration tests, and documentation updates.
