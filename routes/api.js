// ============================================
// API Routes (JSON endpoints for AJAX)
// Sistem Pengelolaan Sampah - DLH Sukabumi
// ============================================

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireLogin } = require('../middleware/auth');

// Require login for all API routes
router.use(requireLogin);

// ============================================
// TPS API
// ============================================
router.get('/tps/:id', (req, res) => {
    try {
        const tps = db.prepare('SELECT * FROM tps WHERE id = ?').get(req.params.id);
        if (!tps) {
            return res.status(404).json({ error: 'TPS tidak ditemukan' });
        }
        res.json(tps);
    } catch (err) {
        console.error('API TPS error:', err.message);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// ============================================
// Kendaraan API
// ============================================
router.get('/kendaraan/:id', (req, res) => {
    try {
        const kendaraan = db.prepare('SELECT * FROM kendaraan WHERE id = ?').get(req.params.id);
        if (!kendaraan) {
            return res.status(404).json({ error: 'Kendaraan tidak ditemukan' });
        }
        res.json(kendaraan);
    } catch (err) {
        console.error('API Kendaraan error:', err.message);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// ============================================
// Petugas Operasional API (sopir dan kru)
// ============================================
router.get('/petugas/:id', (req, res) => {
    try {
        const petugas = db.prepare("SELECT id, name, username, role AS peran, phone, address, status, created_at, updated_at FROM users WHERE id = ? AND role IN ('sopir','kru')").get(req.params.id);
        if (!petugas) {
            return res.status(404).json({ error: 'Petugas tidak ditemukan' });
        }
        res.json(petugas);
    } catch (err) {
        console.error('API Petugas error:', err.message);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// ============================================
// Jadwal API
// ============================================
router.get('/jadwal/:id', (req, res) => {
    try {
        const jadwal = db.prepare(`
            SELECT j.*, t.nama_tps, k.nomor_polisi, k.jenis_kendaraan, s.name as sopir_name,
                   (SELECT GROUP_CONCAT(u.name, ', ') FROM jadwal_kru jk JOIN users u ON u.id = jk.kru_id WHERE jk.jadwal_id = j.id) as kru_names
            FROM jadwal_pengangkutan j
            LEFT JOIN tps t ON j.tps_id = t.id
            LEFT JOIN kendaraan k ON j.kendaraan_id = k.id
            LEFT JOIN users s ON j.sopir_id = s.id
            WHERE j.id = ?
        `).get(req.params.id);

        if (!jadwal) {
            return res.status(404).json({ error: 'Jadwal tidak ditemukan' });
        }
        res.json(jadwal);
    } catch (err) {
        console.error('API Jadwal error:', err.message);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// ============================================
// Laporan Masyarakat API
// ============================================
router.get('/laporan-masyarakat/:id', (req, res) => {
    try {
        const laporan = db.prepare('SELECT * FROM laporan_masyarakat WHERE id = ?').get(req.params.id);
        if (!laporan) {
            return res.status(404).json({ error: 'Laporan tidak ditemukan' });
        }
        res.json(laporan);
    } catch (err) {
        console.error('API Laporan error:', err.message);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// ============================================
// Notifikasi akun yang sedang login (riwayat 30 hari)
// ============================================
const notifikasi = require('../utils/notifikasi');

router.get('/notifikasi', (req, res) => {
    try {
        notifikasi.bersihkan();
        if (req.session.user.role === 'pengawas') notifikasi.periksaLaporanTerlambat();
        const userId = req.session.user.id;
        const list = db.prepare('SELECT * FROM notifikasi WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 100').all(userId);
        const belumDibaca = db.prepare('SELECT COUNT(*) AS c FROM notifikasi WHERE user_id = ? AND dibaca = 0').get(userId).c;
        res.json({ success: true, data: list, belumDibaca, masaSimpanHari: notifikasi.MASA_SIMPAN_HARI });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.put('/notifikasi/baca-semua', (req, res) => {
    try {
        db.prepare('UPDATE notifikasi SET dibaca = 1 WHERE user_id = ?').run(req.session.user.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/notifikasi/:id/baca', (req, res) => {
    try {
        db.prepare('UPDATE notifikasi SET dibaca = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.session.user.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
