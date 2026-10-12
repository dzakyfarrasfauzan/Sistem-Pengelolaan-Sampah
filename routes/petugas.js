const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requirePetugas } = require('../middleware/auth');

router.use(requirePetugas);

// Dashboard
router.get('/dashboard', (req, res) => {
    try {
        // Gunakan waktu WIB (UTC+7) agar tanggal tidak meleset saat malam hari
        const now = new Date();
        const wibOffset = 7 * 60; // menit
        const wibDate = new Date(now.getTime() + wibOffset * 60 * 1000);
        const today = wibDate.toISOString().split('T')[0];
        // 7 hari ke depan
        const next7 = new Date(wibDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const jadwalHariIni = db.prepare(`
            SELECT j.*, t.nama_tps, t.alamat, k.nomor_polisi, k.jenis_kendaraan
            FROM jadwal_pengangkutan j
            JOIN tps t ON j.tps_id = t.id
            JOIN kendaraan k ON j.kendaraan_id = k.id
            WHERE j.petugas_id = ?
              AND j.tanggal >= ?
              AND j.tanggal <= ?
            ORDER BY j.tanggal ASC, j.jam ASC
        `).all(req.session.user.id, today, next7);

        const stats = {
            totalJadwal: db.prepare('SELECT COUNT(*) as count FROM jadwal_pengangkutan WHERE petugas_id = ?').get(req.session.user.id).count,
            jadwalSelesai: db.prepare("SELECT COUNT(*) as count FROM jadwal_pengangkutan WHERE petugas_id = ? AND status = 'selesai'").get(req.session.user.id).count,
            jadwalBerjalan: db.prepare("SELECT COUNT(*) as count FROM jadwal_pengangkutan WHERE petugas_id = ? AND status = 'berjalan'").get(req.session.user.id).count,
        };

        res.json({ success: true, jadwalHariIni, stats });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Update Status Jadwal
router.put('/jadwal/:id/status', (req, res) => {
    try {
        const { status, catatan } = req.body;
        // Verify ownership
        const jadwal = db.prepare('SELECT id FROM jadwal_pengangkutan WHERE id = ? AND petugas_id = ?').get(req.params.id, req.session.user.id);
        if (!jadwal) return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan atau bukan milik Anda' });

        db.prepare('UPDATE jadwal_pengangkutan SET status = ?, catatan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, catatan || null, req.params.id);
        
        // If status is selesai, insert into laporan_pengangkutan
        if (status === 'selesai') {
            const jp = db.prepare('SELECT * FROM jadwal_pengangkutan WHERE id = ?').get(req.params.id);
            db.prepare(`INSERT INTO laporan_pengangkutan (jadwal_id, tps_id, kendaraan_id, petugas_id, tanggal_pengangkutan, status_pengangkutan, catatan) VALUES (?, ?, ?, ?, CURRENT_DATE, 'selesai', ?)`).run(jp.id, jp.tps_id, jp.kendaraan_id, jp.petugas_id, catatan || null);
        }

        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Get All Schedules
router.get('/jadwal', (req, res) => {
    try {
        const list = db.prepare(`
            SELECT j.*, t.nama_tps, t.alamat, k.nomor_polisi, k.jenis_kendaraan
            FROM jadwal_pengangkutan j
            JOIN tps t ON j.tps_id = t.id
            JOIN kendaraan k ON j.kendaraan_id = k.id
            WHERE j.petugas_id = ?
            ORDER BY j.tanggal DESC, j.jam DESC
        `).all(req.session.user.id);
        res.json({ success: true, data: list });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Laporan Masyarakat (Prioritas) - GET
router.get('/laporan', (req, res) => {
    try {
        const list = db.prepare(`
            SELECT lm.*, u.name as nama_petugas
            FROM laporan_masyarakat lm
            LEFT JOIN users u ON lm.ditangani_oleh = u.id
            WHERE lm.status != 'selesai'
            ORDER BY lm.prioritas DESC, lm.created_at DESC
        `).all();
        res.json({ success: true, data: list });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Laporan Masyarakat - UPDATE oleh Petugas
router.put('/laporan/:id', (req, res) => {
    try {
        const { status, catatan_tindak_lanjut } = req.body;
        const petugasId = req.session.user.id;

        // Validasi status yang boleh diubah petugas
        const validStatus = ['diproses', 'selesai'];
        if (!validStatus.includes(status)) {
            return res.status(400).json({ success: false, message: 'Status tidak valid' });
        }

        db.prepare(`
            UPDATE laporan_masyarakat
            SET status = ?, ditangani_oleh = ?, catatan_tindak_lanjut = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(status, petugasId, catatan_tindak_lanjut || null, req.params.id);

        res.json({ success: true, message: 'Status laporan berhasil diperbarui' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
