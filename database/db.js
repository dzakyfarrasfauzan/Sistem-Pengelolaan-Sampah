// ============================================
// Database Module (better-sqlite3)
// Sistem Pengelolaan Sampah - DLH Sukabumi
// ============================================

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Database file path
const dbPath = path.join(__dirname, 'database.sqlite');

// Create/open database
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// ============================================
// Migrasi database lama ke struktur petugas operasional (sopir + kru)
// SQLite tidak bisa mengubah CHECK/NOT NULL, sehingga tabel dibangun ulang (data tetap).
// ============================================
const kolomAda = (tabel, kolom) => db.prepare(`PRAGMA table_info(${tabel})`).all().some(c => c.name === kolom);
const tabelAda = (tabel) => !!db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(tabel);

try {
    // 1. Tabel users: peran admin, pengawas, sopir, kru. Petugas lama menjadi kru (tanpa akun login).
    const usersSql = tabelAda('users') ? db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'").get().sql : null;
    if (usersSql && !usersSql.includes("'kru'")) {
        db.pragma('foreign_keys = OFF');
        db.exec(`
            BEGIN;
            CREATE TABLE users_baru (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                username TEXT UNIQUE,
                password TEXT,
                role TEXT NOT NULL CHECK(role IN ('admin','pengawas','sopir','kru')),
                phone TEXT,
                address TEXT,
                status TEXT DEFAULT 'aktif' CHECK(status IN ('aktif','nonaktif')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            INSERT INTO users_baru (id, name, username, password, role, phone, address, status, created_at, updated_at)
                SELECT id, name,
                       CASE WHEN role = 'petugas' THEN NULL ELSE username END,
                       CASE WHEN role = 'petugas' THEN NULL ELSE password END,
                       CASE WHEN role = 'petugas' THEN 'kru' ELSE role END,
                       phone, address, status, created_at, updated_at
                FROM users;
            DROP TABLE users;
            ALTER TABLE users_baru RENAME TO users;
            COMMIT;
        `);
        db.pragma('foreign_keys = ON');
        console.log('✅ Petugas lama dipindahkan menjadi kru pada petugas operasional');
    }

    // 2. Jadwal: petugas_id diganti tabel jadwal_kru (satu sopir dan beberapa kru per jadwal)
    if (tabelAda('jadwal_pengangkutan')) {
        if (!kolomAda('jadwal_pengangkutan', 'sopir_id')) {
            db.prepare('ALTER TABLE jadwal_pengangkutan ADD COLUMN sopir_id INTEGER REFERENCES users(id)').run();
        }
        if (kolomAda('jadwal_pengangkutan', 'petugas_id')) {
            db.pragma('foreign_keys = OFF');
            db.exec(`
                BEGIN;
                CREATE TABLE IF NOT EXISTS jadwal_kru (
                    jadwal_id INTEGER NOT NULL REFERENCES jadwal_pengangkutan(id) ON DELETE CASCADE,
                    kru_id INTEGER NOT NULL REFERENCES users(id),
                    PRIMARY KEY (jadwal_id, kru_id)
                );
                INSERT OR IGNORE INTO jadwal_kru (jadwal_id, kru_id)
                    SELECT id, petugas_id FROM jadwal_pengangkutan WHERE petugas_id IS NOT NULL;
                CREATE TABLE jadwal_baru (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tps_id INTEGER NOT NULL REFERENCES tps(id),
                    kendaraan_id INTEGER NOT NULL REFERENCES kendaraan(id),
                    sopir_id INTEGER REFERENCES users(id),
                    tanggal DATE NOT NULL,
                    jam TIME NOT NULL,
                    status TEXT DEFAULT 'menunggu' CHECK(status IN ('menunggu','berjalan','selesai','batal')),
                    catatan TEXT,
                    foto_kegiatan TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                INSERT INTO jadwal_baru (id, tps_id, kendaraan_id, sopir_id, tanggal, jam, status, catatan, foto_kegiatan, created_at, updated_at)
                    SELECT id, tps_id, kendaraan_id, sopir_id, tanggal, jam, status, catatan, foto_kegiatan, created_at, updated_at
                    FROM jadwal_pengangkutan;
                DROP TABLE jadwal_pengangkutan;
                ALTER TABLE jadwal_baru RENAME TO jadwal_pengangkutan;
                COMMIT;
            `);
            db.pragma('foreign_keys = ON');
            console.log('✅ Jadwal pengangkutan memakai sopir dan kru');
        }
    }

    // 3. Laporan kegiatan pengangkutan dicatat atas nama sopir
    if (tabelAda('laporan_pengangkutan') && kolomAda('laporan_pengangkutan', 'petugas_id')) {
        db.exec(`
            ALTER TABLE laporan_pengangkutan RENAME COLUMN petugas_id TO sopir_id;
            UPDATE laporan_pengangkutan
               SET sopir_id = (SELECT j.sopir_id FROM jadwal_pengangkutan j WHERE j.id = laporan_pengangkutan.jadwal_id)
             WHERE EXISTS (SELECT 1 FROM jadwal_pengangkutan j WHERE j.id = laporan_pengangkutan.jadwal_id AND j.sopir_id IS NOT NULL);
        `);
        console.log('✅ Laporan pengangkutan dicatat atas nama sopir');
    }
} catch (err) {
    try { db.exec('ROLLBACK'); } catch { /* tidak ada transaksi aktif */ }
    db.pragma('foreign_keys = ON');
    console.error('❌ Gagal migrasi petugas operasional:', err.message);
}

// Read and execute schema
try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
    console.log('✅ Database schema initialized successfully');
} catch (err) {
    console.error('❌ Error initializing database schema:', err.message);
}

// Migrasi otomatis: tambahkan kolom baru pada database yang sudah ada
const tambahKolom = (tabel, kolom, tipe) => {
    try {
        db.prepare(`ALTER TABLE ${tabel} ADD COLUMN ${kolom} ${tipe}`).run();
        console.log(`✅ Kolom ${tabel}.${kolom} ditambahkan`);
    } catch (e) {
        if (!e.message.includes('duplicate column')) console.error('❌', e.message);
    }
};
tambahKolom('laporan_masyarakat', 'patokan', 'TEXT');
tambahKolom('laporan_masyarakat', 'foto_tindak_lanjut', 'TEXT');
tambahKolom('jadwal_pengangkutan', 'foto_kegiatan', 'TEXT');
tambahKolom('laporan_pengangkutan', 'foto_kegiatan', 'TEXT');
tambahKolom('laporan_masyarakat', 'selesai_at', 'DATETIME');
tambahKolom('laporan_masyarakat', 'rating', 'INTEGER CHECK(rating BETWEEN 1 AND 5)');
tambahKolom('laporan_masyarakat', 'ulasan', 'TEXT');
tambahKolom('laporan_masyarakat', 'dinilai_at', 'DATETIME');
tambahKolom('laporan_masyarakat', 'teguran_pengawas', 'TEXT');
tambahKolom('laporan_masyarakat', 'teguran_at', 'DATETIME');
tambahKolom('laporan_masyarakat', 'notif_terlambat_at', 'DATETIME');

// Seed default data if tables are empty
try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();

    if (userCount.count === 0) {
        console.log('📦 Seeding default data...');

        // Akun login: admin Korwil, pengawas Bidang, dan sopir (pemimpin tim)
        const akun = db.prepare(`INSERT INTO users (name, username, password, role, phone, address, status) VALUES (?, ?, ?, ?, ?, ?, 'aktif')`);
        akun.run('Administrator', 'admin', bcrypt.hashSync('admin123', 10), 'admin', '081234567890', null);           // id 1
        akun.run('Pengawas Bidang', 'pengawas', bcrypt.hashSync('pengawas123', 10), 'pengawas', '081234567899', null); // id 2
        akun.run('Dedi Sopir', 'sopir1', bcrypt.hashSync('sopir123', 10), 'sopir', '081234567893', 'Jl. Cibadak No. 3'); // id 3
        akun.run('Ujang Sopir', 'sopir2', bcrypt.hashSync('sopir123', 10), 'sopir', '081234567894', 'Jl. Cisaat No. 7'); // id 4

        // Kru pengangkut: data petugas operasional tanpa akun login (id 5-8)
        const kru = db.prepare(`INSERT INTO users (name, role, phone, address, status) VALUES (?, 'kru', ?, ?, 'aktif')`);
        kru.run('Ahmad', '081234567891', 'Jl. Sukabumi No. 1');
        kru.run('Budi Santoso', '081234567892', 'Jl. Pelabuhan No. 5');
        kru.run('Cecep', '081234567895', 'Jl. Cikembar No. 2');
        kru.run('Dadang', '081234567896', 'Jl. Cicurug No. 9');

        // Insert sample TPS
        const tpsData = [
            ['TPS Palabuhanratu', 'Jl. Raya Palabuhanratu No. 10, Kec. Palabuhanratu', '8 ton', 'aktif', 'TPS utama kawasan Palabuhanratu'],
            ['TPS Cikembar', 'Jl. Raya Cikembar No. 5, Kec. Cikembar', '6 ton', 'aktif', 'Melayani wilayah Cikembar dan sekitarnya'],
            ['TPS Cicurug', 'Jl. Siliwangi No. 20, Kec. Cicurug', '10 ton', 'aktif', 'TPS terbesar wilayah utara'],
            ['TPS Cisaat', 'Jl. Raya Cisaat No. 15, Kec. Cisaat', '5 ton', 'aktif', 'TPS kawasan Cisaat'],
            ['TPS Sukaraja', 'Jl. Raya Sukaraja No. 8, Kec. Sukaraja', '7 ton', 'aktif', 'Melayani kawasan Sukaraja dan Kadudampit']
        ];

        const insertTps = db.prepare(`
            INSERT INTO tps (nama_tps, alamat, kapasitas, status, catatan)
            VALUES (?, ?, ?, ?, ?)
        `);
        for (const tps of tpsData) {
            insertTps.run(...tps);
        }

        // Insert sample kendaraan
        const kendaraanData = [
            ['F 8001 AB', 'Dump Truck', '8 ton', 'baik', 'tersedia'],
            ['F 8002 CD', 'Arm Roll Truck', '6 ton', 'baik', 'tersedia'],
            ['F 8003 EF', 'Compactor Truck', '10 ton', 'baik', 'tersedia']
        ];

        const insertKendaraan = db.prepare(`
            INSERT INTO kendaraan (nomor_polisi, jenis_kendaraan, kapasitas_angkut, kondisi, status_penggunaan)
            VALUES (?, ?, ?, ?, ?)
        `);
        for (const k of kendaraanData) {
            insertKendaraan.run(...k);
        }

        // Get today's date formatted
        const today = new Date().toISOString().split('T')[0];

        // Insert sample jadwal pengangkutan
        // [tps, kendaraan, sopir, [kru], tanggal, jam, status, catatan]
        const jadwalData = [
            [1, 1, 3, [5, 6], today, '06:00', 'menunggu', 'Pengangkutan pagi wilayah Palabuhanratu'],
            [3, 2, 4, [7, 8], today, '08:00', 'menunggu', 'Pengangkutan pagi wilayah Cicurug'],
            [5, 3, 3, [5, 6], today, '10:00', 'menunggu', 'Pengangkutan siang wilayah Sukaraja']
        ];

        const insertJadwal = db.prepare(`
            INSERT INTO jadwal_pengangkutan (tps_id, kendaraan_id, sopir_id, tanggal, jam, status, catatan)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const insertJadwalKru = db.prepare('INSERT INTO jadwal_kru (jadwal_id, kru_id) VALUES (?, ?)');
        for (const [tps, kendaraan, sopir, daftarKru, tgl, jam, status, catatan] of jadwalData) {
            const { lastInsertRowid } = insertJadwal.run(tps, kendaraan, sopir, tgl, jam, status, catatan);
            for (const k of daftarKru) insertJadwalKru.run(lastInsertRowid, k);
        }

        // Insert sample laporan masyarakat
        const laporanData = [
            ['LP-1001', 'Siti Nurhaliza', '081300001111', 'Sampah menumpuk di pinggir jalan sudah 3 hari tidak diangkut, menimbulkan bau tidak sedap', null, -6.9271, 106.9300, 'Jl. Raya Palabuhanratu, Kec. Palabuhanratu', 'tinggi', 'masuk'],
            ['LP-1002', 'Asep Supriatna', '081300002222', 'Tempat sampah di taman kota sudah penuh dan berserakan', null, -6.9180, 106.9270, 'Taman Kota Palabuhanratu, Kec. Palabuhanratu', 'sedang', 'diproses'],
            ['LP-1003', 'Dewi Lestari', '081300003333', 'Ada pembuangan sampah liar di lahan kosong', null, -6.8800, 106.8100, 'Jl. Cikembar Raya, Kec. Cikembar', 'rendah', 'selesai']
        ];

        const insertLaporan = db.prepare(`
            INSERT INTO laporan_masyarakat (kode_laporan, nama_pelapor, nomor_telepon, deskripsi, foto, latitude, longitude, alamat_lokasi, prioritas, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const l of laporanData) {
            insertLaporan.run(...l);
        }

        // Insert sample laporan pengangkutan
        const laporanPengangkutanData = [
            [1, 1, 1, 3, today, 'selesai', 'Pengangkutan selesai tanpa kendala'],
            [2, 3, 2, 4, today, 'selesai', 'Pengangkutan selesai, volume sampah cukup banyak']
        ];

        const insertLaporanPengangkutan = db.prepare(`
            INSERT INTO laporan_pengangkutan (jadwal_id, tps_id, kendaraan_id, sopir_id, tanggal_pengangkutan, status_pengangkutan, catatan)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const lp of laporanPengangkutanData) {
            insertLaporanPengangkutan.run(...lp);
        }

        console.log('✅ Default data seeded successfully');
    } else {
        console.log('ℹ️  Database already contains data, skipping seed');
        // Database lama: pastikan ada akun sopir dan akun pengawas contoh
        const adaPeran = (role) => db.prepare('SELECT COUNT(*) AS count FROM users WHERE role = ?').get(role).count > 0;
        if (!adaPeran('sopir')) {
            db.prepare(`INSERT INTO users (name, username, password, role, phone, address, status) VALUES (?, ?, ?, 'sopir', ?, ?, 'aktif')`)
              .run('Dedi Sopir', 'sopir1', bcrypt.hashSync('sopir123', 10), '081234567893', 'Jl. Cibadak No. 3');
            console.log('✅ Akun sopir contoh dibuat (sopir1 / sopir123)');
        }
        if (!adaPeran('pengawas')) {
            db.prepare(`INSERT INTO users (name, username, password, role, phone, status) VALUES (?, ?, ?, 'pengawas', ?, 'aktif')`)
              .run('Pengawas Bidang', 'pengawas', bcrypt.hashSync('pengawas123', 10), '081234567899');
            console.log('✅ Akun pengawas contoh dibuat (pengawas / pengawas123)');
        }
    }
} catch (err) {
    console.error('❌ Error seeding data:', err.message);
}

module.exports = db;
