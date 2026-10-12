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

// POST /api/public/laporan
router.post('/laporan', (req, res, next) => {
    upload.single('foto')(req, res, async function (err) {
        if (err) {
            console.error('Upload error:', err.message);
            return res.status(400).json({ success: false, message: 'Gagal mengupload foto' });
        }

        try {
            const { nama_pelapor, nomor_telepon, deskripsi, latitude, longitude, alamat_lokasi, patokan } = req.body;

            const kodeLaporan = 'LP-' + Date.now();

            let prioritas = 'sedang';
            const descLower = (deskripsi || '').toLowerCase();
            const highPriorityWords = ['menumpuk', 'darurat', 'bau', 'parah', 'berbahaya', 'limbah', 'tumpah', 'meluap'];
            for (const word of highPriorityWords) {
                if (descLower.includes(word)) {
                    prioritas = 'tinggi';
                    break;
                }
            }

            const foto = req.file ? req.file.filename : null;

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

        const searchTrimmed = search.trim();

        const results = db.prepare(`
            SELECT * FROM laporan_masyarakat
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

module.exports = router;

