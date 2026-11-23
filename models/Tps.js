// ============================================
// Kelas Tps (tempat penampungan sementara)
// ============================================
const db = require('../database/db');
const JalurTps = require('./JalurTps');

class Tps {
    static tampil() {
        return db.prepare('SELECT * FROM tps ORDER BY created_at DESC').all();
    }

    static tampilSatu(id) {
        return db.prepare('SELECT * FROM tps WHERE id = ?').get(id);
    }

    static tambah({ nama_tps, alamat, kapasitas, status, catatan }) {
        return db.prepare(`INSERT INTO tps (nama_tps, alamat, kapasitas, status, catatan) VALUES (?, ?, ?, ?, ?)`)
            .run(nama_tps, alamat, kapasitas || null, status || 'aktif', catatan || null).lastInsertRowid;
    }

    static ubah(id, { nama_tps, alamat, kapasitas, status, catatan }) {
        db.prepare(`UPDATE tps SET nama_tps = ?, alamat = ?, kapasitas = ?, status = ?, catatan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(nama_tps, alamat, kapasitas || null, status || 'aktif', catatan || null, id);
    }

    // TPS cukup dilepas dari jalur layanan; jadwal tetap tercatat per jalur
    static hapus(id) {
        db.transaction(() => {
            JalurTps.hapusTps(id);
            db.prepare('DELETE FROM tps WHERE id = ?').run(id);
        })();
    }

    static jumlah(hanyaAktif = false) {
        return db.prepare(`SELECT COUNT(*) AS c FROM tps${hanyaAktif ? " WHERE status = 'aktif'" : ''}`).get().c;
    }
}

module.exports = Tps;
