-- ============================================
-- Sistem Pengelolaan Sampah
-- Dinas Lingkungan Hidup Kabupaten Sukabumi
-- Database Schema
-- ============================================

-- Tabel Users
-- admin    : admin Korwil yang mengelola data, jadwal, dan laporan masyarakat
-- pengawas : akun Bidang untuk memantau penanganan laporan masyarakat
-- sopir    : petugas operasional berperan sopir (pemimpin tim, dapat login)
-- kru      : petugas operasional berperan kru pengangkut (data saja, tidak login)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT NOT NULL CHECK(role IN ('admin','pengawas','sopir','kru')),
    phone TEXT,
    address TEXT,
    status TEXT DEFAULT 'aktif' CHECK(status IN ('aktif','nonaktif')),
    juga_kru INTEGER DEFAULT 0,     -- sopir yang pada jadwal lain juga bertugas sebagai kru
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Akun masyarakat (pelapor). Terpisah dari akun petugas.
-- Daftar dengan email + password (diverifikasi kode OTP) atau dengan akun Google.
CREATE TABLE IF NOT EXISTS masyarakat (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT,                  -- NULL bila hanya masuk dengan Google
    no_wa TEXT,
    google_id TEXT UNIQUE,
    email_terverifikasi INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Kode OTP yang dikirim ke email (verifikasi pendaftaran / atur ulang password)
CREATE TABLE IF NOT EXISTS otp_email (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    tujuan TEXT NOT NULL CHECK(tujuan IN ('verifikasi','reset')),
    kode_hash TEXT NOT NULL,
    kedaluwarsa DATETIME NOT NULL,
    percobaan INTEGER DEFAULT 0,
    dipakai INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
-- Jalur layanan: rute pengangkutan yang melewati beberapa titik, desa, dan TPS
CREATE TABLE IF NOT EXISTS jalur_layanan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_jalur TEXT NOT NULL,
    alamat_pelayanan TEXT,          -- jalan / titik yang dilewati
    desa TEXT,
    kecamatan TEXT,
    jarak_km REAL,
    waktu_tempuh_jam REAL DEFAULT 8,
    estimasi_tonase REAL,
    status TEXT DEFAULT 'aktif' CHECK(status IN ('aktif','nonaktif')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jalur_tps (
    jalur_id INTEGER NOT NULL REFERENCES jalur_layanan(id) ON DELETE CASCADE,
    tps_id INTEGER NOT NULL REFERENCES tps(id) ON DELETE CASCADE,
    PRIMARY KEY (jalur_id, tps_id)
);

-- Jadwal rutin mingguan (hari 1 = Senin ... 7 = Minggu)
CREATE TABLE IF NOT EXISTS jadwal_rutin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hari INTEGER NOT NULL CHECK(hari BETWEEN 1 AND 7),
    jalur_id INTEGER NOT NULL REFERENCES jalur_layanan(id),
    kendaraan_id INTEGER NOT NULL REFERENCES kendaraan(id),
    sopir_id INTEGER NOT NULL REFERENCES users(id),
    jam TIME NOT NULL,
    ritase INTEGER DEFAULT 1,
    status TEXT DEFAULT 'aktif' CHECK(status IN ('aktif','nonaktif')),
    catatan TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jadwal_rutin_kru (
    jadwal_rutin_id INTEGER NOT NULL REFERENCES jadwal_rutin(id) ON DELETE CASCADE,
    kru_id INTEGER NOT NULL REFERENCES users(id),
    PRIMARY KEY (jadwal_rutin_id, kru_id)
);

-- Jadwal harian: dibuat otomatis dari jadwal rutin, atau ditambahkan admin
-- dari permohonan pelayanan (jenis 'tambahan')
CREATE TABLE IF NOT EXISTS jadwal_pengangkutan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jenis TEXT NOT NULL DEFAULT 'tambahan' CHECK(jenis IN ('rutin','tambahan')),
    jadwal_rutin_id INTEGER REFERENCES jadwal_rutin(id) ON DELETE SET NULL,
    jalur_id INTEGER REFERENCES jalur_layanan(id),
    laporan_id INTEGER REFERENCES laporan_masyarakat(id), -- jadwal tambahan berasal dari laporan masyarakat
    lokasi TEXT,                    -- lokasi laporan bila tidak memakai jalur
    pemohon TEXT,
    kendaraan_id INTEGER NOT NULL REFERENCES kendaraan(id),
    sopir_id INTEGER REFERENCES users(id),
    tanggal DATE NOT NULL,
    jam TIME NOT NULL,
    durasi_jam REAL DEFAULT 8,
    ritase INTEGER DEFAULT 1,
    status TEXT DEFAULT 'menunggu' CHECK(status IN ('menunggu','berjalan','selesai','batal')),
    catatan TEXT,
    foto_kegiatan TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(jadwal_rutin_id, tanggal)
);

CREATE TABLE IF NOT EXISTS jadwal_kru (
    jadwal_id INTEGER NOT NULL REFERENCES jadwal_pengangkutan(id) ON DELETE CASCADE,
    kru_id INTEGER NOT NULL REFERENCES users(id),
    PRIMARY KEY (jadwal_id, kru_id)
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
    masyarakat_id INTEGER REFERENCES masyarakat(id), -- akun pelapor (laporan lewat website)
    sumber TEXT DEFAULT 'website' CHECK(sumber IN ('website','telepon','whatsapp','surat','datang langsung')),
    dicatat_oleh INTEGER REFERENCES users(id), -- admin yang mencatat laporan dari telepon/WhatsApp
    prioritas TEXT CHECK(prioritas IN ('tinggi','sedang','rendah')), -- NULL = belum ditentukan admin
    status TEXT DEFAULT 'masuk' CHECK(status IN ('masuk','diproses','selesai')),
    ditangani_oleh INTEGER REFERENCES users(id),
    catatan_tindak_lanjut TEXT,
    foto_tindak_lanjut TEXT,
    patokan TEXT,
    selesai_at DATETIME,
    rating INTEGER CHECK(rating BETWEEN 1 AND 5),
    ulasan TEXT,
    dinilai_at DATETIME,
    teguran_pengawas TEXT,
    teguran_at DATETIME,
    notif_terlambat_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Laporan Pengangkutan
CREATE TABLE IF NOT EXISTS laporan_pengangkutan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jadwal_id INTEGER REFERENCES jadwal_pengangkutan(id),
    jalur_id INTEGER REFERENCES jalur_layanan(id),
    kendaraan_id INTEGER NOT NULL REFERENCES kendaraan(id),
    sopir_id INTEGER NOT NULL REFERENCES users(id),
    tanggal_pengangkutan DATE NOT NULL,
    status_pengangkutan TEXT DEFAULT 'selesai' CHECK(status_pengangkutan IN ('selesai','gagal','sebagian')),
    catatan TEXT,
    foto_kegiatan TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Pemeriksaan Kendaraan (oleh Sopir, sesuai SOP kesiapan armada)
CREATE TABLE IF NOT EXISTS pemeriksaan_kendaraan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jadwal_id INTEGER NOT NULL REFERENCES jadwal_pengangkutan(id),
    kendaraan_id INTEGER NOT NULL REFERENCES kendaraan(id),
    sopir_id INTEGER NOT NULL REFERENCES users(id),
    jenis TEXT NOT NULL CHECK(jenis IN ('sebelum berangkat','sesudah pulang')),
    kondisi TEXT NOT NULL CHECK(kondisi IN ('baik','rusak ringan','rusak berat')),
    catatan TEXT,
    foto TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(jadwal_id, jenis)
);

-- Tabel Notifikasi (pemberitahuan untuk admin, sopir, dan pengawas; disimpan 30 hari)
CREATE TABLE IF NOT EXISTS notifikasi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    jenis TEXT NOT NULL,
    judul TEXT NOT NULL,
    pesan TEXT NOT NULL,
    tautan TEXT,
    dibaca INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifikasi_user ON notifikasi(user_id, id);
