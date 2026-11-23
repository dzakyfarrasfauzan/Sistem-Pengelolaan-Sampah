// ============================================
// Kelas JadwalRutin
// Jadwal mingguan per jalur layanan diisi admin sekali, lalu sistem membuat
// jadwal pengangkutan harian otomatis untuk 7 hari ke depan.
// ============================================
const db = require('../database/db');
const { Galat } = require('./Galat');
const User = require('./User');
const JalurLayanan = require('./JalurLayanan');
const JadwalRutinKru = require('./JadwalRutinKru');
const JadwalKru = require('./JadwalKru');
const Notifikasi = require('./Notifikasi');
const { NAMA_HARI, hariIni, tambahHari, hariDari, normalKru } = require('../utils/waktu');
const { uraikanBentrok, beririsan } = require('../utils/bentrok');

const HARI_KE_DEPAN = 7;
const PESAN_BENTROK = 'Jadwal bentrok dengan jadwal lain. Periksa daftar di bawah, lalu pilih "Tetap Simpan" bila memang disengaja.';

const SELECT_RUTIN = `
    SELECT r.*, jl.nama_jalur, jl.desa, jl.kecamatan, jl.waktu_tempuh_jam, jl.jarak_km, jl.estimasi_tonase,
           k.nomor_polisi, k.jenis_kendaraan, s.name AS sopir_name,
           (SELECT GROUP_CONCAT(u.name, ', ') FROM jadwal_rutin_kru rk JOIN users u ON u.id = rk.kru_id WHERE rk.jadwal_rutin_id = r.id) AS kru_names,
           (SELECT GROUP_CONCAT(rk.kru_id) FROM jadwal_rutin_kru rk WHERE rk.jadwal_rutin_id = r.id) AS kru_ids
    FROM jadwal_rutin r
    LEFT JOIN jalur_layanan jl ON jl.id = r.jalur_id
    LEFT JOIN kendaraan k ON k.id = r.kendaraan_id
    LEFT JOIN users s ON s.id = r.sopir_id`;

class JadwalRutin {
    static get PESAN_BENTROK() { return PESAN_BENTROK; }

    static tampil() {
        return db.prepare(`${SELECT_RUTIN} ORDER BY r.hari, r.jam, k.nomor_polisi`).all();
    }

    static validasi(b, kruIds) {
        const hari = Number(b.hari);
        if (!(hari >= 1 && hari <= 7)) return 'Hari tidak valid';
        if (!b.jalur_id) return 'Jalur layanan wajib dipilih';
        if (!b.kendaraan_id) return 'Armada wajib dipilih';
        if (!b.jam) return 'Jam berangkat wajib diisi';
        return User.validasiTim(b.sopir_id, kruIds);
    }

    // Bentrok antar-jadwal rutin pada hari yang sama
    static cekBentrok({ hari, jam, jalur_id, kendaraan_id, sopir_id, kru_ids, kecualiId }) {
        const kruIds = normalKru(kru_ids);
        const durasi = JalurLayanan.waktuTempuh(jalur_id);
        const lain = db.prepare(`
            SELECT r.id, r.jam, COALESCE(jl.waktu_tempuh_jam, 8) AS durasi, r.kendaraan_id, r.sopir_id, jl.nama_jalur,
                   k.nomor_polisi, s.name AS sopir_name,
                   (SELECT GROUP_CONCAT(rk.kru_id) FROM jadwal_rutin_kru rk WHERE rk.jadwal_rutin_id = r.id) AS kru_ids
            FROM jadwal_rutin r
            JOIN jalur_layanan jl ON jl.id = r.jalur_id
            LEFT JOIN kendaraan k ON k.id = r.kendaraan_id
            LEFT JOIN users s ON s.id = r.sopir_id
            WHERE r.hari = ? AND r.status = 'aktif' AND r.id != ?
        `).all(hari, kecualiId || 0).filter(o => beririsan(jam, durasi, o.jam, o.durasi));
        return uraikanBentrok(lain, { kendaraan_id, sopir_id, kruIds }, (o) => `${o.nama_jalur} hari ${NAMA_HARI[hari]}`);
    }

    // Simpan jadwal rutin baru lalu buat jadwal harian. Hasilnya jumlah jadwal harian yang dibuat.
    static tambah(b) {
        const kruIds = normalKru(b.kru_ids);
        const err = JadwalRutin.validasi(b, kruIds);
        if (err) throw new Galat(400, err);
        if (!b.paksa) {
            const bentrok = JadwalRutin.cekBentrok({ ...b, hari: Number(b.hari), kru_ids: kruIds });
            if (bentrok.length) throw new Galat(409, PESAN_BENTROK, { bentrok });
        }
        db.transaction(() => {
            const { lastInsertRowid } = db.prepare(`INSERT INTO jadwal_rutin (hari, jalur_id, kendaraan_id, sopir_id, jam, ritase, status, catatan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
                .run(Number(b.hari), b.jalur_id, b.kendaraan_id, b.sopir_id, b.jam, Number(b.ritase) || 1, b.status || 'aktif', b.catatan || null);
            JadwalRutinKru.tambah(lastInsertRowid, kruIds);
        })();
        return JadwalRutin.buatJadwalHarian();
    }

    static ubah(id, b) {
        const kruIds = normalKru(b.kru_ids);
        const err = JadwalRutin.validasi(b, kruIds);
        if (err) throw new Galat(400, err);
        if (!b.paksa && (b.status || 'aktif') === 'aktif') {
            const bentrok = JadwalRutin.cekBentrok({ ...b, hari: Number(b.hari), kru_ids: kruIds, kecualiId: Number(id) });
            if (bentrok.length) throw new Galat(409, PESAN_BENTROK, { bentrok });
        }
        db.transaction(() => {
            db.prepare(`UPDATE jadwal_rutin SET hari = ?, jalur_id = ?, kendaraan_id = ?, sopir_id = ?, jam = ?, ritase = ?, status = ?, catatan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
                .run(Number(b.hari), b.jalur_id, b.kendaraan_id, b.sopir_id, b.jam, Number(b.ritase) || 1, b.status || 'aktif', b.catatan || null, id);
            JadwalRutinKru.tambah(id, kruIds);
        })();
        // Jadwal harian yang belum dikerjakan dibuat ulang mengikuti perubahan
        JadwalRutin.hapusTurunanBelumJalan(Number(id));
        JadwalRutin.buatJadwalHarian();
    }

    static hapus(id) {
        id = Number(id);
        JadwalRutin.hapusTurunanBelumJalan(id);
        // Jadwal harian yang sudah berjalan/selesai tetap tersimpan sebagai riwayat
        db.prepare('DELETE FROM jadwal_rutin WHERE id = ?').run(id);
    }

    // Buat jadwal harian dari jadwal rutin untuk satu tanggal (yang belum ada saja)
    static buatUntukTanggal(tanggal, { beriNotifikasi = true } = {}) {
        const hari = hariDari(tanggal);
        const rutin = db.prepare(`
            SELECT r.*, COALESCE(jl.waktu_tempuh_jam, 8) AS durasi, jl.nama_jalur, k.nomor_polisi
            FROM jadwal_rutin r
            JOIN jalur_layanan jl ON jl.id = r.jalur_id
            LEFT JOIN kendaraan k ON k.id = r.kendaraan_id
            WHERE r.hari = ? AND r.status = 'aktif'
              AND NOT EXISTS (SELECT 1 FROM jadwal_pengangkutan j WHERE j.jadwal_rutin_id = r.id AND j.tanggal = ?)
        `).all(hari, tanggal);
        if (!rutin.length) return 0;
        const JadwalPengangkutan = require('./JadwalPengangkutan');
        db.transaction(() => {
            for (const r of rutin) JadwalPengangkutan.tambahDariRutin(r, tanggal);
        })();
        if (beriNotifikasi) {
            for (const r of rutin) {
                Notifikasi.kirim(r.sopir_id, {
                    jenis: 'jadwal_baru', judul: `Jadwal rutin ${NAMA_HARI[hari]}, ${tanggal}`,
                    pesan: `${r.nama_jalur} pukul ${r.jam}, armada ${r.nomor_polisi || '-'}. Periksa armada sebelum berangkat.`,
                    tautan: '/sopir/jadwal',
                });
            }
        }
        return rutin.length;
    }

    // Pastikan jadwal harian dari jadwal rutin sudah tersedia untuk hari ini s.d. 6 hari ke depan
    static buatJadwalHarian() {
        let total = 0;
        const awal = hariIni();
        for (let i = 0; i < HARI_KE_DEPAN; i++) total += JadwalRutin.buatUntukTanggal(tambahHari(awal, i));
        return total;
    }

    // Hapus jadwal harian hasil jadwal rutin yang belum dikerjakan (untuk dibuat ulang setelah rutin diubah)
    static hapusTurunanBelumJalan(rutinId) {
        const ids = db.prepare(`
            SELECT j.id FROM jadwal_pengangkutan j
            WHERE j.jadwal_rutin_id = ? AND j.tanggal >= ? AND j.status = 'menunggu'
              AND NOT EXISTS (SELECT 1 FROM pemeriksaan_kendaraan p WHERE p.jadwal_id = j.id)
        `).all(rutinId, hariIni()).map(r => r.id);
        db.transaction(() => {
            for (const id of ids) {
                JadwalKru.hapus(id);
                db.prepare('DELETE FROM jadwal_pengangkutan WHERE id = ?').run(id);
            }
        })();
        return ids.length;
    }
}

module.exports = JadwalRutin;
