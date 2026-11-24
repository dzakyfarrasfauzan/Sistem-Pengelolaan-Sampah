// ============================================
// Controller Login admin, pengawas, dan sopir
// Kelas User menentukan akun yang boleh login (kru tidak memiliki akun).
// ============================================
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// POST /api/login
router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username dan password harus diisi' });
        }
        const user = User.login(username, password);
        if (!user) return res.status(401).json({ success: false, message: 'Username atau password salah' });
        req.session.user = user.keSesi();
        res.json({ success: true, user: req.session.user });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan saat login' });
    }
});

// POST /api/logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ success: false, message: 'Gagal logout' });
        res.clearCookie('connect.sid');
        res.json({ success: true, message: 'Logout berhasil' });
    });
});

// GET /api/me - akun yang sedang login
router.get('/me', (req, res) => {
    if (req.session.user) res.json({ success: true, user: req.session.user });
    else res.status(401).json({ success: false, message: 'Belum login' });
});

module.exports = router;
