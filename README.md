# 🎓 SitasiInstan

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version: 1.2](https://img.shields.io/badge/Version-1.2-green.svg)](#)
[![Status: Development](https://img.shields.io/badge/Status-In--Progress-blue.svg)](#)

**SitasiInstan** adalah ekstensi browser yang dirancang khusus untuk membantu mahasiswa Indonesia dalam menyusun sitasi dan daftar pustaka karya ilmiah secara cepat dan akurat. Proyek ini lahir dari pengamatan bahwa banyak mahasiswa masih merasa kesulitan, bingung, atau terbebani saat harus menggunakan tools kompleks seperti Mendeley atau Zotero.

---

## 🚀 Latar Belakang

Banyak mahasiswa menghabiskan waktu berjam-jam hanya untuk urusan format sitasi dan daftar pustaka. Meskipun alat seperti Mendeley dan Zotero sudah ada, kurva pembelajaran yang curam seringkali menjadi penghambat. **SitasiInstan** hadir untuk menyederhanakan proses tersebut dengan antarmuka yang lebih intuitif dan alur kerja yang jauh lebih ringan — cukup buka halaman, klik, dan sitasi siap.

---

## ✨ Fitur Utama

### ⚡ Instant Citation Generator
Buat sitasi dalam hitungan detik tanpa perlu konfigurasi plugin yang rumit. Metadata artikel diekstrak otomatis dari halaman yang sedang dibuka.

### 📚 Duo-Style Support
Mendukung dua format sitasi populer secara bersamaan:
- **APA 7th Edition** — lengkap dengan sitasi teks (*in-text*) dan daftar pustaka
- **Chicago 17th Edition** — lengkap dengan catatan kaki (*footnote*) dan bibliografi

### 🌐 Deteksi Halaman Web Otomatis
Membaca metadata tersembunyi (`citation_author`, `citation_title`, `citation_doi`, dll.) dari halaman jurnal online seperti OJS, Garuda, ScienceDirect, dan lainnya — termasuk deteksi otomatis Volume & Nomor dari breadcrumb halaman.

### 📄 Dukungan File PDF (v1.2)
Ekstraksi data langsung dari file PDF yang dibuka di browser, baik dari internet maupun file lokal di laptop, menggunakan teknologi PDF.js. Sistem membaca judul berdasarkan ukuran font terbesar, mendeteksi penulis, tahun, Volume/Nomor, dan DOI secara otomatis.

### 🏛️ Mode Repository / Skripsi / Tesis
Deteksi otomatis ketika halaman yang dibuka adalah repository universitas (ePrints, IDR, dll.). Mode ini menampilkan field khusus untuk nama universitas dan jenis dokumen (Skripsi S1, Tesis S2, Disertasi S3, Buku, Laporan Penelitian, Makalah Konferensi).

### 📥 Ekspor File .RIS
Unduh data bibliografi dalam format `.RIS` yang kompatibel dengan Mendeley, Zotero, EndNote, dan reference manager lainnya — termasuk field Volume dan Nomor.

### 🌙 Dark Mode
Tampilan gelap yang persisten — preferensi disimpan dan diingat untuk sesi berikutnya.

---

## 🛠️ Teknologi yang Digunakan

- **JavaScript** — logika utama, scraping, dan formatting sitasi
- **HTML & CSS** — antarmuka popup ekstensi
- **PDF.js (Mozilla)** — pembacaan dan parsing file PDF
- **Chrome Extension API (Manifest V3)** — `activeTab`, `scripting`, `storage`

---

## 📦 Instalasi

**1. Unduh repositori ini**

Klik tombol **Code → Download ZIP**, lalu ekstrak ke folder mana saja.

> Library PDF.js sudah disertakan di dalam repositori, tidak perlu mengunduh terpisah.

**2. Aktifkan Mode Developer di Chrome**

Buka `chrome://extensions/` → aktifkan toggle **Developer Mode** di pojok kanan atas.

**3. Load ekstensi**

Klik **Load Unpacked** → pilih folder `SitasiInstan/` hasil ekstrak tadi.

**4. Izinkan akses file lokal** *(untuk membaca PDF dari laptop)*

Masih di `chrome://extensions/` → klik **Details** pada kartu SitasiInstan → aktifkan **Allow access to file URLs**.

---

## 📝 Cara Penggunaan

### Mengutip Artikel Jurnal Online

1. Buka halaman artikel jurnal di browser (OJS, Garuda, ScienceDirect, dll.)
2. Klik ikon **SitasiInstan** di toolbar browser
3. Klik tombol **Ambil Data Halaman** — metadata akan terisi otomatis
4. Periksa dan koreksi data jika diperlukan (judul, penulis, volume, nomor, tahun)
5. Pilih gaya sitasi: **APA 7th** atau **Chicago 17th**
6. Klik **Buat Format Sitasi**
7. Klik **Salin Teks** pada bagian yang diinginkan (daftar pustaka atau sitasi teks)
8. *(Opsional)* Klik **Unduh .RIS** untuk mengekspor ke Mendeley/Zotero

### Mengutip dari File PDF

1. Buka file PDF di browser:
   - **PDF online**: klik link PDF dari website jurnal
   - **PDF lokal**: drag & drop file ke browser, atau tekan `Ctrl+O` lalu pilih file
2. Klik ikon **SitasiInstan** di toolbar browser
3. Klik tombol **Ambil Data Halaman** — ekstensi akan otomatis mendeteksi bahwa ini adalah PDF
4. Tunggu proses ekstraksi selesai (muncul pesan ✅)
5. **Periksa data dengan teliti** — akurasi PDF tergantung kualitas dokumen, koreksi jika ada yang salah
6. Lanjutkan seperti langkah 5–8 di atas

> **Catatan:** Jika muncul pesan gagal saat membaca PDF lokal, pastikan opsi *Allow access to file URLs* sudah diaktifkan (lihat langkah instalasi no. 5).

### Mengutip Skripsi / Tesis dari Repository

1. Buka halaman detail skripsi/tesis di repository universitas (ePrints, IDR, dll.)
2. Klik **Ambil Data Halaman** — ekstensi akan otomatis beralih ke **Mode Repository**
3. Periksa nama universitas dan pilih jenis dokumen yang sesuai (Skripsi/Tesis/Disertasi)
4. Pilih gaya sitasi dan klik **Buat Format Sitasi**

---

## 🖼️ Preview

Berikut adalah tampilan dari ekstensi **SitasiInstan**:

![Tampilan Ekstensi](images/preview-cite.png)

---

## 📋 Changelog

### v1.2 — PDF Support & Peningkatan Akurasi
- ✅ Tambah dukungan baca file PDF (lokal & online) menggunakan PDF.js
- ✅ Deteksi judul PDF berdasarkan ukuran font terbesar (lebih akurat)
- ✅ Deteksi Volume & Nomor dari breadcrumb halaman OJS dan teks PDF
- ✅ Tambah field Volume & Nomor di form (opsional, hanya muncul di mode jurnal)
- ✅ Field Volume & Nomor masuk ke output sitasi APA dan Chicago
- ✅ Ekspor .RIS kini menyertakan field VL (volume) dan IS (issue)
- ✅ Perbaikan casing nama institusi — singkatan seperti UIN, IAIN, UGM kini tetap kapital
- ✅ Validasi metadata PDF yang tidak valid (nama merek laptop, path file, dll.) diabaikan otomatis
- 🐛 Fix: `popup.js` yang sebelumnya di-load dua kali di `popup.html`

### v1.1 — Repository Support & Multi-Author
- ✅ Deteksi otomatis mode jurnal vs. repository
- ✅ Dukungan multi-penulis dengan format APA dan Chicago yang benar
- ✅ Dark mode dengan penyimpanan preferensi
- ✅ Ekspor file .RIS

### v1.0 — Rilis Awal
- ✅ Generator sitasi APA dan Chicago dasar
- ✅ Ekstraksi metadata dari halaman web

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah [MIT License](https://opensource.org/licenses/MIT).