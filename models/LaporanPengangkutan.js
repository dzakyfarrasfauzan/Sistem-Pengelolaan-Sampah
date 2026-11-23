// ============================================
// Kelas LaporanPengangkutan
// Laporan kegiatan pengangkutan tercatat otomatis atas nama sopir saat
// jadwal pengangkutan diselesaikan.
// ============================================
const db = require('../database/db');

class LaporanPengangkutan {
    static simpan(jadwal, tanggal, catatan, foto) {
        db.prepare(`INSERT INTO laporan_pengangkutan (jadwal_id, jalur_id, kendaraan_id, sopir_id, tanggal_pengangkutan, status_pengangkutan, catatan, foto_kegiatan)
                    VALUES (?, ?, ?, ?, ?, 'selesai', ?, ?)`)
          .run(jadwal.id, jadwal.jalur_id, jadwal.kendaraan_id, jadwal.sopir_id, tanggal, catatan || null, foto);
    }

    static hapus(jadwalId) {
        db.prepare('DELETE FROM laporan_pengangkutan WHERE jadwal_id = ?').run(jadwalId);
    }
}

module.exports = LaporanPengangkutan;
