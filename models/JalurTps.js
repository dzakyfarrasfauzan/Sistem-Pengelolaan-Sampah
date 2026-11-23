// ============================================
// Kelas JalurTps: TPS yang dilewati setiap jalur layanan
// ============================================
const db = require('../database/db');

class JalurTps {
    // Simpan ulang daftar TPS sebuah jalur
    static tambah(jalurId, tpsIds) {
        db.prepare('DELETE FROM jalur_tps WHERE jalur_id = ?').run(jalurId);
        const ins = db.prepare('INSERT OR IGNORE INTO jalur_tps (jalur_id, tps_id) VALUES (?, ?)');
        for (const t of [...new Set((tpsIds || []).map(Number).filter(Boolean))]) ins.run(jalurId, t);
    }

    static hapus(jalurId) {
        db.prepare('DELETE FROM jalur_tps WHERE jalur_id = ?').run(jalurId);
    }

    static hapusTps(tpsId) {
        db.prepare('DELETE FROM jalur_tps WHERE tps_id = ?').run(tpsId);
    }
}

module.exports = JalurTps;
