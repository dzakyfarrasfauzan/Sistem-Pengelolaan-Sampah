// ============================================
// Kelas JadwalKru: kru yang bertugas pada jadwal pengangkutan harian
// ============================================
const db = require('../database/db');

class JadwalKru {
    // Simpan ulang daftar kru sebuah jadwal harian
    static tambah(jadwalId, kruIds) {
        db.prepare('DELETE FROM jadwal_kru WHERE jadwal_id = ?').run(jadwalId);
        const ins = db.prepare('INSERT INTO jadwal_kru (jadwal_id, kru_id) VALUES (?, ?)');
        for (const k of kruIds) ins.run(jadwalId, k);
    }

    // Salin kru dari jadwal rutin ke jadwal harian
    static salinDariRutin(jadwalId, jadwalRutinId) {
        db.prepare('INSERT INTO jadwal_kru (jadwal_id, kru_id) SELECT ?, kru_id FROM jadwal_rutin_kru WHERE jadwal_rutin_id = ?').run(jadwalId, jadwalRutinId);
    }

    static hapus(jadwalId) {
        db.prepare('DELETE FROM jadwal_kru WHERE jadwal_id = ?').run(jadwalId);
    }
}

module.exports = JadwalKru;
