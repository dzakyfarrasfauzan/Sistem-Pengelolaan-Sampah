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

// Read and execute schema
try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
    console.log('✅ Database schema initialized successfully');
} catch (err) {
    console.error('❌ Error initializing database schema:', err.message);
}

// Seed default data if tables are empty
try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();

    if (userCount.count === 0) {
        console.log('📦 Seeding default data...');

        // Hash passwords
        const adminPassword = bcrypt.hashSync('admin123', 10);
        const petugasPassword = bcrypt.hashSync('petugas123', 10);

        // Insert admin user
        db.prepare(`
            INSERT INTO users (name, username, password, role, phone, status)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run('Administrator', 'admin', adminPassword, 'admin', '081234567890', 'aktif');

        // Insert petugas users
        db.prepare(`
            INSERT INTO users (name, username, password, role, phone, address, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run('Ahmad Petugas', 'petugas1', petugasPassword, 'petugas', '081234567891', 'Jl. Sukabumi No. 1', 'aktif');

        db.prepare(`
            INSERT INTO users (name, username, password, role, phone, address, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run('Budi Santoso', 'petugas2', petugasPassword, 'petugas', '081234567892', 'Jl. Pelabuhan No. 5', 'aktif');

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
        const jadwalData = [
            [1, 1, 2, today, '06:00', 'menunggu', 'Pengangkutan pagi wilayah Palabuhanratu'],
            [3, 2, 3, today, '08:00', 'menunggu', 'Pengangkutan pagi wilayah Cicurug'],
            [5, 3, 2, today, '10:00', 'menunggu', 'Pengangkutan siang wilayah Sukaraja']
        ];

        const insertJadwal = db.prepare(`
            INSERT INTO jadwal_pengangkutan (tps_id, kendaraan_id, petugas_id, tanggal, jam, status, catatan)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const j of jadwalData) {
            insertJadwal.run(...j);
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
            [1, 1, 1, 2, today, 'selesai', 'Pengangkutan selesai tanpa kendala'],
            [2, 3, 2, 3, today, 'selesai', 'Pengangkutan selesai, volume sampah cukup banyak']
        ];

        const insertLaporanPengangkutan = db.prepare(`
            INSERT INTO laporan_pengangkutan (jadwal_id, tps_id, kendaraan_id, petugas_id, tanggal_pengangkutan, status_pengangkutan, catatan)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const lp of laporanPengangkutanData) {
            insertLaporanPengangkutan.run(...lp);
        }

        console.log('✅ Default data seeded successfully');
    } else {
        console.log('ℹ️  Database already contains data, skipping seed');
    }
} catch (err) {
    console.error('❌ Error seeding data:', err.message);
}

module.exports = db;
