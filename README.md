<div align="center">

<img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-informational?style=flat-square" />
<img src="https://img.shields.io/badge/Electron-30.x-47848F?style=flat-square&logo=electron" />
<img src="https://img.shields.io/badge/MongoDB-7.x-47A248?style=flat-square&logo=mongodb" />
<img src="https://img.shields.io/badge/Version-0.1.0-brightgreen?style=flat-square" />
<img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" />

# 🦙 Alpaca — Bilet Yönetim Sistemi

**Küçük ve orta ölçekli etkinlik organizatörleri için tasarlanmış tam kapsamlı masaüstü bilet satış ve yönetim uygulaması.**

<br/>

![Alpaca Login Screen](docs/screenshot.png)

</div>

---

## ✨ Neden Alpaca?

Etkinlik yönetimini karmaşık web panellere, aylık aboneliklere veya internet bağlantısına bağımlı kalmadan yapın. Alpaca; konser, tiyatro, festival, seminer gibi her türlü etkinlik için bilet satışını, koltuk yönetimini ve kapı kontrolünü tek bir masaüstü uygulamasında birleştirir.

> Kurulum bir kez, çalışma sürekli. Veriniz size ait, sunucu maliyeti sıfır.

---

##  Özellikler

### 🎟️ Etkinlik Yönetimi
- Etkinlik oluşturma, düzenleme ve silme
- **Standart** ve **VIP** bilet fiyatlandırması
- Otomatik **indirim eşiği** tanımlama (örn. 10+ bilet → %15 indirim)
- Etkinlik bazlı kapasite takibi ve doluluk göstergesi
- Organizatör & abonelik yönetimi

### 💺 Koltuk Seçimi
- Görsel koltuk haritası üzerinden interaktif seçim
- Standart / VIP koltuk ayrımı (renk kodlu)
- Dolu koltuklar otomatik devre dışı

### 🛒 Hızlı Bilet Satışı (Kasa)
- Ana dashboard üzerinden tek ekranda sipariş oluşturma
- Müşteri adı, adet ve bilet türü girişi
- Anlık toplam fiyat & indirim hesaplama

### 📋 Sipariş Takibi
- Tüm siparişlerin filtrelenebilir listesi
- Koltuk numaraları ve ödeme durumu
- Sipariş kodları ve tarih kaydı

### 🚪 Kapı Kontrolü
- Bilet kodu ile katılımcı girişi doğrulama
- Hızlı check-in akışı (yakında)

### � Şifre Sıfırlama Akışı
- Kullanıcı tarafından çok adımlı kimlik doğrulama formu (e-posta, son şifre, son ödeme tutarı)
- **Doğruluk skoru** hesaplama (e-posta +30, şifre eşleşmesi +40, ödeme tutarı +30)
- Admin onay/red akışı ve kullanıcıya not iletimi
- Onaylanan talep üzerinden güvenli yeni şifre belirleme

### �👥 Kullanıcı & Rol Sistemi
- **Yönetici** → tam yetki, kullanıcı onayları, şifre istekleri yönetimi
- **Organizasyon** → kendi etkinliklerini yönetir
- **Bireysel** → etkinliklere göz atar, bilet alır, abone olur
- Kayıt onay akışı (yönetici onayı gerektiren organizasyon hesapları)

### 🛡️ Yönetim Paneli
- Onay bekleyen organizasyonlar listesi
- Kullanıcı listesi: rol değiştirme, yönetici atama, şifre sıfırlama, silme
- Şifre sıfırlama istekleri: kart tabanlı liste, doğruluk skoru progress bar, admin notu ile onay/red

### 🌙 Arayüz
- Tam koyu (dark) tema, göz yormayan renk paleti
- Bootstrap 5 tabanlı bileşenler
- Toast bildirimleri, animasyonlu modallar
- Sidebar navigasyon, sayfa bazlı alt başlıklar

---

## 🛠️ Teknik Altyapı

| Katman | Teknoloji |
|--------|-----------|
| Masaüstü çerçeve | [Electron](https://electronjs.org) 30.x |
| Veritabanı | MongoDB 7 (Docker container) |
| ODM | Mongoose 8.x |
| UI framework | Bootstrap 5 |
| Backend iletişim | Electron IPC (main ↔ renderer) |
| Güvenlik | Context Bridge + Preload izolasyonu |
| Konteyner | Docker + Docker Compose |

---

## 📦 Kurulum

### Gereksinimler
- [Node.js](https://nodejs.org) **18 LTS** veya üzeri
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (MongoDB için)

### 1. Repoyu klonlayın

```bash
git clone https://github.com/asisec/Alpaca.git
cd Alpaca
```

### 2. `.env` dosyasını oluşturun

```bash
cp .env.example .env
```

`.env` içeriği:

```env
MONGODB_URI=mongodb://alpaca:alpaca123@localhost:27017/alpaca?authSource=admin
```

### 3. Electron bağımlılıklarını kurun

```bash
cd electron-app
npm install
```

### 4. Uygulamayı başlatın

**Windows için (önerilen) — MongoDB + Electron tek komutla:**

```powershell
.\start.ps1
```

**Manuel başlatma:**

```bash
docker compose up -d
cd electron-app
npm start
```

> MongoDB `localhost:27017`, Mongo Express yönetim arayüzü `http://localhost:8081` adresinde çalışır.

### 5. İlk yönetici hesabı oluşturma

Uygulamayı açıp kayıt olun, ardından:

```bash
cd electron-app
node scripts/make-admin.js sizin@email.com
```

---

### 🐳 Docker Servisleri

| Servis | Port | Açıklama |
|--------|------|----------|
| `alpaca-mongo` | `27017` | MongoDB veritabanı |
| `alpaca-mongo-express` | `8081` | Web tabanlı DB yönetim arayüzü |

```bash
# Durdur
docker compose down

# Verileri sıfırla (dikkat!)
docker compose down -v
```

---

## 🗺️ Yol Haritası

- [ ] Bilet PDF/QR çıktısı
- [ ] Kapı kontrolü QR okuyucu entegrasyonu
- [ ] Gelir raporları ve grafikler
- [ ] Çoklu etkinlik takvimi görünümü
- [ ] Exe paketleme (electron-builder)
- [ ] E-posta bildirimleri

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) ile lisanslanmıştır.

---

<div align="center">
  <strong>Alpaca</strong> · Bilet yönetimini sade, hızlı ve tamamen kontrolünüzde tutun.
</div>
