// ============================================
// Laporan masyarakat: kode laporan dan sinkronisasi dengan jadwal tambahan
// Laporan dikirim masyarakat lewat website atau dicatat admin dari telepon
// dan WhatsApp (sesuai keterangan admin Korwil). Admin menjadwalkan laporan
// sebagai jadwal tambahan; statusnya mengikuti jadwal tersebut.
// ============================================
const db = require('../database/db');
const notifikasi = require('./notifikasi');
const email = require('./email');

const SUMBER = ['website', 'telepon', 'whatsapp'];

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
    kabariPelapor(jadwal.laporan_id, 'selesai');
    const isi = { jenis: 'laporan_selesai', judul: 'Laporan masyarakat selesai ditangani', pesan: `${l.kode_laporan} sudah ditangani oleh ${namaSopir || 'sopir'}.` };
    notifikasi.kirim({ peran: 'admin' }, { ...isi, pesan: isi.pesan + ' Kabari pelapor lewat WhatsApp.', tautan: '/admin/laporan-masyarakat' });
    notifikasi.kirim({ peran: 'pengawas' }, { ...isi, tautan: '/pengawas/laporan' });
}

// Email ke pelapor yang punya akun: laporan diterima, dijadwalkan, dan selesai
const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
function tanggalIndo(tgl) {
    const d = new Date(`${tgl}T00:00:00Z`);
    return `${NAMA_HARI[d.getUTCDay()]}, ${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}`;
}
function kabariPelapor(laporanId, jenis, info = {}) {
    const l = db.prepare(`SELECT lm.kode_laporan, lm.alamat_lokasi, lm.deskripsi, m.email, m.nama
                          FROM laporan_masyarakat lm JOIN masyarakat m ON m.id = lm.masyarakat_id WHERE lm.id = ?`).get(laporanId);
    if (!l) return;
    const lokasi = l.alamat_lokasi ? `<p style="color:#5b6673">Lokasi: ${l.alamat_lokasi}</p>` : '';
    const isi = {
        diterima: [`Laporan ${l.kode_laporan} diterima`, `<p>Halo ${l.nama}, laporan Anda sudah kami terima dan akan ditinjau admin Koordinator Wilayah.</p>${lokasi}<p>Status laporan dapat dipantau di menu <b>Laporan Saya</b>.</p>`],
        dijadwalkan: [`Laporan ${l.kode_laporan} dijadwalkan`, `<p>Halo ${l.nama}, pengangkutan sampah untuk laporan Anda dijadwalkan pada <b>${info.tanggal ? tanggalIndo(info.tanggal) : '-'}</b>${info.jam ? ` pukul <b>${info.jam}</b>` : ''}.</p>${lokasi}`],
        selesai: [`Laporan ${l.kode_laporan} selesai ditangani`, `<p>Halo ${l.nama}, sampah pada laporan Anda sudah diangkut petugas.</p>${lokasi}<p>Foto hasil pengangkutan dapat dilihat di menu <b>Laporan Saya</b>. Mohon beri penilaian atas pelayanan kami.</p>`],
    }[jenis];
    if (isi) email.kirim(l.email, isi[0], isi[1]);
}

module.exports = { SUMBER, buatKodeLaporan, jadwalAktif, kembalikanKeMasuk, selesaikanDariJadwal, kabariPelapor };
