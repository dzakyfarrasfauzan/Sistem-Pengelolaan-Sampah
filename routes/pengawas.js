// ============================================
// Controller Pengawas (Bidang)
// Memantau laporan masyarakat yang masuk ke admin Korwil; aturannya ada pada kelas Pengawas.
// ============================================
const express = require('express');
const router = express.Router();
const { requirePengawas } = require('../middleware/auth');
const { tangani } = require('../models/Galat');
const User = require('../models/User');
const Pengawas = require('../models/Pengawas');

router.use(requirePengawas);

// Objek Pengawas dari akun yang sedang login
const pengawas = (req) => User.dariSesi(req.session.user);

router.get('/dashboard', tangani((req, res) => {
    res.json({ success: true, ...pengawas(req).dashboard() });
}));

router.get('/laporan', tangani((req, res) => {
    res.json({ success: true, data: pengawas(req).pantauLaporan(), batasJam: Pengawas.BATAS_JAM });
}));

// Teguran pengawas kepada admin Korwil atas laporan yang belum ditangani
router.put('/laporan/:id/teguran', tangani((req, res) => {
    const teguran = (req.body.teguran || '').trim();
    res.json({ success: true, message: pengawas(req).beriTeguran(req.params.id, teguran) });
}));

// Jadwal pengangkutan (hanya dilihat)
router.get('/jadwal', tangani((req, res) => {
    res.json({ success: true, data: pengawas(req).lihatJadwal() });
}));

module.exports = router;
