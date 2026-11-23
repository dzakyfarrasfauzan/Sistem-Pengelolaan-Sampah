// ============================================
// Kelas JalurLayanan: rute pengangkutan beserta TPS yang dilewati
// ============================================
const db = require('../database/db');
const { Galat } = require('./Galat');
const JalurTps = require('./JalurTps');
const { angka } = require('../utils/waktu');

const SELECT_JALUR = `
    SELECT jl.*,
           (SELECT GROUP_CONCAT(t.nama_tps, ', ') FROM jalur_tps jt JOIN tps t ON t.id = jt.tps_id WHERE jt.jalur_id = jl.id) AS tps_names,
           (SELECT GROUP_CONCAT(jt.tps_id) FROM jalur_tps jt WHERE jt.jalur_id = jl.id) AS tps_ids,
           (SELECT COUNT(*) FROM jadwal_rutin r WHERE r.jalur_id = jl.id AND r.status = 'aktif') AS jumlah_rutin
    FROM jalur_layanan jl`;

class JalurLayanan {
    static tampil() {
        return db.prepare(`${SELECT_JALUR} ORDER BY jl.status, jl.nama_jalur`).all();
    }

    static tambah(b) {
        if (!b.nama_jalur || !b.nama_jalur.trim()) throw new Galat(400, 'Nama jalur wajib diisi');
        return db.transaction(() => {
            const { lastInsertRowid } = db.prepare(`INSERT INTO jalur_layanan (nama_jalur, alamat_pelayanan, desa, kecamatan, jarak_km, waktu_tempuh_jam, estimasi_tonase, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(b.nama_jalur.trim(), b.alamat_pelayanan || null, b.desa || null, b.kecamatan || null,
                angka(b.jarak_km), angka(b.waktu_tempuh_jam) || 8, angka(b.estimasi_tonase), b.status || 'aktif');
            JalurTps.tambah(lastInsertRowid, b.tps_ids);
            return lastInsertRowid;
        })();
    }

    static ubah(id, b) {
        if (!b.nama_jalur || !b.nama_jalur.trim()) throw new Galat(400, 'Nama jalur wajib diisi');
        db.transaction(() => {
            db.prepare(`UPDATE jalur_layanan SET nama_jalur = ?, alamat_pelayanan = ?, desa = ?, kecamatan = ?, jarak_km = ?, waktu_tempuh_jam = ?,
                estimasi_tonase = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(b.nama_jalur.trim(), b.alamat_pelayanan || null,
                b.desa || null, b.kecamatan || null, angka(b.jarak_km), angka(b.waktu_tempuh_jam) || 8, angka(b.estimasi_tonase), b.status || 'aktif', id);
            JalurTps.tambah(id, b.tps_ids);
        })();
    }

    // Jalur yang sudah dipakai pada jadwal tidak dapat dihapus
    static hapus(id) {
        const dipakai = db.prepare('SELECT 1 FROM jadwal_rutin WHERE jalur_id = ? UNION SELECT 1 FROM jadwal_pengangkutan WHERE jalur_id = ? LIMIT 1').get(id, id);
        if (dipakai) throw new Galat(400, 'Jalur sudah dipakai pada jadwal. Ubah statusnya menjadi nonaktif.');
        db.prepare('DELETE FROM jalur_layanan WHERE id = ?').run(id);
    }

    static jumlahAktif() {
        return db.prepare("SELECT COUNT(*) as count FROM jalur_layanan WHERE status = 'aktif'").get().count;
    }

    static waktuTempuh(id) {
        return (db.prepare('SELECT waktu_tempuh_jam FROM jalur_layanan WHERE id = ?').get(id) || {}).waktu_tempuh_jam || 8;
    }
}

module.exports = JalurLayanan;
