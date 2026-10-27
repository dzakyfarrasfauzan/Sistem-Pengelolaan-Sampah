// ============================================
// Routes Sopir
// Pemeriksaan kesiapan armada sebelum berangkat dan sesudah pulang dari TPA
// (SOP Pelaksanaan Pengangkutan Sampah & SOP Pemeliharaan Kendaraan)
// ============================================
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireSopir } = require('../middleware/auth');
const upload = require('../middleware/upload');

const uploadFoto = (req, res, next) => {
    upload.single('foto')(req, res, (err) => {
        if (err) return res.status(400).json({ success: false, message: err.message || 'Gagal mengunggah foto' });
        next();
    });
};

router.use(requireSopir);

const JENIS = ['sebelum berangkat', 'sesudah pulang'];
const KONDISI = ['baik', 'rusak ringan', 'rusak berat'];

const SELECT_JADWAL_SOPIR = `
    SELECT j.*, t.nama_tps, t.alamat, k.nomor_polisi, k.jenis_kendaraan, k.kondisi as kondisi_kendaraan,
           u.name as petugas_name,
           pb.kondisi as kondisi_berangkat, pb.catatan as catatan_berangkat, pb.foto as foto_berangkat,
           pp.kondisi as kondisi_pulang, pp.catatan as catatan_pulang, pp.foto as foto_pulang
    FROM jadwal_pengangkutan j
    JOIN tps t ON j.tps_id = t.id
    JOIN kendaraan k ON j.kendaraan_id = k.id
    LEFT JOIN users u ON j.petugas_id = u.id
    LEFT JOIN pemeriksaan_kendaraan pb ON pb.jadwal_id = j.id AND pb.jenis = 'sebelum berangkat'
    LEFT JOIN pemeriksaan_kendaraan pp ON pp.jadwal_id = j.id AND pp.jenis = 'sesudah pulang'
    WHERE j.sopir_id = ?
`;

// Dashboard sopir
router.get('/dashboard', (req, res) => {
    try {
        const id = req.session.user.id;
        const wib = new Date(Date.now() + 7 * 60 * 60 * 1000);
        const today = wib.toISOString().split('T')[0];
        const next7 = new Date(wib.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const jadwalMendatang = db.prepare(`${SELECT_JADWAL_SOPIR} AND j.tanggal >= ? AND j.tanggal <= ? ORDER BY j.tanggal ASC, j.jam ASC`).all(id, today, next7);
        const stats = {
            totalJadwal: db.prepare('SELECT COUNT(*) as count FROM jadwal_pengangkutan WHERE sopir_id = ?').get(id).count,
            belumDiperiksa: db.prepare(`SELECT COUNT(*) as count FROM jadwal_pengangkutan j WHERE j.sopir_id = ? AND j.status = 'menunggu'
                AND NOT EXISTS (SELECT 1 FROM pemeriksaan_kendaraan p WHERE p.jadwal_id = j.id AND p.jenis = 'sebelum berangkat')`).get(id).count,
            totalPemeriksaan: db.prepare('SELECT COUNT(*) as count FROM pemeriksaan_kendaraan WHERE sopir_id = ?').get(id).count,
        };
        res.json({ success: true, stats, jadwalMendatang });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Daftar jadwal yang ditugaskan kepada sopir
router.get('/jadwal', (req, res) => {
    try {
        const list = db.prepare(`${SELECT_JADWAL_SOPIR} ORDER BY j.tanggal DESC, j.jam DESC`).all(req.session.user.id);
        res.json({ success: true, data: list });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Kirim hasil pemeriksaan armada (foto wajib dari kamera)
router.post('/jadwal/:id/pemeriksaan', uploadFoto, (req, res) => {
    try {
        const { jenis, kondisi, catatan } = req.body;
        const foto = req.file ? req.file.filename : null;

        if (!JENIS.includes(jenis)) return res.status(400).json({ success: false, message: 'Jenis pemeriksaan tidak valid' });
        if (!KONDISI.includes(kondisi)) return res.status(400).json({ success: false, message: 'Kondisi kendaraan tidak valid' });
        if (!foto) return res.status(400).json({ success: false, message: 'Foto kondisi kendaraan wajib diunggah' });

        const jadwal = db.prepare('SELECT * FROM jadwal_pengangkutan WHERE id = ? AND sopir_id = ?').get(req.params.id, req.session.user.id);
        if (!jadwal) return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan atau bukan tugas Anda' });

        const sudah = db.prepare('SELECT id FROM pemeriksaan_kendaraan WHERE jadwal_id = ? AND jenis = ?').get(jadwal.id, jenis);
        if (sudah) return res.status(400).json({ success: false, message: `Pemeriksaan ${jenis} sudah dilakukan` });

        if (jenis === 'sebelum berangkat' && jadwal.status !== 'menunggu') {
            return res.status(400).json({ success: false, message: 'Pemeriksaan sebelum berangkat hanya untuk jadwal yang belum berjalan' });
        }
        if (jenis === 'sesudah pulang') {
            const berangkat = db.prepare("SELECT id FROM pemeriksaan_kendaraan WHERE jadwal_id = ? AND jenis = 'sebelum berangkat'").get(jadwal.id);
            if (!berangkat) return res.status(400).json({ success: false, message: 'Lakukan pemeriksaan sebelum berangkat terlebih dahulu' });
            if (jadwal.status !== 'selesai') return res.status(400).json({ success: false, message: 'Pemeriksaan sesudah pulang dilakukan setelah pengangkutan selesai' });
        }

        // Status kendaraan mengikuti hasil pemeriksaan sopir
        let statusKendaraan;
        if (kondisi === 'rusak berat') statusKendaraan = 'maintenance';
        else statusKendaraan = jenis === 'sebelum berangkat' ? 'digunakan' : 'tersedia';

        const simpan = db.transaction(() => {
            db.prepare(`INSERT INTO pemeriksaan_kendaraan (jadwal_id, kendaraan_id, sopir_id, jenis, kondisi, catatan, foto) VALUES (?, ?, ?, ?, ?, ?, ?)`)
              .run(jadwal.id, jadwal.kendaraan_id, req.session.user.id, jenis, kondisi, catatan || null, foto);
            db.prepare('UPDATE kendaraan SET kondisi = ?, status_penggunaan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
              .run(kondisi, statusKendaraan, jadwal.kendaraan_id);
        });
        simpan();

        res.json({ success: true, message: 'Hasil pemeriksaan kendaraan berhasil disimpan', status_kendaraan: statusKendaraan });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
