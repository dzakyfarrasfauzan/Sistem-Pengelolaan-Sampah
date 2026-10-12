-- ============================================
-- Sistem Pengelolaan Sampah
-- Dinas Lingkungan Hidup Kabupaten Sukabumi
-- Database Schema
-- ============================================

-- Tabel Users (Admin & Petugas)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','petugas')),
    phone TEXT,
    address TEXT,
    status TEXT DEFAULT 'aktif' CHECK(status IN ('aktif','nonaktif')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabel TPS (Tempat Pembuangan Sementara)
CREATE TABLE IF NOT EXISTS tps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_tps TEXT NOT NULL,
    alamat TEXT NOT NULL,
    kapasitas TEXT,
    status TEXT DEFAULT 'aktif' CHECK(status IN ('aktif','nonaktif')),
    catatan TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Kendaraan
CREATE TABLE IF NOT EXISTS kendaraan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nomor_polisi TEXT NOT NULL,
    jenis_kendaraan TEXT NOT NULL,
    kapasitas_angkut TEXT,
    kondisi TEXT DEFAULT 'baik' CHECK(kondisi IN ('baik','rusak ringan','rusak berat')),
    status_penggunaan TEXT DEFAULT 'tersedia' CHECK(status_penggunaan IN ('tersedia','digunakan','maintenance')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Jadwal Pengangkutan
CREATE TABLE IF NOT EXISTS jadwal_pengangkutan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tps_id INTEGER NOT NULL REFERENCES tps(id),
    kendaraan_id INTEGER NOT NULL REFERENCES kendaraan(id),
    petugas_id INTEGER NOT NULL REFERENCES users(id),
    tanggal DATE NOT NULL,
    jam TIME NOT NULL,
    status TEXT DEFAULT 'menunggu' CHECK(status IN ('menunggu','berjalan','selesai','batal')),
    catatan TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Laporan Masyarakat
CREATE TABLE IF NOT EXISTS laporan_masyarakat (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kode_laporan TEXT UNIQUE NOT NULL,
    nama_pelapor TEXT NOT NULL,
    nomor_telepon TEXT NOT NULL,
    deskripsi TEXT NOT NULL,
    foto TEXT,
    latitude REAL,
    longitude REAL,
    alamat_lokasi TEXT,
    prioritas TEXT DEFAULT 'sedang' CHECK(prioritas IN ('tinggi','sedang','rendah')),
    status TEXT DEFAULT 'masuk' CHECK(status IN ('masuk','diproses','selesai')),
    ditangani_oleh INTEGER REFERENCES users(id),
    catatan_tindak_lanjut TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Laporan Pengangkutan
CREATE TABLE IF NOT EXISTS laporan_pengangkutan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jadwal_id INTEGER REFERENCES jadwal_pengangkutan(id),
    tps_id INTEGER NOT NULL REFERENCES tps(id),
    kendaraan_id INTEGER NOT NULL REFERENCES kendaraan(id),
    petugas_id INTEGER NOT NULL REFERENCES users(id),
    tanggal_pengangkutan DATE NOT NULL,
    status_pengangkutan TEXT DEFAULT 'selesai' CHECK(status_pengangkutan IN ('selesai','gagal','sebagian')),
    catatan TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
