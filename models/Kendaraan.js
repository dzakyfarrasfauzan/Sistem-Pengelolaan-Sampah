// ============================================
// Kelas Kendaraan (armada pengangkut)
// ============================================
const db = require('../database/db');

class Kendaraan {
    static tampil() {
        return db.prepare('SELECT * FROM kendaraan ORDER BY created_at DESC').all();
    }

    static tampilSatu(id) {
        return db.prepare('SELECT * FROM kendaraan WHERE id = ?').get(id);
    }

    static tambah({ nomor_polisi, jenis_kendaraan, kapasitas_angkut, kondisi, status_penggunaan }) {
        return db.prepare(`INSERT INTO kendaraan (nomor_polisi, jenis_kendaraan, kapasitas_angkut, kondisi, status_penggunaan) VALUES (?, ?, ?, ?, ?)`)
            .run(nomor_polisi, jenis_kendaraan, kapasitas_angkut || null, kondisi || 'baik', status_penggunaan || 'tersedia').lastInsertRowid;
    }

    static ubah(id, { nomor_polisi, jenis_kendaraan, kapasitas_angkut, kondisi, status_penggunaan }) {
        db.prepare(`UPDATE kendaraan SET nomor_polisi = ?, jenis_kendaraan = ?, kapasitas_angkut = ?, kondisi = ?, status_penggunaan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(nomor_polisi, jenis_kendaraan, kapasitas_angkut || null, kondisi || 'baik', status_penggunaan || 'tersedia', id);
    }

    // Kendaraan dihapus beserta jadwal dan pemeriksaan yang memakainya
    static hapus(id) {
        db.transaction(() => {
            db.prepare('DELETE FROM pemeriksaan_kendaraan WHERE kendaraan_id = ? OR jadwal_id IN (SELECT id FROM jadwal_pengangkutan WHERE kendaraan_id = ?)').run(id, id);
            db.prepare('DELETE FROM laporan_pengangkutan WHERE kendaraan_id = ?').run(id);
            db.prepare('DELETE FROM jadwal_kru WHERE jadwal_id IN (SELECT id FROM jadwal_pengangkutan WHERE kendaraan_id = ?)').run(id);
            db.prepare('DELETE FROM jadwal_pengangkutan WHERE kendaraan_id = ?').run(id);
            db.prepare('DELETE FROM jadwal_rutin WHERE kendaraan_id = ?').run(id);
            db.prepare('DELETE FROM kendaraan WHERE id = ?').run(id);
        })();
    }

    // Kendaraan dalam perbaikan tidak dapat dijadwalkan. Hasil pesan kesalahan atau null.
    static cekBisaDijadwalkan(id) {
        const k = db.prepare('SELECT status_penggunaan FROM kendaraan WHERE id = ?').get(id);
        if (!k) return 'Kendaraan tidak ditemukan';
        return k.status_penggunaan === 'maintenance' ? 'Kendaraan sedang dalam perbaikan (maintenance) dan tidak dapat dijadwalkan' : null;
    }

    // Kendaraan yang kondisinya tidak baik (untuk dashboard admin)
    static perluPerbaikan() {
        return db.prepare(`SELECT id, nomor_polisi, jenis_kendaraan, kondisi FROM kendaraan WHERE kondisi != 'baik' ORDER BY nomor_polisi`).all();
    }

    // Kondisi dan status kendaraan mengikuti hasil pemeriksaan sopir
    static perbaruiKondisi(id, kondisi, statusPenggunaan) {
        db.prepare('UPDATE kendaraan SET kondisi = ?, status_penggunaan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(kondisi, statusPenggunaan, id);
    }
}

module.exports = Kendaraan;
