const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/db');

// POST /api/login - Process login
router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username dan password harus diisi' });
        }

        // Hanya admin, pengawas, dan sopir yang memiliki akun login; kru tidak login
        const user = db.prepare("SELECT * FROM users WHERE username = ? AND status = 'aktif' AND role IN ('admin','pengawas','sopir') AND password IS NOT NULL").get(username);

        if (!user) {
            return res.status(401).json({ success: false, message: 'Username atau password salah' });
        }

        const isMatch = bcrypt.compareSync(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Username atau password salah' });
        }

        req.session.user = {
            id: user.id,
            name: user.name,
            username: user.username,
            role: user.role
        };

        res.json({ success: true, user: req.session.user });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan saat login' });
    }
});

// POST /api/logout - Logout user
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Gagal logout' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true, message: 'Logout berhasil' });
    });
});

// GET /api/me - Get current user
router.get('/me', (req, res) => {
    if (req.session.user) {
        res.json({ success: true, user: req.session.user });
    } else {
        res.status(401).json({ success: false, message: 'Belum login' });
    }
});

module.exports = router;
