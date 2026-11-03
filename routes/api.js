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

module.exports = router;
