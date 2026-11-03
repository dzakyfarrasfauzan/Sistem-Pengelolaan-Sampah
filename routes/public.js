const express = require('express');
const router = express.Router();
const db = require('../database/db');
const upload = require('../middleware/upload');
const https = require('https');

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

// Kode laporan mudah dibaca: LP-TanggalWIB-NomorUrutHarian, contoh LP-20261103-001
function buatKodeLaporan() {
    const wib = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const tanggal = wib.toISOString().slice(0, 10).replace(/-/g, '');
    const awalan = `LP-${tanggal}-`;
    const terakhir = db.prepare("SELECT kode_laporan FROM laporan_masyarakat WHERE kode_laporan LIKE ? ORDER BY kode_laporan DESC LIMIT 1").get(`${awalan}%`);
    const urut = terakhir ? parseInt(terakhir.kode_laporan.slice(awalan.length), 10) + 1 : 1;
    return awalan + String(urut).padStart(3, '0');
}

// POST /api/public/laporan
router.post('/laporan', (req, res, next) => {
    upload.single('foto')(req, res, async function (err) {
        if (err) {
            console.error('Upload error:', err.message);
            return res.status(400).json({ success: false, message: 'Gagal mengupload foto' });
        }

        try {
            const { nama_pelapor, nomor_telepon, deskripsi, latitude, longitude, alamat_lokasi, patokan } = req.body;

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

            db.prepare(`
                INSERT INTO laporan_masyarakat (kode_laporan, nama_pelapor, nomor_telepon, deskripsi, foto, latitude, longitude, alamat_lokasi, patokan, prioritas, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'masuk')
            `).run(
                kodeLaporan,
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
        const laporan = db.prepare('SELECT id, status, rating FROM laporan_masyarakat WHERE kode_laporan = ? AND nomor_telepon = ?')
            .get((kode_laporan || '').trim().toUpperCase(), (nomor_telepon || '').trim());
        if (!laporan) return res.status(404).json({ success: false, message: 'Laporan tidak ditemukan atau nomor telepon tidak sesuai' });
        if (laporan.status !== 'selesai') return res.status(400).json({ success: false, message: 'Laporan belum selesai ditangani' });
        if (laporan.rating) return res.status(400).json({ success: false, message: 'Laporan ini sudah dinilai' });

        db.prepare('UPDATE laporan_masyarakat SET rating = ?, ulasan = ?, dinilai_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(nilai, (ulasan || '').trim() || null, laporan.id);
        res.json({ success: true, message: 'Terima kasih atas penilaian Anda' });
    } catch (err) {
        console.error('Penilaian error:', err.message);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan saat menyimpan penilaian' });
    }
});

module.exports = router;

