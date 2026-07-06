# Gayrimenkul Yönetim Sistemi

Profesyonel ve modern gayrimenkul platformu. Next.js 14, Node.js, Express, Prisma, PostgreSQL, Docker ve Nginx teknolojileri ile geliştirilmiştir.

## Özellikler

- **Modern Kullanıcı Arayüzü**: Karanlık (Dark) Tema, pürüzsüz animasyonlar.
- **Güçlü Backend API**: Nest-benzeri katmanlı Express mimarisi, Zod validasyonu, Rate-limit, Helmet ve Swagger.
- **İlan Yönetimi**: Resim yükleme (Cloudinary), gelişmiş filtreleme ve CRUD işlemleri.
- **Docker ve PM2 Desteği**: Production ortamına (Canlı) tam uyumlu konteyner mimarisi.
- **Python Admin Paneli**: Kapsamlı yönetim ve istatistik paneli.

---

## 🛠 Kurulum ve Geliştirme (Development)

Sistemi geliştirme modunda yerel ortamınızda ayağa kaldırmak için:

### Gereksinimler
- Node.js (v18+)
- PostgreSQL (v15+)
- Python (Admin Paneli için)

### Adım 1: Depoyu Klonlayın
```bash
git clone <repo-url>
cd gayrimenkul
```

### Adım 2: Ortam Değişkenleri
Proje kök dizinindeki `.env.example` dosyasını baz alarak `backend` ve `frontend` klasörleri için kendi `.env` dosyalarınızı oluşturun.
* Cloudinary ve veritabanı ayarlarının yapıldığından emin olun.

### Adım 3: Backend Başlatma
```bash
cd backend
npm install
npm run db:migrate
npm run dev
```

### Adım 4: Frontend Başlatma
```bash
cd frontend
npm install
npm run dev
```

### Adım 5: Admin Paneli Başlatma (Python)
```bash
cd admin
python -m venv venv
# Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
python run.py
```

---

## 🚀 Üretim (Production) Kurulumu

Production kurulumu için **Docker ve Docker Compose** önerilmektedir. Sistem; Frontend, Backend, PostgreSQL ve Nginx Reverse Proxy'yi tek komutla kuracak şekilde yapılandırılmıştır.

### 1. Ortamın Hazırlanması
Kök dizindeki `.env.example` dosyasını `.env` olarak kaydedip içerisindeki hassas şifreleri, portları ve API anahtarlarını production değerleriyle değiştirin.

```bash
cp .env.example .env
```

### 2. Docker ile Deployment
Docker ile tüm yapıyı (Nginx dahil) derleyip başlatmak için:

```bash
docker-compose up -d --build
```

Bu komut:
- `postgres` veritabanını oluşturur ve hazır olmasını bekler.
- `backend` imajını derler (Prisma migrate/generate işlemleri yapılır).
- `frontend` uygulamasını standalone olarak build edip minimal imaja kopyalar.
- `nginx` reverse-proxy'yi ayağa kaldırıp, statik dosyalara cache policy uygular.

Sistem ayağa kalktıktan sonra `http://<sunucu-ip>` üzerinden siteye erişebilirsiniz.

### Alternatif: PM2 ile Kurulum (Sadece Backend)
Docker kullanılmayacaksa, backend'i PM2 ile Cluster modunda başlatabilirsiniz:
```bash
cd backend
npm run build
npm install -g pm2
pm2 start ecosystem.config.js
```

---

## 🔐 Güvenlik (Security)

Production ortamı için API aşağıdaki güvenlik önlemlerini kullanmaktadır:
- **Helmet**: Tüm isteklerde katı güvenlik header'ları.
- **CORS**: Yalnızca belirtilen `CORS_ORIGIN` üzerinden gelen isteklere izin verilir.
- **Rate Limit**: Brute-force saldırılarına karşı IP başına genel istek limiti.
- **JWT**: Kullanıcı oturum doğrulamasında token mimarisi.

## 📖 API Dokümantasyonu (Swagger)

Backend sunucusu çalışırken tüm REST endpoint'lerini ve şemaları detaylı görmek için Swagger arayüzünü ziyaret edebilirsiniz:

**Geliştirme Ortamı:** `http://localhost:5000/api-docs`

---

## 📝 Teknik Altyapı ve Test

Tüm bileşenler, kapsayıcı birim ve entegrasyon testleriyle (Jest & Supertest) doğrulanmıştır. 

```bash
cd backend
npm run test
```

Başarılı Deployment'lar!
