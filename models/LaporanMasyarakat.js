// ============================================
// Kelas LaporanMasyarakat
// Laporan dikirim masyarakat lewat website atau dicatat admin dari telepon dan
// WhatsApp (sesuai keterangan admin Korwil). Admin menjadwalkan laporan sebagai
// jadwal tambahan; statusnya mengikuti jadwal tersebut: masuk, diproses, selesai.
// ============================================
const https = require('https');
const db = require('../database/db');
const { Galat } = require('./Galat');
const Notifikasi = require('./Notifikasi');
const email = require('../utils/email');
const { tanggalIndo } = require('../utils/waktu');

const SUMBER = ['website', 'telepon', 'whatsapp'];
const PRIORITAS = ['tinggi', 'sedang', 'rendah'];
const BATAS_TERLAMBAT_JAM = 48;

// Laporan beserta lama penanganan dan tanda terlambat (untuk pengawas)
const SELECT_PEMANTAUAN = `
    SELECT lm.*, u.name AS nama_petugas,
           ROUND((julianday(COALESCE(lm.selesai_at, 'now')) - julianday(lm.created_at)) * 24, 1) AS umur_jam,
           CASE WHEN lm.status != 'selesai' AND (julianday('now') - julianday(lm.created_at)) * 24 > ${BATAS_TERLAMBAT_JAM}
                THEN 1 ELSE 0 END AS terlambat
    FROM laporan_masyarakat lm
    LEFT JOIN users u ON lm.ditangani_oleh = u.id
`;

// Reverse geocoding via Nominatim (OpenStreetMap) - cadangan bila alamat belum terisi
function reverseGeocode(lat, lon) {
    return new Promise((resolve) => {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=id`;
        https.get(url, { headers: { 'User-Agent': 'SistemPengelolaanSampah/1.0' } }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try { resolve(JSON.parse(data).display_name || ''); } catch { resolve(''); }
            });
        }).on('error', () => resolve(''));
    });
}

class LaporanMasyarakat {
    static get SUMBER() { return SUMBER; }
    static get BATAS_TERLAMBAT_JAM() { return BATAS_TERLAMBAT_JAM; }

    // Kode laporan mudah dibaca: LP-TanggalWIB-NomorUrutHarian, contoh LP-20261103-001
    static buatKode() {
        const wib = new Date(Date.now() + 7 * 60 * 60 * 1000);
        const tanggal = wib.toISOString().slice(0, 10).replace(/-/g, '');
        const awalan = `LP-${tanggal}-`;
        const terakhir = db.prepare("SELECT kode_laporan FROM laporan_masyarakat WHERE kode_laporan LIKE ? ORDER BY kode_laporan DESC LIMIT 1").get(`${awalan}%`);
        const urut = terakhir ? parseInt(terakhir.kode_laporan.slice(awalan.length), 10) + 1 : 1;
        return awalan + String(urut).padStart(3, '0');
    }

    // ---------- Menampilkan ----------
    // Daftar laporan untuk admin beserta jadwal terakhirnya
    static tampil() {
        return db.prepare(`
            SELECT lm.*, u.name as nama_petugas, u.phone as phone_petugas, u.role as peran_petugas, a.name AS nama_pencatat,
                   jd.id AS jadwal_id, jd.tanggal AS jadwal_tanggal, jd.jam AS jadwal_jam, jd.status AS jadwal_status,
                   k.nomor_polisi AS jadwal_armada,
                   (SELECT GROUP_CONCAT(x.name, ', ') FROM jadwal_kru jk JOIN users x ON x.id = jk.kru_id WHERE jk.jadwal_id = jd.id) AS jadwal_kru
            FROM laporan_masyarakat lm
            LEFT JOIN users u ON lm.ditangani_oleh = u.id
            LEFT JOIN users a ON lm.dicatat_oleh = a.id
            LEFT JOIN jadwal_pengangkutan jd ON jd.id = (SELECT MAX(id) FROM jadwal_pengangkutan WHERE laporan_id = lm.id AND status != 'batal')
            LEFT JOIN kendaraan k ON k.id = jd.kendaraan_id
            ORDER BY lm.created_at DESC
        `).all();
    }

    static tampilSatu(id) {
        return db.prepare('SELECT * FROM laporan_masyarakat WHERE id = ?').get(id);
    }

    // Daftar laporan untuk pengawas (lama penanganan dan tanda terlambat)
    static tampilPemantauan(kondisi = '', ...param) {
        return db.prepare(`${SELECT_PEMANTAUAN} ${kondisi}`).all(...param);
    }

    // Laporan yang ditugaskan kepada sopir dan belum selesai, diurutkan berdasarkan prioritas
    static tampilUntukSopir(sopirId) {
        return db.prepare(`
            SELECT lm.*, jd.id AS jadwal_id, jd.tanggal AS jadwal_tanggal, jd.jam AS jadwal_jam, jd.status AS jadwal_status
            FROM laporan_masyarakat lm
            LEFT JOIN jadwal_pengangkutan jd ON jd.id = (SELECT MAX(id) FROM jadwal_pengangkutan WHERE laporan_id = lm.id AND status != 'batal')
            WHERE lm.ditangani_oleh = ? AND lm.status != 'selesai'
            ORDER BY CASE lm.prioritas WHEN 'tinggi' THEN 1 WHEN 'sedang' THEN 2 WHEN 'rendah' THEN 3 ELSE 4 END, lm.created_at DESC
        `).all(sopirId);
    }

    // Cek status lewat kode laporan atau nomor telepon pelapor
    static cekStatus(search) {
        // Kode laporan tidak membedakan huruf besar/kecil (lp-... sama dengan LP-...)
        const cari = search.trim().toUpperCase();
        return db.prepare(`
            SELECT kode_laporan, nama_pelapor, deskripsi, foto, latitude, longitude, alamat_lokasi, patokan,
                   prioritas, status, catatan_tindak_lanjut, foto_tindak_lanjut, selesai_at,
                   rating, ulasan, dinilai_at, created_at, updated_at
            FROM laporan_masyarakat
            WHERE kode_laporan = ? OR nomor_telepon = ?
            ORDER BY created_at DESC
        `).all(cari, cari);
    }

    // ---------- Membuat laporan ----------
    // Laporan dari website oleh akun masyarakat. Hasilnya kode laporan.
    static async kirim(akun, { deskripsi, latitude, longitude, alamat_lokasi, patokan }, foto) {
        const kode = LaporanMasyarakat.buatKode();
        // Alamat diisi dari koordinat bila belum terisi
        let alamat = alamat_lokasi || null;
        const lat = latitude ? parseFloat(latitude) : null;
        const lon = longitude ? parseFloat(longitude) : null;
        if (lat && lon && !alamat) alamat = await reverseGeocode(lat, lon);
        // Prioritas tidak ditentukan otomatis; admin yang menentukan prioritas laporan
        const { lastInsertRowid } = db.prepare(`
            INSERT INTO laporan_masyarakat (kode_laporan, masyarakat_id, nama_pelapor, nomor_telepon, deskripsi, foto, latitude, longitude, alamat_lokasi, patokan, prioritas, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'masuk')
        `).run(kode, akun.id, akun.nama, akun.no_wa, deskripsi, foto, lat, lon, alamat, patokan || null, null);
        const isi = {
            jenis: 'laporan_baru', judul: 'Laporan masyarakat baru',
            pesan: `${kode} dari ${akun.nama}${alamat ? ` di ${alamat}` : ''}. Tentukan prioritas lalu jadwalkan pengangkutannya.`,
        };
        Notifikasi.kirim({ peran: 'admin' }, { ...isi, tautan: '/admin/laporan-masyarakat' });
        Notifikasi.kirim({ peran: 'pengawas' }, { ...isi, pesan: `${kode} masuk ke admin Korwil${alamat ? ` (${alamat})` : ''}.`, tautan: '/pengawas/laporan' });
        LaporanMasyarakat.kabariPelapor(lastInsertRowid, 'diterima');
        return kode;
    }

    // Laporan dari telepon atau WhatsApp yang dicatat admin. Hasilnya kode laporan.
    static catat(b, foto, adminId) {
        const wajib = { nama_pelapor: 'Nama pelapor', nomor_telepon: 'Nomor telepon', alamat_lokasi: 'Lokasi', deskripsi: 'Keterangan' };
        for (const [k, nama] of Object.entries(wajib)) {
            if (!(b[k] || '').trim()) throw new Galat(400, `${nama} wajib diisi`);
        }
        if (!SUMBER.includes(b.sumber) || b.sumber === 'website') throw new Galat(400, 'Pilih sumber laporan: telepon atau WhatsApp');
        const kode = LaporanMasyarakat.buatKode();
        db.prepare(`INSERT INTO laporan_masyarakat (kode_laporan, nama_pelapor, nomor_telepon, deskripsi, foto, alamat_lokasi, patokan, sumber, dicatat_oleh, prioritas, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'masuk')`)
          .run(kode, b.nama_pelapor.trim(), b.nomor_telepon.trim(), b.deskripsi.trim(), foto,
               b.alamat_lokasi.trim(), (b.patokan || '').trim() || null, b.sumber, adminId, b.prioritas || null);
        Notifikasi.kirim({ peran: 'pengawas' }, {
            jenis: 'laporan_baru', judul: 'Laporan masyarakat baru',
            pesan: `${kode} dari ${b.nama_pelapor.trim()} (lewat ${b.sumber}) dicatat oleh admin Korwil.`, tautan: '/pengawas/laporan',
        });
        return kode;
    }

    // ---------- Penanganan ----------
    static tentukanPrioritas(id, prioritas) {
        const prio = prioritas || null;
        if (prio && !PRIORITAS.includes(prio)) throw new Galat(400, 'Prioritas tidak valid');
        const r = db.prepare('UPDATE laporan_masyarakat SET prioritas = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(prio, id);
        if (!r.changes) throw new Galat(404, 'Laporan tidak ditemukan');
    }

    static prioritasValid(prio) { return PRIORITAS.includes(prio); }

    // Laporan dijadwalkan: prioritas tersimpan, status diproses, ditangani sopir jadwal
    static jadwalkan(id, prioritas, sopirId) {
        db.prepare(`UPDATE laporan_masyarakat SET prioritas = ?, status = 'diproses', ditangani_oleh = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(prioritas, sopirId, id);
    }

    // Laporan mengikuti jadwalnya yang diubah (sopir pengganti), kecuali yang sudah selesai
    static ikutiJadwal(id, sopirId) {
        db.prepare(`UPDATE laporan_masyarakat SET ditangani_oleh = ?, status = CASE WHEN status = 'selesai' THEN status ELSE 'diproses' END,
                    updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(sopirId, id);
    }

    // Jadwal laporan dibatalkan/dihapus: laporan kembali menunggu dijadwalkan
    static kembalikanKeMasuk(id) {
        db.prepare(`UPDATE laporan_masyarakat SET status = 'masuk', ditangani_oleh = NULL, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ? AND status != 'selesai'`).run(id);
    }

    // Jadwal laporan selesai: laporan ikut selesai dengan foto dan catatan pengangkutan
    static selesaikanDariJadwal(jadwal, { foto, catatan, namaSopir }) {
        db.prepare(`UPDATE laporan_masyarakat SET status = 'selesai', ditangani_oleh = ?,
                    catatan_tindak_lanjut = COALESCE(?, catatan_tindak_lanjut), foto_tindak_lanjut = COALESCE(?, foto_tindak_lanjut),
                    selesai_at = COALESCE(selesai_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
                    WHERE id = ? AND status != 'selesai'`).run(jadwal.sopir_id, catatan || null, foto || null, jadwal.laporan_id);
        const l = db.prepare('SELECT kode_laporan FROM laporan_masyarakat WHERE id = ?').get(jadwal.laporan_id);
        if (!l) return;
        LaporanMasyarakat.kabariPelapor(jadwal.laporan_id, 'selesai');
        LaporanMasyarakat.beritahuSelesai(l.kode_laporan, namaSopir || 'sopir');
    }

    // Notifikasi laporan selesai kepada admin dan pengawas
    static beritahuSelesai(kode, namaSopir) {
        const isi = { jenis: 'laporan_selesai', judul: 'Laporan masyarakat selesai ditangani', pesan: `${kode} sudah ditangani oleh ${namaSopir}.` };
        Notifikasi.kirim({ peran: 'admin' }, { ...isi, pesan: isi.pesan + ' Kabari pelapor lewat WhatsApp.', tautan: '/admin/laporan-masyarakat' });
        Notifikasi.kirim({ peran: 'pengawas' }, { ...isi, tautan: '/pengawas/laporan' });
    }

    // Laporan tanpa jadwal yang ditangani langsung oleh sopir
    static milikSopir(id, sopirId) {
        return db.prepare('SELECT id, foto_tindak_lanjut FROM laporan_masyarakat WHERE id = ? AND ditangani_oleh = ?').get(id, sopirId);
    }

    static ubah(id, { status, catatan_tindak_lanjut, foto }) {
        db.prepare(`
            UPDATE laporan_masyarakat
            SET status = ?, catatan_tindak_lanjut = ?, foto_tindak_lanjut = COALESCE(?, foto_tindak_lanjut),
                selesai_at = CASE WHEN ? = 'selesai' THEN CURRENT_TIMESTAMP ELSE NULL END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(status, catatan_tindak_lanjut || null, foto, status, id);
    }

    static kode(id) {
        return db.prepare('SELECT kode_laporan FROM laporan_masyarakat WHERE id = ?').get(id).kode_laporan;
    }

    static hapus(id) {
        const JadwalPengangkutan = require('./JadwalPengangkutan');
        if (JadwalPengangkutan.adaUntukLaporan(id)) throw new Galat(400, 'Laporan sudah memiliki jadwal pengangkutan. Hapus jadwalnya terlebih dahulu.');
        db.prepare('DELETE FROM laporan_masyarakat WHERE id = ?').run(id);
    }

    // ---------- Penilaian dan teguran ----------
    // Pelapor menilai penanganan laporan yang sudah selesai
    static beriPenilaian({ kode_laporan, nomor_telepon, rating, ulasan }, sesiMasyarakat) {
        const nilai = Number(rating);
        if (!Number.isInteger(nilai) || nilai < 1 || nilai > 5) throw new Galat(400, 'Pilih penilaian bintang 1 sampai 5');
        // Nomor telepon dipakai untuk memastikan yang menilai adalah pelapor itu sendiri
        // Pemilik akun cukup masuk; tanpa akun, nomor telepon harus sesuai laporan
        const kodeCari = (kode_laporan || '').trim().toUpperCase();
        const laporan = sesiMasyarakat
            ? db.prepare('SELECT id, status, rating FROM laporan_masyarakat WHERE kode_laporan = ? AND (masyarakat_id = ? OR nomor_telepon = ?)').get(kodeCari, sesiMasyarakat.id, (nomor_telepon || '').trim())
            : db.prepare('SELECT id, status, rating FROM laporan_masyarakat WHERE kode_laporan = ? AND nomor_telepon = ?').get(kodeCari, (nomor_telepon || '').trim());
        if (!laporan) throw new Galat(404, 'Laporan tidak ditemukan atau nomor telepon tidak sesuai');
        if (laporan.status !== 'selesai') throw new Galat(400, 'Laporan belum selesai ditangani');
        if (laporan.rating) throw new Galat(400, 'Laporan ini sudah dinilai');
        db.prepare('UPDATE laporan_masyarakat SET rating = ?, ulasan = ?, dinilai_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(nilai, (ulasan || '').trim() || null, laporan.id);
        const kode = (kode_laporan || '').trim().toUpperCase();
        const isi = { jenis: 'penilaian', judul: `Penilaian pelapor: ${'★'.repeat(nilai)}`, pesan: `${kode} dinilai ${nilai} dari 5${(ulasan || '').trim() ? `: "${ulasan.trim()}"` : ''}.` };
        Notifikasi.kirim({ peran: 'admin' }, { ...isi, tautan: '/admin/laporan-masyarakat' });
        Notifikasi.kirim({ peran: 'pengawas' }, { ...isi, tautan: '/pengawas/laporan' });
    }

    // Teguran pengawas kepada admin Korwil; teguran kosong menghapus teguran
    static beriTeguran(id, teguran) {
        const laporan = db.prepare('SELECT id, status, kode_laporan FROM laporan_masyarakat WHERE id = ?').get(id);
        if (!laporan) throw new Galat(404, 'Laporan tidak ditemukan');
        if (laporan.status === 'selesai') throw new Galat(400, 'Laporan sudah selesai ditangani');
        db.prepare('UPDATE laporan_masyarakat SET teguran_pengawas = ?, teguran_at = CASE WHEN ? IS NULL THEN NULL ELSE CURRENT_TIMESTAMP END WHERE id = ?')
          .run(teguran || null, teguran || null, laporan.id);
        if (teguran) {
            Notifikasi.kirim({ peran: 'admin' }, {
                jenis: 'teguran', judul: 'Teguran dari Bidang', pesan: `${laporan.kode_laporan}: ${teguran}`, tautan: '/admin/laporan-masyarakat',
            });
        }
    }

    // ---------- Email kepada pelapor yang punya akun ----------
    static kabariPelapor(id, jenis, info = {}) {
        const l = db.prepare(`SELECT lm.kode_laporan, lm.alamat_lokasi, lm.deskripsi, m.email, m.nama
                              FROM laporan_masyarakat lm JOIN masyarakat m ON m.id = lm.masyarakat_id WHERE lm.id = ?`).get(id);
        if (!l) return;
        const lokasi = l.alamat_lokasi ? `<p style="color:#5b6673">Lokasi: ${l.alamat_lokasi}</p>` : '';
        const isi = {
            diterima: [`Laporan ${l.kode_laporan} diterima`, `<p>Halo ${l.nama}, laporan Anda sudah kami terima dan akan ditinjau admin Koordinator Wilayah.</p>${lokasi}<p>Status laporan dapat dipantau di menu <b>Laporan Saya</b>.</p>`],
            dijadwalkan: [`Laporan ${l.kode_laporan} dijadwalkan`, `<p>Halo ${l.nama}, pengangkutan sampah untuk laporan Anda dijadwalkan pada <b>${info.tanggal ? tanggalIndo(info.tanggal) : '-'}</b>${info.jam ? ` pukul <b>${info.jam}</b>` : ''}.</p>${lokasi}`],
            selesai: [`Laporan ${l.kode_laporan} selesai ditangani`, `<p>Halo ${l.nama}, sampah pada laporan Anda sudah diangkut petugas.</p>${lokasi}<p>Foto hasil pengangkutan dapat dilihat di menu <b>Laporan Saya</b>. Mohon beri penilaian atas pelayanan kami.</p>`],
        }[jenis];
        if (isi) email.kirim(l.email, isi[0], isi[1]);
    }

    // ---------- Angka ringkas ----------
    // Ringkasan laporan untuk dashboard admin
    static ringkasanAdmin(today) {
        const hitung = (sql) => db.prepare(sql).get().count;
        const jumlah = {
            teguranPengawas: hitung("SELECT COUNT(*) as count FROM laporan_masyarakat WHERE teguran_pengawas IS NOT NULL AND status != 'selesai'"),
            masuk: hitung("SELECT COUNT(*) as count FROM laporan_masyarakat WHERE status = 'masuk'"),
            belumDitangani: hitung("SELECT COUNT(*) as count FROM laporan_masyarakat WHERE status != 'selesai'"),
            selesai: hitung("SELECT COUNT(*) as count FROM laporan_masyarakat WHERE status = 'selesai'"),
        };
        const terbaru = db.prepare(`SELECT * FROM laporan_masyarakat ORDER BY created_at DESC LIMIT 5`).all();
        // Laporan masuk dan selesai per bulan, 6 bulan terakhir (bulan tanpa laporan tetap ditampilkan 0)
        const rekap = db.prepare(`SELECT strftime('%Y-%m', created_at) AS bulan, COUNT(*) AS masuk,
                                  SUM(CASE WHEN status = 'selesai' THEN 1 ELSE 0 END) AS selesai
                                  FROM laporan_masyarakat GROUP BY bulan`).all();
        const perBulan = [];
        const d = new Date(`${today}T00:00:00Z`);
        for (let i = 5; i >= 0; i--) {
            const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
            const bulan = t.toISOString().slice(0, 7);
            const r = rekap.find(x => x.bulan === bulan) || {};
            perBulan.push({ bulan, masuk: r.masuk || 0, selesai: r.selesai || 0 });
        }
        // Daftar "perlu tindakan hari ini"
        const perluJadwal = db.prepare(`SELECT id, kode_laporan, nama_pelapor, alamat_lokasi, prioritas, created_at FROM laporan_masyarakat
            WHERE status = 'masuk'
            ORDER BY CASE prioritas WHEN 'tinggi' THEN 0 WHEN 'sedang' THEN 1 WHEN 'rendah' THEN 2 ELSE 3 END, created_at ASC LIMIT 8`).all();
        const teguran = db.prepare(`SELECT id, kode_laporan, teguran_pengawas FROM laporan_masyarakat
            WHERE teguran_pengawas IS NOT NULL AND status != 'selesai' ORDER BY created_at ASC LIMIT 5`).all();
        return { jumlah, terbaru, perBulan, perluJadwal, teguran };
    }

    // Ringkasan pemantauan untuk dashboard pengawas
    static ringkasanPemantauan() {
        const satu = (sql) => db.prepare(sql).get();
        const stats = {
            batasJam: BATAS_TERLAMBAT_JAM,
            totalLaporan: satu('SELECT COUNT(*) AS c FROM laporan_masyarakat').c,
            belumDiprioritaskan: satu("SELECT COUNT(*) AS c FROM laporan_masyarakat WHERE status = 'masuk' AND prioritas IS NULL").c,
            diproses: satu("SELECT COUNT(*) AS c FROM laporan_masyarakat WHERE status = 'diproses'").c,
            selesai: satu("SELECT COUNT(*) AS c FROM laporan_masyarakat WHERE status = 'selesai'").c,
            terlambat: satu(`SELECT COUNT(*) AS c FROM laporan_masyarakat WHERE status != 'selesai' AND (julianday('now') - julianday(created_at)) * 24 > ${BATAS_TERLAMBAT_JAM}`).c,
            rataJamPenanganan: satu("SELECT ROUND(AVG((julianday(selesai_at) - julianday(created_at)) * 24), 1) AS c FROM laporan_masyarakat WHERE status = 'selesai' AND selesai_at IS NOT NULL").c,
            rataRating: satu('SELECT ROUND(AVG(rating), 1) AS c FROM laporan_masyarakat WHERE rating IS NOT NULL').c,
            jumlahPenilaian: satu('SELECT COUNT(*) AS c FROM laporan_masyarakat WHERE rating IS NOT NULL').c,
        };
        const peringatan = LaporanMasyarakat.tampilPemantauan(`WHERE lm.status != 'selesai' AND (julianday('now') - julianday(lm.created_at)) * 24 > ${BATAS_TERLAMBAT_JAM} ORDER BY lm.created_at ASC`);
        // Rekap laporan per bulan untuk melihat kecenderungan pengaduan
        const perBulan = db.prepare(`
            SELECT strftime('%Y-%m', created_at) AS bulan, COUNT(*) AS jumlah,
                   SUM(CASE WHEN status = 'selesai' THEN 1 ELSE 0 END) AS selesai
            FROM laporan_masyarakat GROUP BY bulan ORDER BY bulan DESC LIMIT 6
        `).all();
        const belumDiprioritaskan = LaporanMasyarakat.tampilPemantauan(`WHERE lm.status = 'masuk' AND lm.prioritas IS NULL ORDER BY lm.created_at ASC LIMIT 8`);
        return { stats, peringatan, perBulan, belumDiprioritaskan };
    }

    // Jumlah laporan yang ditugaskan kepada sopir dan belum selesai
    static jumlahDitugaskan(sopirId) {
        return db.prepare("SELECT COUNT(*) as count FROM laporan_masyarakat WHERE ditangani_oleh = ? AND status != 'selesai'").get(sopirId).count;
    }

    static statistik() {
        const satu = (sql) => db.prepare(sql).get().c;
        return {
            totalLaporan: satu('SELECT COUNT(*) AS c FROM laporan_masyarakat'),
            laporanSelesai: satu("SELECT COUNT(*) AS c FROM laporan_masyarakat WHERE status = 'selesai'"),
            jumlahTps: satu("SELECT COUNT(*) AS c FROM tps WHERE status = 'aktif'"),
            jumlahArmada: satu('SELECT COUNT(*) AS c FROM kendaraan'),
            jumlahJalur: satu("SELECT COUNT(*) AS c FROM jalur_layanan WHERE status = 'aktif'"),
            rataRating: db.prepare('SELECT ROUND(AVG(rating), 1) AS c FROM laporan_masyarakat WHERE rating IS NOT NULL').get().c,
        };
    }
}

module.exports = LaporanMasyarakat;
