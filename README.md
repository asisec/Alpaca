<div align="center">

<img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-informational?style=flat-square" />
<img src="https://img.shields.io/badge/Electron-30.x-47848F?style=flat-square&logo=electron" />
<img src="https://img.shields.io/badge/SQLite-3.x-003B57?style=flat-square&logo=sqlite" />
<img src="https://img.shields.io/badge/Version-0.1.0-brightgreen?style=flat-square" />
<img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" />

# 🦙 Alpaca — Bilet Yönetim Sistemi

**Küçük ve orta ölçekli etkinlik organizatörleri için tasarlanmış, internet bağlantısı gerektirmeyen tam kapsamlı masaüstü bilet satış ve yönetim uygulaması.**

</div>

---

## ✨ Neden Alpaca?

Etkinlik yönetimini karmaşık web panellere, aylık aboneliklere veya internet bağlantısına bağımlı kalmadan yapın. Alpaca; konser, tiyatro, festival, seminer gibi her türlü etkinlik için bilet satışını, koltuk yönetimini ve giriş kontrolünü tek bir masaüstü uygulamasında birleştirir.

> Kurulum bir kez, çalışma sürekli. Veriniz size ait, sunucu maliyeti sıfır.

---

## 🖥️ Ekran Görüntüleri

> Koyu (dark) tema, modern ve sade arayüz ile profesyonel bir deneyim sunar.

| Genel Bakış | Etkinlikler | Bilet Al |
|:-----------:|:-----------:|:--------:|
| Dashboard & hızlı satış kasası | Etkinlik listesi & detay modalı | Koltuk haritası & seçim |

---

## 🚀 Özellikler

### 🎟️ Etkinlik Yönetimi
- Etkinlik oluşturma, düzenleme ve silme
- **Standart** ve **VIP** bilet fiyatlandırması
- Otomatik **indirim eşiği** tanımlama (örn. 10+ bilet → %15 indirim)
- Etkinlik bazlı kapasite takibi ve doluluk göstergesi
- Organizatör & abonelik yönetimi

### 💺 Koltuk Seçimi
- Görsel koltuk haritası üzerinden interaktif seçim
- Dolu / boş koltuk ayrımı
- Otomatik veya manuel koltuk atama

### 🛒 Hızlı Bilet Satışı (Kasa)
- Ana dashboard üzerinden tek ekranda sipariş oluşturma
- Müşteri adı, adet ve bilet türü girişi
- Anlık toplam fiyat hesaplama

### 📋 Sipariş Takibi
- Tüm siparişlerin filtrelenebilir listesi
- Koltuk numaraları ve ödeme durumu
- Sipariş kodları ve tarih kaydı

### ✅ Giriş Kontrol
- Bilet kodu ile katılımcı girişi doğrulama
- Hızlı check-in akışı

### 👥 Kullanıcı & Rol Sistemi
- **Admin** → tam yetki, kullanıcı onayları
- **Organizasyon** → kendi etkinliklerini yönetir
- **Bireysel** → etkinliklere göz atar, bilet alır, abone olur
- Kayıt onay akışı (admin onayı gerektiren organizasyon hesapları)

### 🌙 Arayüz
- Tam koyu (dark) tema, göz yormayan renk paleti
- Bootstrap 5 tabanlı, responsive bileşenler
- Toast bildirimleri, animasyonlu modallar
- Sidebar navigasyon, sayfa bazlı alt başlıklar

---

## 🛠️ Teknik Altyapı

| Katman | Teknoloji |
|--------|-----------|
| Masaüstü çerçeve | [Electron](https://electronjs.org) 30.x |
| Veritabanı | SQLite 3 (dosya tabanlı, yerel) |
| UI framework | Bootstrap 5 |
| Backend iletişim | Electron IPC (main ↔ renderer) |
| Güvenlik | Context Bridge + Preload izolasyonu |

---

## 📦 Kurulum

### Gereksinimler
- [Node.js](https://nodejs.org) **18 LTS** veya üzeri

### Adımlar

```bash
# 1. Repoyu klonlayın
git clone https://github.com/asisec/Alpaca.git
cd Alpaca

# 2. Bağımlılıkları kurun
cd electron-app
npm install

# 3. Uygulamayı başlatın
npm start
```

### Yapılandırma

Kök dizindeki `.env` dosyasını kontrol edin:

```env
SQLITE_PATH=./app.sqlite
```

> Veritabanı ilk çalıştırmada otomatik oluşturulur. Varsayılan admin hesabı için uygulamayı çalıştırıp kayıt olun.

---

## 🗺️ Yol Haritası

- [ ] Bilet PDF/QR çıktısı
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
