const express = require('express');
const router = express.Router();
const db = require('../database/db');
const bcrypt = require('bcryptjs');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);

// Dashboard
router.get('/dashboard', (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const stats = {
            totalTps: db.prepare('SELECT COUNT(*) as count FROM tps').get().count,
            totalKendaraan: db.prepare('SELECT COUNT(*) as count FROM kendaraan').get().count,
            totalPetugas: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'petugas'").get().count,
            jadwalHariIni: db.prepare('SELECT COUNT(*) as count FROM jadwal_pengangkutan WHERE tanggal = ?').get(today).count,
            laporanMasuk: db.prepare("SELECT COUNT(*) as count FROM laporan_masyarakat WHERE status = 'masuk'").get().count,
            laporanBelumDitangani: db.prepare("SELECT COUNT(*) as count FROM laporan_masyarakat WHERE status != 'selesai'").get().count,
            laporanSelesai: db.prepare("SELECT COUNT(*) as count FROM laporan_masyarakat WHERE status = 'selesai'").get().count
        };
        const jadwalTerbaru = db.prepare(`SELECT j.*, t.nama_tps, k.nomor_polisi, k.jenis_kendaraan, u.name as petugas_name FROM jadwal_pengangkutan j LEFT JOIN tps t ON j.tps_id = t.id LEFT JOIN kendaraan k ON j.kendaraan_id = k.id LEFT JOIN users u ON j.petugas_id = u.id ORDER BY j.tanggal DESC, j.jam DESC LIMIT 5`).all();
        const laporanTerbaru = db.prepare(`SELECT * FROM laporan_masyarakat ORDER BY created_at DESC LIMIT 5`).all();

        res.json({ success: true, stats, jadwalTerbaru, laporanTerbaru });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// TPS
router.get('/tps', (req, res) => {
    try {
        const tpsList = db.prepare('SELECT * FROM tps ORDER BY created_at DESC').all();
        res.json({ success: true, data: tpsList });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.post('/tps', (req, res) => {
    try {
        const { nama_tps, alamat, kapasitas, status, catatan } = req.body;
        db.prepare(`INSERT INTO tps (nama_tps, alamat, kapasitas, status, catatan) VALUES (?, ?, ?, ?, ?)`).run(nama_tps, alamat, kapasitas || null, status || 'aktif', catatan || null);
        res.json({ success: true, message: 'TPS berhasil ditambahkan' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.put('/tps/:id', (req, res) => {
    try {
        const { nama_tps, alamat, kapasitas, status, catatan } = req.body;
        db.prepare(`UPDATE tps SET nama_tps = ?, alamat = ?, kapasitas = ?, status = ?, catatan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(nama_tps, alamat, kapasitas || null, status || 'aktif', catatan || null, req.params.id);
        res.json({ success: true, message: 'TPS berhasil diperbarui' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.delete('/tps/:id', (req, res) => {
    try {
        const deleteTps = db.transaction((id) => {
            db.prepare('DELETE FROM laporan_pengangkutan WHERE tps_id = ?').run(id);
            db.prepare('DELETE FROM jadwal_pengangkutan WHERE tps_id = ?').run(id);
            db.prepare('DELETE FROM tps WHERE id = ?').run(id);
        });
        deleteTps(req.params.id);
        res.json({ success: true, message: 'TPS berhasil dihapus' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Kendaraan
router.get('/kendaraan', (req, res) => {
    try {
        const list = db.prepare('SELECT * FROM kendaraan ORDER BY created_at DESC').all();
        res.json({ success: true, data: list });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.post('/kendaraan', (req, res) => {
    try {
        const { nomor_polisi, jenis_kendaraan, kapasitas_angkut, kondisi, status_penggunaan } = req.body;
        db.prepare(`INSERT INTO kendaraan (nomor_polisi, jenis_kendaraan, kapasitas_angkut, kondisi, status_penggunaan) VALUES (?, ?, ?, ?, ?)`).run(nomor_polisi, jenis_kendaraan, kapasitas_angkut || null, kondisi || 'baik', status_penggunaan || 'tersedia');
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.put('/kendaraan/:id', (req, res) => {
    try {
        const { nomor_polisi, jenis_kendaraan, kapasitas_angkut, kondisi, status_penggunaan } = req.body;
        db.prepare(`UPDATE kendaraan SET nomor_polisi = ?, jenis_kendaraan = ?, kapasitas_angkut = ?, kondisi = ?, status_penggunaan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(nomor_polisi, jenis_kendaraan, kapasitas_angkut || null, kondisi || 'baik', status_penggunaan || 'tersedia', req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.delete('/kendaraan/:id', (req, res) => {
    try {
        const deleteKendaraan = db.transaction((id) => {
            db.prepare('DELETE FROM laporan_pengangkutan WHERE kendaraan_id = ?').run(id);
            db.prepare('DELETE FROM jadwal_pengangkutan WHERE kendaraan_id = ?').run(id);
            db.prepare('DELETE FROM kendaraan WHERE id = ?').run(id);
        });
        deleteKendaraan(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Petugas
router.get('/petugas', (req, res) => {
    try {
        const list = db.prepare("SELECT id, name, username, phone, address, status, created_at FROM users WHERE role = 'petugas' ORDER BY created_at DESC").all();
        res.json({ success: true, data: list });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.post('/petugas', (req, res) => {
    try {
        const { name, username, password, phone, address } = req.body;
        const hashedPassword = bcrypt.hashSync(password, 10);
        db.prepare(`INSERT INTO users (name, username, password, role, phone, address, status) VALUES (?, ?, ?, 'petugas', ?, ?, 'aktif')`).run(name, username, hashedPassword, phone || null, address || null);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.put('/petugas/:id', (req, res) => {
    try {
        const { name, username, password, phone, address, status } = req.body;
        if (password && password.trim() !== '') {
            const hashedPassword = bcrypt.hashSync(password, 10);
            db.prepare(`UPDATE users SET name = ?, username = ?, password = ?, phone = ?, address = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND role = 'petugas'`).run(name, username, hashedPassword, phone || null, address || null, status || 'aktif', req.params.id);
        } else {
            db.prepare(`UPDATE users SET name = ?, username = ?, phone = ?, address = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND role = 'petugas'`).run(name, username, phone || null, address || null, status || 'aktif', req.params.id);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.delete('/petugas/:id', (req, res) => {
    try {
        const deletePetugas = db.transaction((id) => {
            db.prepare('DELETE FROM laporan_pengangkutan WHERE petugas_id = ?').run(id);
            db.prepare('DELETE FROM jadwal_pengangkutan WHERE petugas_id = ?').run(id);
            db.prepare("DELETE FROM users WHERE id = ? AND role = 'petugas'").run(id);
        });
        deletePetugas(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Jadwal Pengangkutan
router.get('/jadwal', (req, res) => {
    try {
        const list = db.prepare(`
            SELECT j.*, t.nama_tps, k.nomor_polisi, k.jenis_kendaraan, u.name as petugas_name 
            FROM jadwal_pengangkutan j 
            LEFT JOIN tps t ON j.tps_id = t.id 
            LEFT JOIN kendaraan k ON j.kendaraan_id = k.id 
            LEFT JOIN users u ON j.petugas_id = u.id 
            ORDER BY j.tanggal DESC, j.jam DESC
        `).all();
        res.json({ success: true, data: list });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/jadwal', (req, res) => {
    try {
        const { tps_id, kendaraan_id, petugas_id, tanggal, jam, catatan } = req.body;
        db.prepare(`INSERT INTO jadwal_pengangkutan (tps_id, kendaraan_id, petugas_id, tanggal, jam, catatan) VALUES (?, ?, ?, ?, ?, ?)`).run(tps_id, kendaraan_id, petugas_id, tanggal, jam, catatan || null);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/jadwal/:id', (req, res) => {
    try {
        const { tps_id, kendaraan_id, petugas_id, tanggal, jam, status, catatan } = req.body;
        db.prepare(`UPDATE jadwal_pengangkutan SET tps_id = ?, kendaraan_id = ?, petugas_id = ?, tanggal = ?, jam = ?, status = ?, catatan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(tps_id, kendaraan_id, petugas_id, tanggal, jam, status || 'menunggu', catatan || null, req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/jadwal/:id', (req, res) => {
    try {
        const deleteJadwal = db.transaction((id) => {
            db.prepare('DELETE FROM laporan_pengangkutan WHERE jadwal_id = ?').run(id);
            db.prepare('DELETE FROM jadwal_pengangkutan WHERE id = ?').run(id);
        });
        deleteJadwal(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ============================================
// Laporan Masyarakat (Public Reports) API
// ============================================
router.get('/laporan-masyarakat', (req, res) => {
    try {
        const list = db.prepare(`
            SELECT lm.*, u.name as nama_petugas, u.phone as phone_petugas
            FROM laporan_masyarakat lm
            LEFT JOIN users u ON lm.ditangani_oleh = u.id
            ORDER BY lm.created_at DESC
        `).all();
        res.json({ success: true, data: list });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.put('/laporan-masyarakat/:id', (req, res) => {
    try {
        const { status, prioritas } = req.body;
        db.prepare('UPDATE laporan_masyarakat SET status = ?, prioritas = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, prioritas, req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.delete('/laporan-masyarakat/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM laporan_masyarakat WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
