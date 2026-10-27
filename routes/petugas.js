const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requirePetugas } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Bungkus upload foto agar error multer dikembalikan sebagai JSON
const uploadFoto = (req, res, next) => {
    upload.single('foto')(req, res, (err) => {
        if (err) return res.status(400).json({ success: false, message: err.message || 'Gagal mengunggah foto' });
        next();
    });
};

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
router.put('/jadwal/:id/status', uploadFoto, (req, res) => {
    try {
        const { status, catatan } = req.body;
        const foto = req.file ? req.file.filename : null;

        // Foto kegiatan wajib saat pengangkutan ditandai selesai
        if (status === 'selesai' && !foto) {
            return res.status(400).json({ success: false, message: 'Foto kegiatan pengangkutan wajib diunggah' });
        }
        // Verify ownership
        const jadwal = db.prepare('SELECT id, sopir_id FROM jadwal_pengangkutan WHERE id = ? AND petugas_id = ?').get(req.params.id, req.session.user.id);
        if (!jadwal) return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan atau bukan milik Anda' });

        // Sesuai SOP, armada harus diperiksa sopir sebelum berangkat
        if (status === 'berjalan' && jadwal.sopir_id) {
            const cek = db.prepare("SELECT kondisi FROM pemeriksaan_kendaraan WHERE jadwal_id = ? AND jenis = 'sebelum berangkat'").get(jadwal.id);
            if (!cek) return res.status(400).json({ success: false, message: 'Armada belum diperiksa sopir sebelum berangkat' });
            if (cek.kondisi === 'rusak berat') return res.status(400).json({ success: false, message: 'Armada dalam kondisi rusak berat dan tidak dapat digunakan' });
        }

        db.prepare('UPDATE jadwal_pengangkutan SET status = ?, catatan = ?, foto_kegiatan = COALESCE(?, foto_kegiatan), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, catatan || null, foto, req.params.id);
        
        // If status is selesai, insert into laporan_pengangkutan
        if (status === 'selesai') {
            const jp = db.prepare('SELECT * FROM jadwal_pengangkutan WHERE id = ?').get(req.params.id);
            db.prepare(`INSERT INTO laporan_pengangkutan (jadwal_id, tps_id, kendaraan_id, petugas_id, tanggal_pengangkutan, status_pengangkutan, catatan, foto_kegiatan) VALUES (?, ?, ?, ?, CURRENT_DATE, 'selesai', ?, ?)`).run(jp.id, jp.tps_id, jp.kendaraan_id, jp.petugas_id, catatan || null, foto);
        }

        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Get All Schedules
router.get('/jadwal', (req, res) => {
    try {
        const list = db.prepare(`
            SELECT j.*, t.nama_tps, t.alamat, k.nomor_polisi, k.jenis_kendaraan, s.name as sopir_name,
                   pb.kondisi as kondisi_berangkat
            FROM jadwal_pengangkutan j
            JOIN tps t ON j.tps_id = t.id
            JOIN kendaraan k ON j.kendaraan_id = k.id
            LEFT JOIN users s ON j.sopir_id = s.id
            LEFT JOIN pemeriksaan_kendaraan pb ON pb.jadwal_id = j.id AND pb.jenis = 'sebelum berangkat'
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
            WHERE lm.ditangani_oleh = ? AND lm.status != 'selesai'
            ORDER BY CASE lm.prioritas WHEN 'tinggi' THEN 1 WHEN 'sedang' THEN 2 WHEN 'rendah' THEN 3 ELSE 4 END, lm.created_at DESC
        `).all(req.session.user.id);
        res.json({ success: true, data: list });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Laporan Masyarakat - UPDATE oleh Petugas
router.put('/laporan/:id', uploadFoto, (req, res) => {
    try {
        const { status, catatan_tindak_lanjut } = req.body;
        const petugasId = req.session.user.id;
        const foto = req.file ? req.file.filename : null;

        // Validasi status yang boleh diubah petugas
        const validStatus = ['diproses', 'selesai'];
        if (!validStatus.includes(status)) {
            return res.status(400).json({ success: false, message: 'Status tidak valid' });
        }

        // Pastikan laporan memang ditugaskan kepada petugas ini
        const laporan = db.prepare('SELECT id, foto_tindak_lanjut FROM laporan_masyarakat WHERE id = ? AND ditangani_oleh = ?').get(req.params.id, petugasId);
        if (!laporan) {
            return res.status(404).json({ success: false, message: 'Laporan tidak ditemukan atau tidak ditugaskan kepada Anda' });
        }

        // Foto kegiatan penanganan wajib saat laporan ditandai selesai
        if (status === 'selesai' && !foto && !laporan.foto_tindak_lanjut) {
            return res.status(400).json({ success: false, message: 'Foto kegiatan penanganan wajib diunggah' });
        }

        db.prepare(`
            UPDATE laporan_masyarakat
            SET status = ?, catatan_tindak_lanjut = ?, foto_tindak_lanjut = COALESCE(?, foto_tindak_lanjut), updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(status, catatan_tindak_lanjut || null, foto, req.params.id);

        res.json({ success: true, message: 'Status laporan berhasil diperbarui' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
