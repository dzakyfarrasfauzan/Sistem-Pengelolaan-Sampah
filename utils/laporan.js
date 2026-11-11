// ============================================
// Laporan masyarakat: kode laporan dan sinkronisasi dengan jadwal tambahan
// Laporan dikirim masyarakat lewat website atau dicatat admin dari telepon,
// WhatsApp, surat, atau pelapor yang datang langsung. Admin menjadwalkan laporan
// sebagai jadwal tambahan; statusnya mengikuti jadwal tersebut.
// ============================================
const db = require('../database/db');
const notifikasi = require('./notifikasi');

const SUMBER = ['website', 'telepon', 'whatsapp', 'surat', 'datang langsung'];

// Kode laporan mudah dibaca: LP-TanggalWIB-NomorUrutHarian, contoh LP-20261103-001
function buatKodeLaporan() {
    const wib = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const tanggal = wib.toISOString().slice(0, 10).replace(/-/g, '');
    const awalan = `LP-${tanggal}-`;
    const terakhir = db.prepare("SELECT kode_laporan FROM laporan_masyarakat WHERE kode_laporan LIKE ? ORDER BY kode_laporan DESC LIMIT 1").get(`${awalan}%`);
    const urut = terakhir ? parseInt(terakhir.kode_laporan.slice(awalan.length), 10) + 1 : 1;
    return awalan + String(urut).padStart(3, '0');
}

// Jadwal aktif (belum batal) milik sebuah laporan
const jadwalAktif = (laporanId) =>
    db.prepare("SELECT * FROM jadwal_pengangkutan WHERE laporan_id = ? AND status != 'batal' ORDER BY id DESC LIMIT 1").get(laporanId);

// Jadwal laporan dibatalkan/dihapus: laporan kembali menunggu dijadwalkan
function kembalikanKeMasuk(laporanId) {
    db.prepare(`UPDATE laporan_masyarakat SET status = 'masuk', ditangani_oleh = NULL, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND status != 'selesai'`).run(laporanId);
}

// Jadwal laporan selesai: laporan ikut selesai dengan foto dan catatan pengangkutan
function selesaikanDariJadwal(jadwal, { foto, catatan, namaSopir }) {
    db.prepare(`UPDATE laporan_masyarakat SET status = 'selesai', ditangani_oleh = ?,
                catatan_tindak_lanjut = COALESCE(?, catatan_tindak_lanjut), foto_tindak_lanjut = COALESCE(?, foto_tindak_lanjut),
                selesai_at = COALESCE(selesai_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND status != 'selesai'`).run(jadwal.sopir_id, catatan || null, foto || null, jadwal.laporan_id);
    const l = db.prepare('SELECT kode_laporan FROM laporan_masyarakat WHERE id = ?').get(jadwal.laporan_id);
    if (!l) return;
    const isi = { jenis: 'laporan_selesai', judul: 'Laporan masyarakat selesai ditangani', pesan: `${l.kode_laporan} sudah ditangani oleh ${namaSopir || 'sopir'}.` };
    notifikasi.kirim({ peran: 'admin' }, { ...isi, pesan: isi.pesan + ' Kabari pelapor lewat WhatsApp.', tautan: '/admin/laporan-masyarakat' });
    notifikasi.kirim({ peran: 'pengawas' }, { ...isi, tautan: '/pengawas/laporan' });
}

module.exports = { SUMBER, buatKodeLaporan, jadwalAktif, kembalikanKeMasuk, selesaikanDariJadwal };
