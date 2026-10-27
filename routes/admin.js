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
            totalSopir: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'sopir'").get().count,
            kendaraanPerluPerbaikan: db.prepare("SELECT COUNT(*) as count FROM kendaraan WHERE kondisi != 'baik'").get().count,
            jadwalHariIni: db.prepare('SELECT COUNT(*) as count FROM jadwal_pengangkutan WHERE tanggal = ?').get(today).count,
            laporanMasuk: db.prepare("SELECT COUNT(*) as count FROM laporan_masyarakat WHERE status = 'masuk'").get().count,
            laporanBelumDitangani: db.prepare("SELECT COUNT(*) as count FROM laporan_masyarakat WHERE status != 'selesai'").get().count,
            laporanSelesai: db.prepare("SELECT COUNT(*) as count FROM laporan_masyarakat WHERE status = 'selesai'").get().count
        };
        const jadwalTerbaru = db.prepare(`${SELECT_JADWAL} ORDER BY j.tanggal DESC, j.jam DESC LIMIT 5`).all();
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
            db.prepare('DELETE FROM pemeriksaan_kendaraan WHERE jadwal_id IN (SELECT id FROM jadwal_pengangkutan WHERE tps_id = ?)').run(id);
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
            db.prepare('DELETE FROM pemeriksaan_kendaraan WHERE kendaraan_id = ? OR jadwal_id IN (SELECT id FROM jadwal_pengangkutan WHERE kendaraan_id = ?)').run(id, id);
            db.prepare('DELETE FROM laporan_pengangkutan WHERE kendaraan_id = ?').run(id);
            db.prepare('DELETE FROM jadwal_pengangkutan WHERE kendaraan_id = ?').run(id);
            db.prepare('DELETE FROM kendaraan WHERE id = ?').run(id);
        });
        deleteKendaraan(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Akun Petugas Angkutan & Sopir (CRUD yang sama, dibedakan berdasarkan peran)
function kelolaAkun(pathUrl, role) {
    router.get(pathUrl, (req, res) => {
        try {
            const list = db.prepare("SELECT id, name, username, role, phone, address, status, created_at FROM users WHERE role = ? ORDER BY created_at DESC").all(role);
            res.json({ success: true, data: list });
        } catch (err) { res.status(500).json({ success: false, message: err.message }); }
    });
    router.post(pathUrl, (req, res) => {
        try {
            const { name, username, password, phone, address } = req.body;
            const hashedPassword = bcrypt.hashSync(password, 10);
            db.prepare(`INSERT INTO users (name, username, password, role, phone, address, status) VALUES (?, ?, ?, ?, ?, ?, 'aktif')`).run(name, username, hashedPassword, role, phone || null, address || null);
            res.json({ success: true });
        } catch (err) { res.status(500).json({ success: false, message: err.message }); }
    });
    router.put(`${pathUrl}/:id`, (req, res) => {
        try {
            const { name, username, password, phone, address, status } = req.body;
            if (password && password.trim() !== '') {
                const hashedPassword = bcrypt.hashSync(password, 10);
                db.prepare(`UPDATE users SET name = ?, username = ?, password = ?, phone = ?, address = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND role = ?`).run(name, username, hashedPassword, phone || null, address || null, status || 'aktif', req.params.id, role);
            } else {
                db.prepare(`UPDATE users SET name = ?, username = ?, phone = ?, address = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND role = ?`).run(name, username, phone || null, address || null, status || 'aktif', req.params.id, role);
            }
            res.json({ success: true });
        } catch (err) { res.status(500).json({ success: false, message: err.message }); }
    });
    router.delete(`${pathUrl}/:id`, (req, res) => {
        try {
            const hapus = db.transaction((id) => {
                if (role === 'petugas') {
                    const jadwalIds = db.prepare('SELECT id FROM jadwal_pengangkutan WHERE petugas_id = ?').all(id).map(j => j.id);
                    for (const jid of jadwalIds) db.prepare('DELETE FROM pemeriksaan_kendaraan WHERE jadwal_id = ?').run(jid);
                    db.prepare('DELETE FROM laporan_pengangkutan WHERE petugas_id = ?').run(id);
                    db.prepare('DELETE FROM jadwal_pengangkutan WHERE petugas_id = ?').run(id);
                    db.prepare('UPDATE laporan_masyarakat SET ditangani_oleh = NULL WHERE ditangani_oleh = ?').run(id);
                } else {
                    db.prepare('DELETE FROM pemeriksaan_kendaraan WHERE sopir_id = ?').run(id);
                    db.prepare('UPDATE jadwal_pengangkutan SET sopir_id = NULL WHERE sopir_id = ?').run(id);
                }
                db.prepare('DELETE FROM users WHERE id = ? AND role = ?').run(id, role);
            });
            hapus(req.params.id);
            res.json({ success: true });
        } catch (err) { res.status(500).json({ success: false, message: err.message }); }
    });
}
kelolaAkun('/petugas', 'petugas');
kelolaAkun('/sopir', 'sopir');

// Validasi sopir pada jadwal: harus akun sopir yang aktif
function cekSopir(sopirId) {
    if (!sopirId) return 'Sopir wajib dipilih';
    const sopir = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'sopir' AND status = 'aktif'").get(sopirId);
    return sopir ? null : 'Sopir tidak ditemukan atau tidak aktif';
}

// Validasi kendaraan pada jadwal: kendaraan dalam perbaikan tidak dapat dijadwalkan
function cekKendaraan(kendaraanId) {
    const k = db.prepare('SELECT status_penggunaan FROM kendaraan WHERE id = ?').get(kendaraanId);
    if (!k) return 'Kendaraan tidak ditemukan';
    return k.status_penggunaan === 'maintenance' ? 'Kendaraan sedang dalam perbaikan (maintenance) dan tidak dapat dijadwalkan' : null;
}

// Query jadwal beserta nama sopir dan hasil pemeriksaan armada
const SELECT_JADWAL = `
    SELECT j.*, t.nama_tps, k.nomor_polisi, k.jenis_kendaraan, u.name as petugas_name, s.name as sopir_name,
           pb.kondisi as kondisi_berangkat, pb.foto as foto_berangkat,
           pp.kondisi as kondisi_pulang, pp.foto as foto_pulang
    FROM jadwal_pengangkutan j
    LEFT JOIN tps t ON j.tps_id = t.id
    LEFT JOIN kendaraan k ON j.kendaraan_id = k.id
    LEFT JOIN users u ON j.petugas_id = u.id
    LEFT JOIN users s ON j.sopir_id = s.id
    LEFT JOIN pemeriksaan_kendaraan pb ON pb.jadwal_id = j.id AND pb.jenis = 'sebelum berangkat'
    LEFT JOIN pemeriksaan_kendaraan pp ON pp.jadwal_id = j.id AND pp.jenis = 'sesudah pulang'
`;

// Jadwal Pengangkutan
router.get('/jadwal', (req, res) => {
    try {
        const list = db.prepare(`${SELECT_JADWAL} ORDER BY j.tanggal DESC, j.jam DESC`).all();
        res.json({ success: true, data: list });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/jadwal', (req, res) => {
    try {
        const { tps_id, kendaraan_id, petugas_id, sopir_id, tanggal, jam, catatan } = req.body;
        const errSopir = cekSopir(sopir_id);
        if (errSopir) return res.status(400).json({ success: false, message: errSopir });
        const errKendaraan = cekKendaraan(kendaraan_id);
        if (errKendaraan) return res.status(400).json({ success: false, message: errKendaraan });
        db.prepare(`INSERT INTO jadwal_pengangkutan (tps_id, kendaraan_id, petugas_id, sopir_id, tanggal, jam, catatan) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(tps_id, kendaraan_id, petugas_id, sopir_id, tanggal, jam, catatan || null);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/jadwal/:id', (req, res) => {
    try {
        const { tps_id, kendaraan_id, petugas_id, sopir_id, tanggal, jam, status, catatan } = req.body;
        const errSopir = cekSopir(sopir_id);
        if (errSopir) return res.status(400).json({ success: false, message: errSopir });

        const lama = db.prepare('SELECT * FROM jadwal_pengangkutan WHERE id = ?').get(req.params.id);
        if (!lama) return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan' });
        const gantiArmada = String(lama.kendaraan_id) !== String(kendaraan_id);
        if (gantiArmada) {
            // Armada hanya dapat diganti sebelum pengangkutan dimulai
            if (lama.status !== 'menunggu') return res.status(400).json({ success: false, message: 'Armada tidak dapat diganti pada jadwal yang sudah berjalan atau selesai' });
            const errKendaraan = cekKendaraan(kendaraan_id);
            if (errKendaraan) return res.status(400).json({ success: false, message: errKendaraan });
        }

        const simpan = db.transaction(() => {
            db.prepare(`UPDATE jadwal_pengangkutan SET tps_id = ?, kendaraan_id = ?, petugas_id = ?, sopir_id = ?, tanggal = ?, jam = ?, status = ?, catatan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(tps_id, kendaraan_id, petugas_id, sopir_id, tanggal, jam, status || 'menunggu', catatan || null, req.params.id);
            // Armada diganti: hasil pemeriksaan armada lama tidak berlaku, sopir memeriksa armada pengganti
            if (gantiArmada) db.prepare("DELETE FROM pemeriksaan_kendaraan WHERE jadwal_id = ? AND jenis = 'sebelum berangkat'").run(req.params.id);
        });
        simpan();
        res.json({ success: true, message: gantiArmada ? 'Armada diganti, sopir perlu memeriksa armada pengganti sebelum berangkat' : undefined });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/jadwal/:id', (req, res) => {
    try {
        const deleteJadwal = db.transaction((id) => {
            db.prepare('DELETE FROM pemeriksaan_kendaraan WHERE jadwal_id = ?').run(id);
            db.prepare('DELETE FROM laporan_pengangkutan WHERE jadwal_id = ?').run(id);
            db.prepare('DELETE FROM jadwal_pengangkutan WHERE id = ?').run(id);
        });
        deleteJadwal(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ============================================
// Pemeriksaan Kendaraan oleh Sopir
// ============================================
router.get('/pemeriksaan-kendaraan', (req, res) => {
    try {
        const list = db.prepare(`
            SELECT p.*, k.nomor_polisi, k.jenis_kendaraan, s.name as sopir_name,
                   j.tanggal, j.jam, t.nama_tps
            FROM pemeriksaan_kendaraan p
            LEFT JOIN kendaraan k ON p.kendaraan_id = k.id
            LEFT JOIN users s ON p.sopir_id = s.id
            LEFT JOIN jadwal_pengangkutan j ON p.jadwal_id = j.id
            LEFT JOIN tps t ON j.tps_id = t.id
            ORDER BY p.created_at DESC
        `).all();
        res.json({ success: true, data: list });
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
        const { status, prioritas, ditangani_oleh } = req.body;
        const prio = prioritas || null;
        const petugasId = ditangani_oleh ? Number(ditangani_oleh) : null;

        // Laporan hanya boleh ditugaskan setelah admin menentukan prioritasnya
        if (petugasId && !prio) {
            return res.status(400).json({ success: false, message: 'Tentukan prioritas laporan sebelum menugaskan petugas' });
        }
        if (petugasId) {
            const petugas = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'petugas' AND status = 'aktif'").get(petugasId);
            if (!petugas) return res.status(400).json({ success: false, message: 'Petugas tidak ditemukan atau tidak aktif' });
        }

        db.prepare('UPDATE laporan_masyarakat SET status = ?, prioritas = ?, ditangani_oleh = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(status, prio, petugasId, req.params.id);
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
