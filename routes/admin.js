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
            totalSopir: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'sopir' AND status = 'aktif'").get().count,
            totalKru: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'kru' AND status = 'aktif'").get().count,
            teguranPengawas: db.prepare("SELECT COUNT(*) as count FROM laporan_masyarakat WHERE teguran_pengawas IS NOT NULL AND status != 'selesai'").get().count,
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
            db.prepare('DELETE FROM jadwal_kru WHERE jadwal_id IN (SELECT id FROM jadwal_pengangkutan WHERE tps_id = ?)').run(id);
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
            db.prepare('DELETE FROM jadwal_kru WHERE jadwal_id IN (SELECT id FROM jadwal_pengangkutan WHERE kendaraan_id = ?)').run(id);
            db.prepare('DELETE FROM jadwal_pengangkutan WHERE kendaraan_id = ?').run(id);
            db.prepare('DELETE FROM kendaraan WHERE id = ?').run(id);
        });
        deleteKendaraan(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ============================================
// Petugas Operasional: sopir dan kru dalam satu data, dibedakan dengan kolom peran.
// Hanya sopir yang memiliki akun login; kru cukup dicatat datanya.
// ============================================
const PERAN = ['sopir', 'kru'];
const dipakaiJadwal = (id) =>
    db.prepare('SELECT 1 FROM jadwal_pengangkutan WHERE sopir_id = ? UNION SELECT 1 FROM jadwal_kru WHERE kru_id = ? LIMIT 1').get(id, id);

router.get('/petugas', (req, res) => {
    try {
        const list = db.prepare(`
            SELECT id, name, username, role AS peran, phone, address, status, created_at
            FROM users WHERE role IN ('sopir','kru')
            ORDER BY CASE role WHEN 'sopir' THEN 1 ELSE 2 END, name
        `).all();
        res.json({ success: true, data: list });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/petugas', (req, res) => {
    try {
        const { name, peran, username, password, phone, address } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Nama wajib diisi' });
        if (!PERAN.includes(peran)) return res.status(400).json({ success: false, message: 'Peran harus sopir atau kru' });
        if (peran === 'sopir' && (!username || !password)) {
            return res.status(400).json({ success: false, message: 'Sopir wajib memiliki username dan password untuk login' });
        }
        db.prepare(`INSERT INTO users (name, username, password, role, phone, address, status) VALUES (?, ?, ?, ?, ?, ?, 'aktif')`).run(
            name.trim(),
            peran === 'sopir' ? username.trim() : null,
            peran === 'sopir' ? bcrypt.hashSync(password, 10) : null,
            peran, phone || null, address || null
        );
        res.json({ success: true });
    } catch (err) {
        if (err.message.includes('UNIQUE')) return res.status(400).json({ success: false, message: 'Username sudah dipakai' });
        res.status(500).json({ success: false, message: err.message });
    }
});

router.put('/petugas/:id', (req, res) => {
    try {
        const { name, peran, username, password, phone, address, status } = req.body;
        const lama = db.prepare("SELECT * FROM users WHERE id = ? AND role IN ('sopir','kru')").get(req.params.id);
        if (!lama) return res.status(404).json({ success: false, message: 'Petugas tidak ditemukan' });
        if (!PERAN.includes(peran)) return res.status(400).json({ success: false, message: 'Peran harus sopir atau kru' });
        if (peran !== lama.role && dipakaiJadwal(lama.id)) {
            return res.status(400).json({ success: false, message: 'Peran tidak dapat diubah karena petugas sudah tercantum pada jadwal' });
        }
        let user = null, pass = null;
        if (peran === 'sopir') {
            if (!username) return res.status(400).json({ success: false, message: 'Sopir wajib memiliki username' });
            user = username.trim();
            pass = password && password.trim() !== '' ? bcrypt.hashSync(password, 10) : lama.password;
            if (!pass) return res.status(400).json({ success: false, message: 'Isi password untuk akun login sopir' });
        }
        db.prepare(`UPDATE users SET name = ?, username = ?, password = ?, role = ?, phone = ?, address = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(name, user, pass, peran, phone || null, address || null, status || 'aktif', lama.id);
        res.json({ success: true });
    } catch (err) {
        if (err.message.includes('UNIQUE')) return res.status(400).json({ success: false, message: 'Username sudah dipakai' });
        res.status(500).json({ success: false, message: err.message });
    }
});

router.delete('/petugas/:id', (req, res) => {
    try {
        const id = req.params.id;
        const riwayat = dipakaiJadwal(id)
            || db.prepare('SELECT 1 FROM laporan_masyarakat WHERE ditangani_oleh = ? LIMIT 1').get(id)
            || db.prepare('SELECT 1 FROM pemeriksaan_kendaraan WHERE sopir_id = ? LIMIT 1').get(id);
        if (riwayat) {
            return res.status(400).json({ success: false, message: 'Petugas sudah memiliki riwayat jadwal atau penanganan laporan. Ubah statusnya menjadi nonaktif.' });
        }
        db.prepare("DELETE FROM users WHERE id = ? AND role IN ('sopir','kru')").run(id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Validasi tim pada jadwal: satu sopir aktif dan minimal satu kru aktif
function cekTim(sopirId, kruIds) {
    if (!sopirId) return 'Sopir wajib dipilih';
    const sopir = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'sopir' AND status = 'aktif'").get(sopirId);
    if (!sopir) return 'Sopir tidak ditemukan atau tidak aktif';
    if (!Array.isArray(kruIds) || kruIds.length === 0) return 'Pilih minimal satu kru';
    for (const k of kruIds) {
        const kru = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'kru' AND status = 'aktif'").get(k);
        if (!kru) return 'Kru tidak ditemukan atau tidak aktif';
    }
    return null;
}
const normalKru = (v) => [...new Set((Array.isArray(v) ? v : []).map(Number).filter(Boolean))];
const simpanKru = (jadwalId, kruIds) => {
    db.prepare('DELETE FROM jadwal_kru WHERE jadwal_id = ?').run(jadwalId);
    const ins = db.prepare('INSERT INTO jadwal_kru (jadwal_id, kru_id) VALUES (?, ?)');
    for (const k of kruIds) ins.run(jadwalId, k);
};

// Validasi kendaraan pada jadwal: kendaraan dalam perbaikan tidak dapat dijadwalkan
function cekKendaraan(kendaraanId) {
    const k = db.prepare('SELECT status_penggunaan FROM kendaraan WHERE id = ?').get(kendaraanId);
    if (!k) return 'Kendaraan tidak ditemukan';
    return k.status_penggunaan === 'maintenance' ? 'Kendaraan sedang dalam perbaikan (maintenance) dan tidak dapat dijadwalkan' : null;
}

// Query jadwal beserta nama sopir dan hasil pemeriksaan armada
const SELECT_JADWAL = `
    SELECT j.*, t.nama_tps, k.nomor_polisi, k.jenis_kendaraan, s.name as sopir_name,
           (SELECT GROUP_CONCAT(u.name, ', ') FROM jadwal_kru jk JOIN users u ON u.id = jk.kru_id WHERE jk.jadwal_id = j.id) as kru_names,
           (SELECT GROUP_CONCAT(jk.kru_id) FROM jadwal_kru jk WHERE jk.jadwal_id = j.id) as kru_ids,
           pb.kondisi as kondisi_berangkat, pb.foto as foto_berangkat,
           pp.kondisi as kondisi_pulang, pp.foto as foto_pulang
    FROM jadwal_pengangkutan j
    LEFT JOIN tps t ON j.tps_id = t.id
    LEFT JOIN kendaraan k ON j.kendaraan_id = k.id
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
        const { tps_id, kendaraan_id, sopir_id, tanggal, jam, catatan } = req.body;
        const kruIds = normalKru(req.body.kru_ids);
        const errTim = cekTim(sopir_id, kruIds);
        if (errTim) return res.status(400).json({ success: false, message: errTim });
        const errKendaraan = cekKendaraan(kendaraan_id);
        if (errKendaraan) return res.status(400).json({ success: false, message: errKendaraan });
        const simpan = db.transaction(() => {
            const { lastInsertRowid } = db.prepare(`INSERT INTO jadwal_pengangkutan (tps_id, kendaraan_id, sopir_id, tanggal, jam, catatan) VALUES (?, ?, ?, ?, ?, ?)`).run(tps_id, kendaraan_id, sopir_id, tanggal, jam, catatan || null);
            simpanKru(lastInsertRowid, kruIds);
        });
        simpan();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/jadwal/:id', (req, res) => {
    try {
        const { tps_id, kendaraan_id, sopir_id, tanggal, jam, status, catatan } = req.body;
        const kruIds = normalKru(req.body.kru_ids);
        const errTim = cekTim(sopir_id, kruIds);
        if (errTim) return res.status(400).json({ success: false, message: errTim });

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
            db.prepare(`UPDATE jadwal_pengangkutan SET tps_id = ?, kendaraan_id = ?, sopir_id = ?, tanggal = ?, jam = ?, status = ?, catatan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(tps_id, kendaraan_id, sopir_id, tanggal, jam, status || 'menunggu', catatan || null, req.params.id);
            simpanKru(req.params.id, kruIds);
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
            db.prepare('DELETE FROM jadwal_kru WHERE jadwal_id = ?').run(id);
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
            SELECT lm.*, u.name as nama_petugas, u.phone as phone_petugas, u.role as peran_petugas
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
            return res.status(400).json({ success: false, message: 'Tentukan prioritas laporan sebelum menugaskan sopir' });
        }
        // Laporan ditugaskan kepada sopir sebagai pemimpin tim petugas operasional
        if (petugasId) {
            const sopir = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'sopir' AND status = 'aktif'").get(petugasId);
            if (!sopir) return res.status(400).json({ success: false, message: 'Sopir tidak ditemukan atau tidak aktif' });
        }

        db.prepare(`UPDATE laporan_masyarakat SET status = ?, prioritas = ?, ditangani_oleh = ?,
                    selesai_at = CASE WHEN ? = 'selesai' THEN COALESCE(selesai_at, CURRENT_TIMESTAMP) ELSE NULL END,
                    updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(status, prio, petugasId, status, req.params.id);
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
