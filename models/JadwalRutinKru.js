// ============================================
// Kelas JadwalRutinKru: kru yang bertugas pada jadwal rutin
// ============================================
const db = require('../database/db');

class JadwalRutinKru {
    // Simpan ulang daftar kru sebuah jadwal rutin
    static tambah(jadwalRutinId, kruIds) {
        db.prepare('DELETE FROM jadwal_rutin_kru WHERE jadwal_rutin_id = ?').run(jadwalRutinId);
        const ins = db.prepare('INSERT INTO jadwal_rutin_kru (jadwal_rutin_id, kru_id) VALUES (?, ?)');
        for (const k of kruIds) ins.run(jadwalRutinId, k);
    }

    static hapus(jadwalRutinId) {
        db.prepare('DELETE FROM jadwal_rutin_kru WHERE jadwal_rutin_id = ?').run(jadwalRutinId);
    }
}

module.exports = JadwalRutinKru;
