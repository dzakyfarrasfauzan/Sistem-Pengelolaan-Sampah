// ============================================
// Kelas Pengawas (turunan User)
// Pengawas Bidang memantau laporan masyarakat yang masuk ke admin Korwil dan
// sejauh mana sudah ditindaklanjuti, memberi teguran, dan melihat jadwal.
// Laporan dianggap terlambat bila belum selesai lebih dari 2 x 24 jam sejak masuk.
// ============================================
const db = require('../database/db');
const User = require('./User');
const JadwalRutin = require('./JadwalRutin');
const JadwalPengangkutan = require('./JadwalPengangkutan');
const LaporanMasyarakat = require('./LaporanMasyarakat');
const { hariIni, tambahHari } = require('../utils/waktu');

const BATAS_JAM = LaporanMasyarakat.BATAS_TERLAMBAT_JAM;

class Pengawas extends User {
    static get BATAS_JAM() { return BATAS_JAM; }

    dashboard() {
        const satu = (sql) => db.prepare(sql).get();
        const stats = {
            batasJam: BATAS_JAM,
            totalLaporan: satu('SELECT COUNT(*) AS c FROM laporan_masyarakat').c,
            belumDiprioritaskan: satu("SELECT COUNT(*) AS c FROM laporan_masyarakat WHERE status = 'masuk' AND prioritas IS NULL").c,
            diproses: satu("SELECT COUNT(*) AS c FROM laporan_masyarakat WHERE status = 'diproses'").c,
            selesai: satu("SELECT COUNT(*) AS c FROM laporan_masyarakat WHERE status = 'selesai'").c,
            terlambat: satu(`SELECT COUNT(*) AS c FROM laporan_masyarakat WHERE status != 'selesai' AND (julianday('now') - julianday(created_at)) * 24 > ${BATAS_JAM}`).c,
            rataJamPenanganan: satu("SELECT ROUND(AVG((julianday(selesai_at) - julianday(created_at)) * 24), 1) AS c FROM laporan_masyarakat WHERE status = 'selesai' AND selesai_at IS NOT NULL").c,
            rataRating: satu('SELECT ROUND(AVG(rating), 1) AS c FROM laporan_masyarakat WHERE rating IS NOT NULL').c,
            jumlahPenilaian: satu('SELECT COUNT(*) AS c FROM laporan_masyarakat WHERE rating IS NOT NULL').c,
        };
        const peringatan = LaporanMasyarakat.tampilPemantauan(`WHERE lm.status != 'selesai' AND (julianday('now') - julianday(lm.created_at)) * 24 > ${BATAS_JAM} ORDER BY lm.created_at ASC`);
        // Rekap laporan per bulan untuk melihat kecenderungan pengaduan
        const perBulan = db.prepare(`
            SELECT strftime('%Y-%m', created_at) AS bulan, COUNT(*) AS jumlah,
                   SUM(CASE WHEN status = 'selesai' THEN 1 ELSE 0 END) AS selesai
            FROM laporan_masyarakat GROUP BY bulan ORDER BY bulan DESC LIMIT 6
        `).all();
        const belumDiprioritaskan = LaporanMasyarakat.tampilPemantauan(`WHERE lm.status = 'masuk' AND lm.prioritas IS NULL ORDER BY lm.created_at ASC LIMIT 8`);
        JadwalRutin.buatJadwalHarian();
        const jadwalHariIni = JadwalPengangkutan.tampilTanggal(hariIni(), false);
        return { stats, peringatan, perBulan, belumDiprioritaskan, jadwalHariIni };
    }

    pantauLaporan() {
        return LaporanMasyarakat.tampilPemantauan('ORDER BY terlambat DESC, lm.created_at DESC');
    }

    // Teguran kepada admin Korwil atas laporan yang belum ditangani; teguran kosong menghapus teguran
    beriTeguran(laporanId, teguran) {
        LaporanMasyarakat.beriTeguran(laporanId, teguran);
        return teguran ? 'Teguran dikirim ke admin Korwil' : 'Teguran dihapus';
    }

    // Jadwal pengangkutan 30 hari terakhir sampai 7 hari ke depan (hanya dilihat)
    lihatJadwal() {
        JadwalRutin.buatJadwalHarian();
        return JadwalPengangkutan.tampilRingkas(tambahHari(hariIni(), -30), tambahHari(hariIni(), 7));
    }
}

module.exports = Pengawas;
