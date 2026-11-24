// ============================================
// Controller Sopir
// Sopir adalah pemimpin tim petugas operasional (sopir + kru). Seluruh aturan
// pemeriksaan armada, status pengangkutan, dan penanganan laporan ada pada kelas Sopir.
// ============================================
const express = require('express');
const router = express.Router();
const { requireSopir } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { tangani } = require('../models/Galat');
const User = require('../models/User');

const uploadFoto = (req, res, next) => {
    upload.single('foto')(req, res, (err) => {
        if (err) return res.status(400).json({ success: false, message: err.message || 'Gagal mengunggah foto' });
        next();
    });
};
const foto = (req) => (req.file ? req.file.filename : null);

router.use(requireSopir);

// Objek Sopir dari akun yang sedang login
const sopir = (req) => User.dariSesi(req.session.user);

router.get('/dashboard', tangani((req, res) => {
    res.json({ success: true, ...sopir(req).dashboard() });
}));

router.get('/jadwal', tangani((req, res) => {
    res.json({ success: true, data: sopir(req).lihatJadwal() });
}));

// Kirim hasil pemeriksaan armada (foto wajib dari kamera)
router.post('/jadwal/:id/pemeriksaan', uploadFoto, tangani((req, res) => {
    const statusKendaraan = sopir(req).periksaKendaraan(req.params.id, req.body, foto(req));
    res.json({ success: true, message: 'Hasil pemeriksaan kendaraan berhasil disimpan', status_kendaraan: statusKendaraan });
}));

// Perbarui status pengangkutan (berjalan / selesai) beserta foto kegiatan
router.put('/jadwal/:id/status', uploadFoto, tangani((req, res) => {
    res.json({ success: true, message: sopir(req).ubahStatusJadwal(req.params.id, req.body, foto(req)) });
}));

// Laporan masyarakat yang ditugaskan kepada sopir
router.get('/laporan', tangani((req, res) => {
    res.json({ success: true, data: sopir(req).lihatLaporan() });
}));

router.put('/laporan/:id', uploadFoto, tangani((req, res) => {
    sopir(req).tanganiLaporan(req.params.id, req.body, foto(req));
    res.json({ success: true, message: 'Status laporan berhasil diperbarui' });
}));

module.exports = router;
