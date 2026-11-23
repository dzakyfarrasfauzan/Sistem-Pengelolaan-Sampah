// ============================================
// Kelas Pengawas (turunan User)
// Pengawas Bidang memantau laporan masyarakat yang masuk ke admin Korwil dan
// sejauh mana sudah ditindaklanjuti, memberi teguran, dan melihat jadwal.
// Laporan dianggap terlambat bila belum selesai lebih dari 2 x 24 jam sejak masuk.
// ============================================
const User = require('./User');
const JadwalRutin = require('./JadwalRutin');
const JadwalPengangkutan = require('./JadwalPengangkutan');
const LaporanMasyarakat = require('./LaporanMasyarakat');
const { hariIni, tambahHari } = require('../utils/waktu');

const BATAS_JAM = LaporanMasyarakat.BATAS_TERLAMBAT_JAM;

class Pengawas extends User {
    static get BATAS_JAM() { return BATAS_JAM; }

    dashboard() {
        const { stats, peringatan, perBulan, belumDiprioritaskan } = LaporanMasyarakat.ringkasanPemantauan();
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
