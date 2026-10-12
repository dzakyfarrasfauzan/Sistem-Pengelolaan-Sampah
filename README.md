# Sistem Pengelolaan Sampah - DLH Kabupaten Sukabumi

Aplikasi web full-stack untuk pengelolaan sampah terpadu yang mencakup manajemen Tempat Pembuangan Sementara (TPS), armada kendaraan operasional, petugas, penjadwalan rute pengangkutan, serta partisipasi masyarakat melalui pelaporan kondisi sampah berbasis foto dan geolokasi.

Aplikasi terdiri dari dua bagian yang dijalankan terpisah:

- **Backend** (`web/`) — REST API berbasis Node.js + Express yang mengembalikan data JSON, berjalan di `http://localhost:3000`.
- **Frontend** (`web/frontend/`) — Single Page Application berbasis React + Vite, berjalan di `http://localhost:5173`.

## 🚀 Fitur Utama

### 👑 Admin
- Dashboard statistik (TPS, kendaraan, petugas, jadwal, laporan)
- Manajemen Data TPS (CRUD)
- Manajemen Kendaraan Operasional (CRUD)
- Manajemen Petugas (CRUD)
- Penjadwalan Rute Pengangkutan
- Pengelolaan Laporan Masyarakat (Prioritas & Status)

### 👷 Petugas Operasional
- Dashboard ringkasan tugas harian
- Melihat Jadwal Penugasan Pengangkutan
- Update status pengangkutan (Mulai/Selesai)
- Melihat dan menindaklanjuti Laporan Masyarakat Berprioritas

### 👥 Masyarakat (Public)
- Beranda Informasi Sistem
- Form Pelaporan Kondisi Sampah (Tanpa Login)
  - Unggah foto bukti
  - Deteksi lokasi otomatis (Geolocation API) dan peta interaktif (Leaflet)
- Cek Status Laporan menggunakan Kode Laporan atau No. Telepon

## 🛠️ Teknologi

### Backend
- **Runtime & Framework**: Node.js, Express.js
- **Database**: SQLite3 (`better-sqlite3`) — *ringan & tanpa server database eksternal*
- **Autentikasi**: `express-session` (berbasis cookie session) + `bcryptjs`
- **CORS**: `cors` (mengizinkan origin `http://localhost:5173` dengan credentials)
- **Upload**: Multer

### Frontend
- **Library UI**: React 19
- **Build Tool**: Vite
- **Routing**: React Router DOM
- **HTTP Client**: Axios (`withCredentials: true` agar cookie session terkirim)
- **Peta**: Leaflet + React Leaflet
- **Ikon**: Lucide React

## ⚙️ Cara Menjalankan Aplikasi

Pastikan **Node.js** (versi 18+ disarankan) sudah terinstal. Backend dan frontend dijalankan di **dua terminal terpisah**.

### 1. Jalankan Backend

```bash
cd web
npm install
npm run dev
```

Backend berjalan di `http://localhost:3000`.

> Database (`database/database.sqlite`) akan otomatis terbuat lengkap dengan data bawaan (seed data) saat server pertama kali dijalankan.

### 2. Jalankan Frontend

```bash
cd web/frontend
npm install
npm run dev
```

Buka browser dan akses: **`http://localhost:5173`**

> Backend harus sudah berjalan sebelum frontend digunakan, karena seluruh data diambil dari API di port 3000.

### Konfigurasi Alamat (Opsional)

Secara default backend di `http://localhost:3000` dan frontend di `http://localhost:5173`. Jika alamat berubah (misalnya saat di-deploy):

| Variabel | Lokasi | Default | Fungsi |
|----------|--------|---------|--------|
| `VITE_API_URL` | `web/frontend/.env` | `http://localhost:3000` | Alamat backend yang dipanggil frontend |
| `PORT` | environment backend | `3000` | Port backend |
| `FRONTEND_URL` | environment backend | `http://localhost:5173` | Origin frontend yang diizinkan CORS |

Semua pemanggilan API di frontend mengambil alamat dari `frontend/src/config.js`.

### Build Frontend untuk Produksi

```bash
cd web/frontend
npm run build
```

Hasil build berada di folder `web/frontend/dist/`.

## 🔑 Akun Default (Seed Data)

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Petugas | `petugas1` | `petugas123` |
| Petugas | `petugas2` | `petugas123` |

## 🔌 Ringkasan Endpoint API

| Prefix | Akses | Keterangan |
|--------|-------|------------|
| `POST /login`, `POST /logout`, `GET /me` | Publik / Login | Autentikasi berbasis session |
| `/api/public/laporan`, `/api/public/cek-status` | Publik | Kirim laporan & cek status laporan |
| `/admin/*` | Admin | Dashboard, CRUD TPS, kendaraan, petugas, jadwal, laporan masyarakat |
| `/petugas/*` | Petugas | Dashboard, jadwal, update status, laporan |
| `/api/*` | Login | Detail data per ID (TPS, kendaraan, petugas, jadwal, laporan) |
| `/uploads/*` | Publik | File foto laporan masyarakat |

## 📁 Struktur Direktori Utama

```text
web/
├── database/          # Skema SQL, koneksi & seed SQLite
├── middleware/        # Auth (session) & konfigurasi upload foto
├── public/
│   └── uploads/       # Foto laporan masyarakat
├── routes/            # Router Express (Admin, Petugas, Publik, Auth, API)
├── server.js          # Entry point backend
│
└── frontend/          # Aplikasi React (Vite)
    ├── public/        # Aset statis (favicon, ikon)
    ├── src/
    │   ├── assets/        # Gambar
    │   ├── components/    # Layout Admin & Petugas
    │   ├── pages/         # Halaman publik (Home, Login, Laporan, CekStatus)
    │   │   ├── admin/     # Halaman Admin
    │   │   └── petugas/   # Halaman Petugas
    │   ├── App.jsx        # Definisi routing
    │   ├── config.js      # Alamat backend API (VITE_API_URL)
    │   └── main.jsx       # Entry point frontend
    ├── index.html
    └── vite.config.js
```

## 📄 Lisensi
Sistem ini dibuat untuk keperluan Dinas Lingkungan Hidup Kabupaten Sukabumi.
