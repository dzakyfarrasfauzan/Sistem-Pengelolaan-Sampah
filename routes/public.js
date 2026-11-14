const express = require('express');
const router = express.Router();
const db = require('../database/db');
const upload = require('../middleware/upload');
const https = require('https');
const notifikasi = require('../utils/notifikasi');

// Reverse geocoding via Nominatim (OpenStreetMap) - backend fallback
function reverseGeocode(lat, lon) {
    return new Promise((resolve) => {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=id`;
        const options = {
            headers: { 'User-Agent': 'SistemPengelolaanSampah/1.0' }
        };

        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json.display_name || '');
                } catch {
                    resolve('');
                }
            });
        }).on('error', () => {
            resolve('');
        });
    });
}

const { buatKodeLaporan, kabariPelapor } = require('../utils/laporan');

// POST /api/public/laporan
// Laporan lewat website wajib masuk dengan akun masyarakat; nama dan nomor WhatsApp diambil dari akun
router.post('/laporan', (req, res, next) => {
    if (!req.session.masyarakat) return res.status(401).json({ success: false, message: 'Silakan masuk atau daftar terlebih dahulu untuk membuat laporan' });
    const akun = db.prepare('SELECT * FROM masyarakat WHERE id = ?').get(req.session.masyarakat.id);
    if (!akun) return res.status(401).json({ success: false, message: 'Silakan masuk kembali' });
    if (!akun.no_wa) return res.status(400).json({ success: false, message: 'Lengkapi nomor WhatsApp di profil akun terlebih dahulu' });
    upload.single('foto')(req, res, async function (err) {
        if (err) {
            console.error('Upload error:', err.message);
            return res.status(400).json({ success: false, message: 'Gagal mengupload foto' });
        }

        try {
            const { deskripsi, latitude, longitude, alamat_lokasi, patokan } = req.body;
            const nama_pelapor = akun.nama;
            const nomor_telepon = akun.no_wa;
            if (!(deskripsi || '').trim()) return res.status(400).json({ success: false, message: 'Deskripsi kondisi wajib diisi' });

            // Foto kondisi sampah wajib dilampirkan
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'Foto kondisi sampah wajib dilampirkan' });
            }

            const kodeLaporan = buatKodeLaporan();

            // Prioritas tidak ditentukan otomatis; admin yang menentukan prioritas laporan
            const prioritas = null;

            const foto = req.file.filename;

            // Backend fallback: reverse geocode if lat/long exist but no address
            let finalAlamat = alamat_lokasi || null;
            const lat = latitude ? parseFloat(latitude) : null;
            const lon = longitude ? parseFloat(longitude) : null;

            if (lat && lon && !finalAlamat) {
                console.log(`📍 Reverse geocoding for coordinates: ${lat}, ${lon}`);
                finalAlamat = await reverseGeocode(lat, lon);
                if (finalAlamat) {
                    console.log(`✅ Address resolved: ${finalAlamat}`);
                }
            }

            const simpan = db.prepare(`
                INSERT INTO laporan_masyarakat (kode_laporan, masyarakat_id, nama_pelapor, nomor_telepon, deskripsi, foto, latitude, longitude, alamat_lokasi, patokan, prioritas, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'masuk')
            `).run(
                kodeLaporan,
                akun.id,
                nama_pelapor,
                nomor_telepon,
                deskripsi,
                foto,
                lat,
                lon,
                finalAlamat,
                patokan || null,
                prioritas
            );

            const isiNotif = {
                jenis: 'laporan_baru',
                judul: 'Laporan masyarakat baru',
                pesan: `${kodeLaporan} dari ${nama_pelapor}${finalAlamat ? ` di ${finalAlamat}` : ''}. Tentukan prioritas lalu jadwalkan pengangkutannya.`,
            };
            notifikasi.kirim({ peran: 'admin' }, { ...isiNotif, tautan: '/admin/laporan-masyarakat' });
            notifikasi.kirim({ peran: 'pengawas' }, { ...isiNotif, pesan: `${kodeLaporan} masuk ke admin Korwil${finalAlamat ? ` (${finalAlamat})` : ''}.`, tautan: '/pengawas/laporan' });

            kabariPelapor(simpan.lastInsertRowid, 'diterima');
            res.json({ success: true, kodeLaporan: kodeLaporan, message: 'Laporan berhasil dikirim' });
        } catch (error) {
            console.error('Laporan submit error:', error.message);
            res.status(500).json({ success: false, message: 'Terjadi kesalahan saat menyimpan laporan' });
        }
    });
});

// POST /api/public/cek-status
router.post('/cek-status', (req, res) => {
    try {
        const { search } = req.body;

        if (!search || search.trim() === '') {
            return res.status(400).json({ success: false, message: 'Masukkan kode laporan atau nomor telepon' });
        }

        // Kode laporan tidak membedakan huruf besar/kecil (lp-... sama dengan LP-...)
        const searchTrimmed = search.trim().toUpperCase();

        const results = db.prepare(`
            SELECT kode_laporan, nama_pelapor, deskripsi, foto, latitude, longitude, alamat_lokasi, patokan,
                   prioritas, status, catatan_tindak_lanjut, foto_tindak_lanjut, selesai_at,
                   rating, ulasan, dinilai_at, created_at, updated_at
            FROM laporan_masyarakat
            WHERE kode_laporan = ? OR nomor_telepon = ?
            ORDER BY created_at DESC
        `).all(searchTrimmed, searchTrimmed);

        if (results.length === 0) {
            return res.json({ success: true, data: [], message: 'Laporan tidak ditemukan' });
        }

        res.json({ success: true, data: results });
    } catch (err) {
        console.error('Cek status error:', err.message);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mencari laporan' });
    }
});

// POST /api/public/penilaian - pelapor menilai penanganan laporan yang sudah selesai
router.post('/penilaian', (req, res) => {
    try {
        const { kode_laporan, nomor_telepon, rating, ulasan } = req.body;
        const nilai = Number(rating);
        if (!Number.isInteger(nilai) || nilai < 1 || nilai > 5) {
            return res.status(400).json({ success: false, message: 'Pilih penilaian bintang 1 sampai 5' });
        }
        // Nomor telepon dipakai untuk memastikan yang menilai adalah pelapor itu sendiri
        // Pemilik akun cukup masuk; tanpa akun, nomor telepon harus sesuai laporan
        const kodeCari = (kode_laporan || '').trim().toUpperCase();
        const laporan = req.session.masyarakat
            ? db.prepare('SELECT id, status, rating FROM laporan_masyarakat WHERE kode_laporan = ? AND (masyarakat_id = ? OR nomor_telepon = ?)').get(kodeCari, req.session.masyarakat.id, (nomor_telepon || '').trim())
            : db.prepare('SELECT id, status, rating FROM laporan_masyarakat WHERE kode_laporan = ? AND nomor_telepon = ?').get(kodeCari, (nomor_telepon || '').trim());
        if (!laporan) return res.status(404).json({ success: false, message: 'Laporan tidak ditemukan atau nomor telepon tidak sesuai' });
        if (laporan.status !== 'selesai') return res.status(400).json({ success: false, message: 'Laporan belum selesai ditangani' });
        if (laporan.rating) return res.status(400).json({ success: false, message: 'Laporan ini sudah dinilai' });

        db.prepare('UPDATE laporan_masyarakat SET rating = ?, ulasan = ?, dinilai_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(nilai, (ulasan || '').trim() || null, laporan.id);
        const kode = (kode_laporan || '').trim().toUpperCase();
        const isi = { jenis: 'penilaian', judul: `Penilaian pelapor: ${'★'.repeat(nilai)}`, pesan: `${kode} dinilai ${nilai} dari 5${(ulasan || '').trim() ? `: "${ulasan.trim()}"` : ''}.` };
        notifikasi.kirim({ peran: 'admin' }, { ...isi, tautan: '/admin/laporan-masyarakat' });
        notifikasi.kirim({ peran: 'pengawas' }, { ...isi, tautan: '/pengawas/laporan' });
        res.json({ success: true, message: 'Terima kasih atas penilaian Anda' });
    } catch (err) {
        console.error('Penilaian error:', err.message);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan saat menyimpan penilaian' });
    }
});

module.exports = router;

