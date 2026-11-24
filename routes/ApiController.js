// ============================================
// Controller API (data satuan dan notifikasi untuk akun yang login)
// ============================================
const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const Tps = require('../models/Tps');
const Kendaraan = require('../models/Kendaraan');
const User = require('../models/User');
const JadwalPengangkutan = require('../models/JadwalPengangkutan');
const LaporanMasyarakat = require('../models/LaporanMasyarakat');
const Notifikasi = require('../models/Notifikasi');

router.use(requireLogin);

// Ambil satu data berdasarkan id; jawaban berformat { error } bila tidak ada
const ambilSatu = (cari, pesanTidakAda, label) => (req, res) => {
    try {
        const data = cari(req.params.id);
        if (!data) return res.status(404).json({ error: pesanTidakAda });
        res.json(data);
    } catch (err) {
        console.error(`API ${label} error:`, err.message);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
};

router.get('/tps/:id', ambilSatu((id) => Tps.tampilSatu(id), 'TPS tidak ditemukan', 'TPS'));
router.get('/kendaraan/:id', ambilSatu((id) => Kendaraan.tampilSatu(id), 'Kendaraan tidak ditemukan', 'Kendaraan'));
router.get('/petugas/:id', ambilSatu((id) => User.tampilSatu(id), 'Petugas tidak ditemukan', 'Petugas'));
router.get('/jadwal/:id', ambilSatu((id) => JadwalPengangkutan.tampilSatu(id), 'Jadwal tidak ditemukan', 'Jadwal'));
router.get('/laporan-masyarakat/:id', ambilSatu((id) => LaporanMasyarakat.tampilSatu(id), 'Laporan tidak ditemukan', 'Laporan'));

// Notifikasi akun yang sedang login (riwayat 30 hari)
router.get('/notifikasi', (req, res) => {
    try {
        Notifikasi.bersihkan();
        if (req.session.user.role === 'pengawas') Notifikasi.periksaLaporanTerlambat();
        const { data, belumDibaca } = Notifikasi.tampil(req.session.user.id);
        res.json({ success: true, data, belumDibaca, masaSimpanHari: Notifikasi.MASA_SIMPAN_HARI });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.put('/notifikasi/baca-semua', (req, res) => {
    try {
        Notifikasi.tandaiDibaca(req.session.user.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/notifikasi/:id/baca', (req, res) => {
    try {
        Notifikasi.tandaiDibaca(req.session.user.id, req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
