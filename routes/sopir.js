// ============================================
// Routes Sopir
// Sopir adalah pemimpin tim petugas operasional (sopir + kru). Sopir memeriksa armada
// sebelum berangkat dan sesudah pulang, memperbarui status pengangkutan, dan menangani
// laporan masyarakat yang ditugaskan. Foto boleh diambil dari kamera maupun galeri.
// ============================================
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireSopir } = require('../middleware/auth');
const upload = require('../middleware/upload');
const notifikasi = require('../utils/notifikasi');
const J = require('../utils/jadwal');

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
    SELECT ${J.KOLOM_JADWAL},
           pb.kondisi as kondisi_berangkat, pb.catatan as catatan_berangkat, pb.foto as foto_berangkat,
           pp.kondisi as kondisi_pulang, pp.catatan as catatan_pulang, pp.foto as foto_pulang
    ${J.JOIN_JADWAL}
    LEFT JOIN pemeriksaan_kendaraan pb ON pb.jadwal_id = j.id AND pb.jenis = 'sebelum berangkat'
    LEFT JOIN pemeriksaan_kendaraan pp ON pp.jadwal_id = j.id AND pp.jenis = 'sesudah pulang'
    WHERE j.sopir_id = ?
`;

// Dashboard sopir
router.get('/dashboard', (req, res) => {
    try {
        const id = req.session.user.id;
        J.pastikanJadwalHarian();
        const today = J.hariIni();
        const next7 = J.tambahHari(today, 7);

        const jadwalMendatang = db.prepare(`${SELECT_JADWAL_SOPIR} AND j.tanggal >= ? AND j.tanggal <= ? AND j.status != 'batal' ORDER BY j.tanggal ASC, j.jam ASC`).all(id, today, next7);
        const stats = {
            totalJadwal: db.prepare('SELECT COUNT(*) as count FROM jadwal_pengangkutan WHERE sopir_id = ?').get(id).count,
            belumDiperiksa: db.prepare(`SELECT COUNT(*) as count FROM jadwal_pengangkutan j WHERE j.sopir_id = ? AND j.status = 'menunggu'
                AND NOT EXISTS (SELECT 1 FROM pemeriksaan_kendaraan p WHERE p.jadwal_id = j.id AND p.jenis = 'sebelum berangkat')`).get(id).count,
            totalPemeriksaan: db.prepare('SELECT COUNT(*) as count FROM pemeriksaan_kendaraan WHERE sopir_id = ?').get(id).count,
            jadwalSelesai: db.prepare("SELECT COUNT(*) as count FROM jadwal_pengangkutan WHERE sopir_id = ? AND status = 'selesai'").get(id).count,
            laporanDitugaskan: db.prepare("SELECT COUNT(*) as count FROM laporan_masyarakat WHERE ditangani_oleh = ? AND status != 'selesai'").get(id).count,
        };
        res.json({ success: true, stats, jadwalMendatang });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Daftar jadwal yang ditugaskan kepada sopir
router.get('/jadwal', (req, res) => {
    try {
        J.pastikanJadwalHarian();
        // Jadwal 30 hari terakhir sampai 7 hari ke depan; yang dibatalkan tidak ditampilkan
        // Urutan: hari ini dan yang akan datang lebih dulu (terdekat di atas), lalu riwayat
        const hari = J.hariIni();
        const list = db.prepare(`${SELECT_JADWAL_SOPIR} AND j.status != 'batal' AND j.tanggal BETWEEN ? AND ?
            ORDER BY (j.tanggal < ?), CASE WHEN j.tanggal >= ? THEN j.tanggal END ASC, j.tanggal DESC, j.jam ASC`)
            .all(req.session.user.id, J.tambahHari(hari, -30), J.tambahHari(hari, 7), hari, hari);
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

        if (kondisi !== 'baik') {
            const k = db.prepare('SELECT nomor_polisi FROM kendaraan WHERE id = ?').get(jadwal.kendaraan_id);
            notifikasi.kirim({ peran: 'admin' }, {
                jenis: 'kendaraan_rusak', judul: `Kendaraan ${kondisi}`,
                pesan: `${k ? k.nomor_polisi : 'Kendaraan'} dilaporkan ${kondisi} oleh ${req.session.user.name} (pemeriksaan ${jenis})${catatan ? `: ${catatan}` : ''}.`
                    + (kondisi === 'rusak berat' && jenis === 'sebelum berangkat' ? ' Ganti armada pada jadwal ini.' : ''),
                tautan: '/admin/pemeriksaan-kendaraan',
            });
        }
        res.json({ success: true, message: 'Hasil pemeriksaan kendaraan berhasil disimpan', status_kendaraan: statusKendaraan });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Perbarui status pengangkutan (berjalan / selesai) beserta foto kegiatan
router.put('/jadwal/:id/status', uploadFoto, (req, res) => {
    try {
        const { status, catatan } = req.body;
        const foto = req.file ? req.file.filename : null;
        if (!['berjalan', 'selesai'].includes(status)) return res.status(400).json({ success: false, message: 'Status tidak valid' });

        const jadwal = db.prepare('SELECT * FROM jadwal_pengangkutan WHERE id = ? AND sopir_id = ?').get(req.params.id, req.session.user.id);
        if (!jadwal) return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan atau bukan tugas Anda' });

        if (jadwal.status === 'batal') return res.status(400).json({ success: false, message: 'Jadwal ini sudah dibatalkan admin' });
        if (status === 'berjalan') {
            if (jadwal.status !== 'menunggu') return res.status(400).json({ success: false, message: 'Pengangkutan sudah dimulai atau selesai' });
            const cek = db.prepare("SELECT kondisi FROM pemeriksaan_kendaraan WHERE jadwal_id = ? AND jenis = 'sebelum berangkat'").get(jadwal.id);
            if (!cek) return res.status(400).json({ success: false, message: 'Periksa armada sebelum berangkat terlebih dahulu' });
            if (cek.kondisi === 'rusak berat') return res.status(400).json({ success: false, message: 'Armada dalam kondisi rusak berat dan tidak dapat digunakan' });
        }
        if (status === 'selesai') {
            if (jadwal.status !== 'berjalan') return res.status(400).json({ success: false, message: 'Pengangkutan belum berjalan' });
            if (!foto) return res.status(400).json({ success: false, message: 'Foto pelaksanaan pengangkutan wajib diunggah' });
        }

        const simpan = db.transaction(() => {
            db.prepare('UPDATE jadwal_pengangkutan SET status = ?, catatan = COALESCE(?, catatan), foto_kegiatan = COALESCE(?, foto_kegiatan), updated_at = CURRENT_TIMESTAMP WHERE id = ?')
              .run(status, catatan || null, foto, jadwal.id);
            // Laporan kegiatan pengangkutan tercatat otomatis atas nama sopir
            if (status === 'selesai') {
                db.prepare(`INSERT INTO laporan_pengangkutan (jadwal_id, jalur_id, kendaraan_id, sopir_id, tanggal_pengangkutan, status_pengangkutan, catatan, foto_kegiatan)
                            VALUES (?, ?, ?, ?, ?, 'selesai', ?, ?)`)
                  .run(jadwal.id, jadwal.jalur_id, jadwal.kendaraan_id, jadwal.sopir_id, J.hariIni(), catatan || null, foto);
            }
        });
        simpan();
        if (status === 'selesai') {
            const t = db.prepare('SELECT COALESCE(jl.nama_jalur, j.lokasi) AS nama FROM jadwal_pengangkutan j LEFT JOIN jalur_layanan jl ON jl.id = j.jalur_id WHERE j.id = ?').get(jadwal.id);
            notifikasi.kirim({ peran: 'admin' }, {
                jenis: 'pengangkutan_selesai', judul: 'Pengangkutan selesai',
                pesan: `${req.session.user.name} menyelesaikan pengangkutan ${t ? t.nama : ''} (${jadwal.tanggal}).`, tautan: '/admin/jadwal',
            });
        }
        res.json({ success: true, message: status === 'selesai' ? 'Pengangkutan selesai. Lanjutkan pemeriksaan armada sesudah pulang.' : 'Pengangkutan dimulai' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Laporan masyarakat yang ditugaskan kepada sopir, diurutkan berdasarkan prioritas
router.get('/laporan', (req, res) => {
    try {
        const list = db.prepare(`
            SELECT * FROM laporan_masyarakat
            WHERE ditangani_oleh = ? AND status != 'selesai'
            ORDER BY CASE prioritas WHEN 'tinggi' THEN 1 WHEN 'sedang' THEN 2 WHEN 'rendah' THEN 3 ELSE 4 END, created_at DESC
        `).all(req.session.user.id);
        res.json({ success: true, data: list });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Penanganan laporan masyarakat oleh sopir dan timnya
router.put('/laporan/:id', uploadFoto, (req, res) => {
    try {
        const { status, catatan_tindak_lanjut } = req.body;
        const foto = req.file ? req.file.filename : null;
        if (!['diproses', 'selesai'].includes(status)) return res.status(400).json({ success: false, message: 'Status tidak valid' });

        const laporan = db.prepare('SELECT id, foto_tindak_lanjut FROM laporan_masyarakat WHERE id = ? AND ditangani_oleh = ?').get(req.params.id, req.session.user.id);
        if (!laporan) return res.status(404).json({ success: false, message: 'Laporan tidak ditemukan atau tidak ditugaskan kepada Anda' });
        if (status === 'selesai' && !foto && !laporan.foto_tindak_lanjut) {
            return res.status(400).json({ success: false, message: 'Foto hasil penanganan wajib diunggah' });
        }

        db.prepare(`
            UPDATE laporan_masyarakat
            SET status = ?, catatan_tindak_lanjut = ?, foto_tindak_lanjut = COALESCE(?, foto_tindak_lanjut),
                selesai_at = CASE WHEN ? = 'selesai' THEN CURRENT_TIMESTAMP ELSE NULL END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(status, catatan_tindak_lanjut || null, foto, status, laporan.id);
        if (status === 'selesai') {
            const l = db.prepare('SELECT kode_laporan FROM laporan_masyarakat WHERE id = ?').get(laporan.id);
            const isi = { jenis: 'laporan_selesai', judul: 'Laporan masyarakat selesai ditangani', pesan: `${l.kode_laporan} sudah ditangani oleh ${req.session.user.name}.` };
            notifikasi.kirim({ peran: 'admin' }, { ...isi, pesan: isi.pesan + ' Kabari pelapor lewat WhatsApp.', tautan: '/admin/laporan-masyarakat' });
            notifikasi.kirim({ peran: 'pengawas' }, { ...isi, tautan: '/pengawas/laporan' });
        }
        res.json({ success: true, message: 'Status laporan berhasil diperbarui' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
