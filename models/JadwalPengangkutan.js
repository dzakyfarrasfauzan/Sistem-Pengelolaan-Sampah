// ============================================
// Kelas JadwalPengangkutan
// Jadwal harian yang dijalankan sopir: jadwal rutin (dibuat dari JadwalRutin)
// dan jadwal tambahan dari laporan masyarakat. Status: menunggu, berjalan, selesai, batal.
// ============================================
const db = require('../database/db');
const JadwalRutin = require('./JadwalRutin');
const JadwalKru = require('./JadwalKru');
const PemeriksaanKendaraan = require('./PemeriksaanKendaraan');
const LaporanPengangkutan = require('./LaporanPengangkutan');
const { hariIni, tambahHari, normalKru } = require('../utils/waktu');
const { uraikanBentrok, beririsan } = require('../utils/bentrok');

// Kolom tampilan jadwal harian beserta jalur dan TPS yang dilewati
const KOLOM_JADWAL = `
    j.*, jl.nama_jalur, jl.alamat_pelayanan, jl.desa, jl.kecamatan, jl.jarak_km, jl.estimasi_tonase,
    COALESCE(jl.nama_jalur, j.lokasi) AS lokasi_tampil,
    (SELECT GROUP_CONCAT(t.nama_tps, ', ') FROM jalur_tps jt JOIN tps t ON t.id = jt.tps_id WHERE jt.jalur_id = j.jalur_id) AS tps_names,
    k.nomor_polisi, k.jenis_kendaraan, k.kondisi AS kondisi_kendaraan, s.name AS sopir_name,
    (SELECT GROUP_CONCAT(u.name, ', ') FROM jadwal_kru jk JOIN users u ON u.id = jk.kru_id WHERE jk.jadwal_id = j.id) AS kru_names,
    (SELECT GROUP_CONCAT(jk.kru_id) FROM jadwal_kru jk WHERE jk.jadwal_id = j.id) AS kru_ids,
    (SELECT lm.kode_laporan FROM laporan_masyarakat lm WHERE lm.id = j.laporan_id) AS kode_laporan,
    (SELECT lm.deskripsi FROM laporan_masyarakat lm WHERE lm.id = j.laporan_id) AS deskripsi_laporan,
    (SELECT lm.patokan FROM laporan_masyarakat lm WHERE lm.id = j.laporan_id) AS patokan_laporan,
    (SELECT lm.prioritas FROM laporan_masyarakat lm WHERE lm.id = j.laporan_id) AS prioritas_laporan,
    (SELECT lm.latitude FROM laporan_masyarakat lm WHERE lm.id = j.laporan_id) AS lat_laporan,
    (SELECT lm.longitude FROM laporan_masyarakat lm WHERE lm.id = j.laporan_id) AS lng_laporan`;

const JOIN_JADWAL = `
    FROM jadwal_pengangkutan j
    LEFT JOIN jalur_layanan jl ON jl.id = j.jalur_id
    LEFT JOIN kendaraan k ON k.id = j.kendaraan_id
    LEFT JOIN users s ON s.id = j.sopir_id`;

// Jadwal beserta hasil pemeriksaan armada (untuk admin)
const SELECT_JADWAL = `
    SELECT ${KOLOM_JADWAL},
           pb.kondisi as kondisi_berangkat, pb.foto as foto_berangkat,
           pp.kondisi as kondisi_pulang, pp.foto as foto_pulang
    ${JOIN_JADWAL}
    LEFT JOIN pemeriksaan_kendaraan pb ON pb.jadwal_id = j.id AND pb.jenis = 'sebelum berangkat'
    LEFT JOIN pemeriksaan_kendaraan pp ON pp.jadwal_id = j.id AND pp.jenis = 'sesudah pulang'
`;

// Jadwal beserta hasil pemeriksaan dan catatannya (untuk sopir)
const SELECT_JADWAL_SOPIR = `
    SELECT ${KOLOM_JADWAL},
           pb.kondisi as kondisi_berangkat, pb.catatan as catatan_berangkat, pb.foto as foto_berangkat,
           pp.kondisi as kondisi_pulang, pp.catatan as catatan_pulang, pp.foto as foto_pulang
    ${JOIN_JADWAL}
    LEFT JOIN pemeriksaan_kendaraan pb ON pb.jadwal_id = j.id AND pb.jenis = 'sebelum berangkat'
    LEFT JOIN pemeriksaan_kendaraan pp ON pp.jadwal_id = j.id AND pp.jenis = 'sesudah pulang'
    WHERE j.sopir_id = ?
`;

class JadwalPengangkutan {
    // ---------- Menampilkan jadwal ----------
    // Daftar jadwal admin (default 30 hari ke belakang s.d. 7 hari ke depan)
    static tampil(dari, sampai) {
        JadwalRutin.buatJadwalHarian();
        dari = dari || tambahHari(hariIni(), -30);
        sampai = sampai || tambahHari(hariIni(), 7);
        return db.prepare(`${SELECT_JADWAL} WHERE j.tanggal BETWEEN ? AND ? ORDER BY j.tanggal DESC, j.jam ASC`).all(dari, sampai);
    }

    // Jadwal pada satu tanggal; denganPemeriksaan = sertakan hasil pemeriksaan armada
    static tampilTanggal(tanggal, denganPemeriksaan = true) {
        const sql = denganPemeriksaan ? SELECT_JADWAL : `SELECT ${KOLOM_JADWAL} ${JOIN_JADWAL}`;
        return db.prepare(`${sql} WHERE j.tanggal = ? AND j.status != 'batal' ORDER BY j.jam ASC`).all(tanggal);
    }

    // Daftar jadwal untuk pengawas (tanpa hasil pemeriksaan)
    static tampilRingkas(dari, sampai) {
        return db.prepare(`SELECT ${KOLOM_JADWAL} ${JOIN_JADWAL} WHERE j.tanggal BETWEEN ? AND ? ORDER BY j.tanggal DESC, j.jam ASC`).all(dari, sampai);
    }

    static tampilSatu(id) {
        return db.prepare(`SELECT ${KOLOM_JADWAL} ${JOIN_JADWAL} WHERE j.id = ?`).get(id);
    }

    static cari(id) {
        return db.prepare('SELECT * FROM jadwal_pengangkutan WHERE id = ?').get(id);
    }

    // ---------- Jadwal milik sopir ----------
    static milikSopir(id, sopirId) {
        return db.prepare('SELECT * FROM jadwal_pengangkutan WHERE id = ? AND sopir_id = ?').get(id, sopirId);
    }

    static tampilUntukSopir(sopirId, tambahanSql, ...param) {
        return db.prepare(`${SELECT_JADWAL_SOPIR} ${tambahanSql}`).all(sopirId, ...param);
    }

    // Ringkasan isi jadwal untuk notifikasi sopir
    static info(id) {
        return db.prepare(`
            SELECT j.tanggal, j.jam, COALESCE(jl.nama_jalur, j.lokasi) AS lokasi_tampil, k.nomor_polisi FROM jadwal_pengangkutan j
            LEFT JOIN jalur_layanan jl ON jl.id = j.jalur_id LEFT JOIN kendaraan k ON k.id = j.kendaraan_id WHERE j.id = ?`).get(id);
    }

    static teks(info) {
        return `${info.lokasi_tampil}, ${info.tanggal} pukul ${info.jam}, armada ${info.nomor_polisi}`;
    }

    static namaLokasi(id) {
        return db.prepare('SELECT COALESCE(jl.nama_jalur, j.lokasi) AS nama FROM jadwal_pengangkutan j LEFT JOIN jalur_layanan jl ON jl.id = j.jalur_id WHERE j.id = ?').get(id);
    }

    // Jadwal aktif (belum batal) milik sebuah laporan
    static aktifUntukLaporan(laporanId) {
        return db.prepare("SELECT * FROM jadwal_pengangkutan WHERE laporan_id = ? AND status != 'batal' ORDER BY id DESC LIMIT 1").get(laporanId);
    }

    static adaUntukLaporan(laporanId) {
        return !!db.prepare('SELECT 1 FROM jadwal_pengangkutan WHERE laporan_id = ? LIMIT 1').get(laporanId);
    }

    // ---------- Bentrok ----------
    // Bentrok jadwal harian pada tanggal tertentu: armada, sopir, atau kru yang sama pada waktu yang beririsan
    static cekBentrok({ tanggal, jam, durasi_jam, kendaraan_id, sopir_id, kru_ids, kecualiId }) {
        if (tanggal >= hariIni()) JadwalRutin.buatUntukTanggal(tanggal);
        const kruIds = normalKru(kru_ids);
        const lain = db.prepare(`
            SELECT j.id, j.jam, j.durasi_jam AS durasi, j.kendaraan_id, j.sopir_id, j.jenis, k.nomor_polisi, s.name AS sopir_name,
                   COALESCE(jl.nama_jalur, j.lokasi) AS lokasi_tampil,
                   (SELECT GROUP_CONCAT(jk.kru_id) FROM jadwal_kru jk WHERE jk.jadwal_id = j.id) AS kru_ids
            ${JOIN_JADWAL}
            WHERE j.tanggal = ? AND j.status != 'batal' AND j.id != ?
        `).all(tanggal, kecualiId || 0).filter(o => beririsan(jam, durasi_jam, o.jam, o.durasi));
        return uraikanBentrok(lain, { kendaraan_id, sopir_id, kruIds },
            (o) => `${o.lokasi_tampil || '-'}${o.jenis === 'rutin' ? ' [jadwal rutin]' : ' [jadwal tambahan dari laporan]'}`);
    }

    // ---------- Mengubah data ----------
    // Jadwal tambahan dari laporan masyarakat. Hasilnya id jadwal baru.
    static tambah({ laporan_id, lokasi, pemohon, kendaraan_id, sopir_id, tanggal, jam, durasi_jam, ritase, catatan, kruIds }) {
        const { lastInsertRowid } = db.prepare(`INSERT INTO jadwal_pengangkutan (jenis, laporan_id, lokasi, pemohon, kendaraan_id, sopir_id, tanggal, jam, durasi_jam, ritase, catatan)
            VALUES ('tambahan', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(laporan_id, lokasi, pemohon, kendaraan_id, sopir_id, tanggal, jam, durasi_jam, ritase, catatan);
        JadwalKru.tambah(lastInsertRowid, kruIds);
        return lastInsertRowid;
    }

    static ubah(id, { jalur_id, lokasi, pemohon, kendaraan_id, sopir_id, tanggal, jam, durasi_jam, ritase, status, catatan, kruIds }) {
        db.prepare(`UPDATE jadwal_pengangkutan SET jalur_id = ?, lokasi = ?, pemohon = ?, kendaraan_id = ?, sopir_id = ?, tanggal = ?, jam = ?, durasi_jam = ?, ritase = ?,
            status = ?, catatan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(jalur_id, lokasi, pemohon, kendaraan_id, sopir_id, tanggal, jam, durasi_jam, ritase, status, catatan, id);
        JadwalKru.tambah(id, kruIds);
    }

    // Jadwal rutin pada satu tanggal cukup dibatalkan agar tidak dibuat ulang otomatis
    static batalkan(id) {
        db.prepare("UPDATE jadwal_pengangkutan SET status = 'batal', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
    }

    // Hapus jadwal beserta pemeriksaan, laporan kegiatan, dan krunya
    static hapus(id) {
        PemeriksaanKendaraan.hapus(id);
        LaporanPengangkutan.hapus(id);
        JadwalKru.hapus(id);
        db.prepare('DELETE FROM jadwal_pengangkutan WHERE id = ?').run(id);
    }

    // Sopir memulai atau menyelesaikan pengangkutan
    static ubahStatus(id, status, catatan, foto) {
        db.prepare('UPDATE jadwal_pengangkutan SET status = ?, catatan = COALESCE(?, catatan), foto_kegiatan = COALESCE(?, foto_kegiatan), updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(status, catatan || null, foto, id);
    }
}

module.exports = JadwalPengangkutan;
