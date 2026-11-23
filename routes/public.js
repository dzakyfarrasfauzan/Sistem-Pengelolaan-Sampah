// ============================================
// Controller Publik (halaman masyarakat tanpa login admin)
// Kirim laporan, angka ringkas beranda, cek status laporan, dan penilaian pelapor.
// ============================================
const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const email = require('../utils/email');
const { Galat, tangani } = require('../models/Galat');
const Masyarakat = require('../models/Masyarakat');
const LaporanMasyarakat = require('../models/LaporanMasyarakat');

// POST /api/public/laporan
// Laporan lewat website wajib masuk dengan akun masyarakat; nama dan nomor WhatsApp diambil dari akun
router.post('/laporan', (req, res) => {
    if (!req.session.masyarakat) return res.status(401).json({ success: false, message: 'Silakan masuk atau daftar terlebih dahulu untuk membuat laporan' });
    const akun = Masyarakat.tampil(req.session.masyarakat.id);
    if (!akun) return res.status(401).json({ success: false, message: 'Silakan masuk kembali' });
    if (!akun.email_terverifikasi && email.aktif()) return res.status(403).json({ success: false, message: 'Verifikasi email akun Anda terlebih dahulu' });
    if (!akun.no_wa) return res.status(400).json({ success: false, message: 'Lengkapi nomor WhatsApp di profil akun terlebih dahulu' });
    upload.single('foto')(req, res, (err) => {
        if (err) {
            console.error('Upload error:', err.message);
            return res.status(400).json({ success: false, message: 'Gagal mengupload foto' });
        }
        tangani(async (req, res) => {
            if (!(req.body.deskripsi || '').trim()) throw new Galat(400, 'Deskripsi kondisi wajib diisi');
            // Foto kondisi sampah wajib dilampirkan
            if (!req.file) throw new Galat(400, 'Foto kondisi sampah wajib dilampirkan');
            const kodeLaporan = await akun.kirimLaporan(req.body, req.file.filename);
            res.json({ success: true, kodeLaporan, message: 'Laporan berhasil dikirim' });
        }, 'Terjadi kesalahan saat menyimpan laporan')(req, res);
    });
});

// GET /api/public/statistik - angka ringkas untuk beranda
router.get('/statistik', tangani((req, res) => {
    res.json({ success: true, data: LaporanMasyarakat.statistik() });
}));

// POST /api/public/cek-status
router.post('/cek-status', tangani((req, res) => {
    const { search } = req.body;
    if (!search || search.trim() === '') throw new Galat(400, 'Masukkan kode laporan atau nomor telepon');
    const results = LaporanMasyarakat.cekStatus(search);
    if (results.length === 0) return res.json({ success: true, data: [], message: 'Laporan tidak ditemukan' });
    res.json({ success: true, data: results });
}, 'Terjadi kesalahan saat mencari laporan'));

// POST /api/public/penilaian - pelapor menilai penanganan laporan yang sudah selesai
router.post('/penilaian', tangani((req, res) => {
    LaporanMasyarakat.beriPenilaian(req.body, req.session.masyarakat);
    res.json({ success: true, message: 'Terima kasih atas penilaian Anda' });
}, 'Terjadi kesalahan saat menyimpan penilaian'));

module.exports = router;
