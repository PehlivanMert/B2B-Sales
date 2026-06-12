# TÜRSAB Seyahat Acentası Veri Çekici & CRM Platformu (TÜRSAB Travel Agency Scraper & CRM)

*(English version is below)*

Bu proje iki ana bileşenden oluşmaktadır: 
1. **TÜRSAB Veri Çekici (Scraper)**: TÜRSAB (Türkiye Seyahat Acentaları Birliği) resmi doğrulama sistemi üzerinden acenteleri çekerek temiz bir veri kümesi oluşturur.
2. **B2B Turizm Acentesi CRM ve Saha Operasyonları Platformu**: Çekilen veriler kullanılarak saha satış operasyonları için geliştirilmiş, harita destekli ve yüksek performanslı modern bir Progressive Web App (PWA).

## 🇹🇷 Türkçe Dokümantasyon

### Bölüm 1: Veri Çekici (Scraper)
* **Sorgulanan Belge Aralığı**: 1 - 25.000
* **Aktif En Yüksek Belge Numarası**: **18.868**
* **Toplam Bulunan Aktif Kayıt**: **17.144 satır** (Merkez ofisler ve tüm şubeler dahil)

`agencies_cache.db` (SQLite) dosyası tüm verileri barındırır. İşlem kesilirse `scrape_agencies_large.py` betiği kaldığı yerden devam edebilir. ASP.NET ViewState yönetimi, rastgele bekleme süreleri (anti-bot) ve çoklu iş parçacığı (25 worker thread) yapısıyla çalışır. Veriler `agency.xlsx` dosyasına çıkartılabilir.

### Bölüm 2: CRM Platformu (Geliştirme Aşamasında)
Mevcut SQLite veritabanı Firebase Firestore'a aktarılarak Vite + React tabanlı bir CRM uygulaması inşa edilmektedir.

**Temel Özellikler:**
* **Sanallaştırılmış Tablo**: 17.000+ acenteyi kasmadan görüntüleyebilen performanslı tablo (`TanStack Virtual`).
* **Saha Operasyonları Haritası**: `react-leaflet` ile acenteleri harita üzerinde gösterme ve toplu rota oluşturma.
* **CRM Notları ve Durum Yönetimi**: Satış ekiplerinin ajanslarla olan görüşmelerini not alabileceği alt-koleksiyon altyapısı.
* **Otomasyon**: Aylık olarak TÜRSAB verilerini güncelleyen ve yeni eklenen acenteleri otomatik sisteme çeken Github Actions senkronizasyonu.
* **Hızlı Aksiyonlar**: WhatsApp entegrasyonu, hızlı kopyalama özellikleri ve Resend API üzerinden toplu mail gönderimi.

---

## 🇬🇧 English Documentation

This project consists of two main components:
1. **TÜRSAB Scraper**: Extracts travel agency data from the official TÜRSAB (Association of Turkish Travel Agencies) validation system to create a clean dataset.
2. **B2B Tourism Agency CRM & Field Operations Platform**: A modern Progressive Web App (PWA) built for field sales operations, featuring interactive maps and high-performance tables based on the scraped data.

### Part 1: Data Scraper
* **Document Range Queried**: 1 - 25,000
* **Highest Active Document Number**: **18,868**
* **Total Active Records Found**: **17,144 rows** (Including main offices and branches)

The `agencies_cache.db` (SQLite) file holds all the data. The `scrape_agencies_large.py` script is resumable and handles ASP.NET ViewState tokens, anti-bot delays, and uses concurrency (25 threads) for fast execution. Results can be exported to `agency.xlsx`.

### Part 2: CRM Platform (Under Development)
The existing SQLite database is migrated to Firebase Firestore to power a Vite + React-based internal CRM.

**Core Features:**
* **Virtualized Data Grid**: A lightning-fast table handling 17,000+ records seamlessly using `TanStack Virtual`. Includes precise alignment and multi-criteria filtering (status, city, district).
* **Smart Address Parsing**: Implements an advanced script that matches agency address strings against a comprehensive dataset of all Turkish cities and districts to reliably extract location data automatically.
* **Field Operations Map**: An interactive map view using `react-leaflet` to display agencies directly from a zero-read-cost static JSON strategy and generate Google Maps routing for field visits.
* **CRM Notes & Status Management**: Firestore sub-collections allowing sales teams to log their interactions and update lead statuses.
* **Campaign History Management**: Track all bulk email campaigns, with abilities to search past campaigns by subject/sender and delete outdated campaign records directly from the UI.
* **Automation**: Monthly automated Github Actions workflows to scrape delta updates and keep the platform synchronized at zero cost.
* **Quick Actions**: WhatsApp chat generation, quick copy utilities, and bulk email campaigns via Resend API.
