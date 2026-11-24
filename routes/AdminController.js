// ============================================
// Controller Admin
// Menerima permintaan dari halaman admin, memanggil kelas model, lalu
// mengirim jawaban JSON. Aturan bisnis berada pada kelas di folder models.
// ============================================
const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { tangani } = require('../models/Galat');
const User = require('../models/User');
const Tps = require('../models/Tps');
const Kendaraan = require('../models/Kendaraan');
const JalurLayanan = require('../models/JalurLayanan');
const JadwalRutin = require('../models/JadwalRutin');
const JadwalPengangkutan = require('../models/JadwalPengangkutan');
const PemeriksaanKendaraan = require('../models/PemeriksaanKendaraan');
const LaporanMasyarakat = require('../models/LaporanMasyarakat');

router.use(requireAdmin);

// Objek Admin dari akun yang sedang login
const admin = (req) => User.dariSesi(req.session.user);

// Dashboard
router.get('/dashboard', tangani((req, res) => {
    res.json({ success: true, ...admin(req).dashboard() });
}));

// TPS
router.get('/tps', tangani((req, res) => res.json({ success: true, data: Tps.tampil() })));
router.post('/tps', tangani((req, res) => {
    Tps.tambah(req.body);
    res.json({ success: true, message: 'TPS berhasil ditambahkan' });
}));
router.put('/tps/:id', tangani((req, res) => {
    Tps.ubah(req.params.id, req.body);
    res.json({ success: true, message: 'TPS berhasil diperbarui' });
}));
router.delete('/tps/:id', tangani((req, res) => {
    Tps.hapus(req.params.id);
    res.json({ success: true, message: 'TPS berhasil dihapus' });
}));

// Kendaraan
router.get('/kendaraan', tangani((req, res) => res.json({ success: true, data: Kendaraan.tampil() })));
router.post('/kendaraan', tangani((req, res) => { Kendaraan.tambah(req.body); res.json({ success: true }); }));
router.put('/kendaraan/:id', tangani((req, res) => { Kendaraan.ubah(req.params.id, req.body); res.json({ success: true }); }));
router.delete('/kendaraan/:id', tangani((req, res) => { Kendaraan.hapus(req.params.id); res.json({ success: true }); }));

// Petugas operasional: sopir dan kru pada tabel users, dibedakan dengan kolom role.
// Hanya sopir yang memiliki akun login; kru cukup dicatat datanya.
router.get('/petugas', tangani((req, res) => res.json({ success: true, data: User.tampil() })));
router.post('/petugas', tangani((req, res) => { User.tambah(req.body); res.json({ success: true }); }));
router.put('/petugas/:id', tangani((req, res) => { User.ubah(req.params.id, req.body); res.json({ success: true }); }));
router.delete('/petugas/:id', tangani((req, res) => { User.hapus(req.params.id); res.json({ success: true }); }));

// Jalur layanan
router.get('/jalur', tangani((req, res) => res.json({ success: true, data: JalurLayanan.tampil() })));
router.post('/jalur', tangani((req, res) => { JalurLayanan.tambah(req.body); res.json({ success: true }); }));
router.put('/jalur/:id', tangani((req, res) => { JalurLayanan.ubah(req.params.id, req.body); res.json({ success: true }); }));
router.delete('/jalur/:id', tangani((req, res) => { JalurLayanan.hapus(req.params.id); res.json({ success: true }); }));

// Jadwal rutin mingguan
router.get('/jadwal-rutin', tangani((req, res) => res.json({ success: true, data: JadwalRutin.tampil() })));
router.post('/jadwal-rutin', tangani((req, res) => {
    const dibuat = JadwalRutin.tambah(req.body);
    res.json({ success: true, message: dibuat ? `Jadwal rutin disimpan. ${dibuat} jadwal harian dibuat otomatis untuk 7 hari ke depan.` : 'Jadwal rutin disimpan.' });
}));
router.put('/jadwal-rutin/:id', tangani((req, res) => {
    JadwalRutin.ubah(req.params.id, req.body);
    res.json({ success: true, message: 'Jadwal rutin diperbarui. Jadwal harian yang belum berjalan ikut disesuaikan.' });
}));
router.delete('/jadwal-rutin/:id', tangani((req, res) => { JadwalRutin.hapus(req.params.id); res.json({ success: true }); }));

// Jadwal harian (hasil jadwal rutin + jadwal tambahan dari laporan masyarakat)
router.get('/jadwal', tangani((req, res) => {
    res.json({ success: true, data: JadwalPengangkutan.tampil(req.query.dari, req.query.sampai) });
}));
router.put('/jadwal/:id', tangani((req, res) => {
    res.json({ success: true, message: admin(req).ubahJadwal(req.params.id, req.body) });
}));
router.delete('/jadwal/:id', tangani((req, res) => {
    res.json({ success: true, message: admin(req).hapusJadwal(req.params.id) });
}));

// Hasil pemeriksaan kendaraan oleh sopir
router.get('/pemeriksaan-kendaraan', tangani((req, res) => res.json({ success: true, data: PemeriksaanKendaraan.tampil() })));

// Laporan masyarakat
router.get('/laporan-masyarakat', tangani((req, res) => res.json({ success: true, data: LaporanMasyarakat.tampil() })));

// Admin mencatat laporan yang masuk lewat telepon atau WhatsApp
router.post('/laporan-masyarakat', (req, res) => {
    upload.single('foto')(req, res, (errUpload) => {
        if (errUpload) return res.status(400).json({ success: false, message: errUpload.message || 'Gagal mengunggah foto' });
        tangani((req, res) => {
            const kode = admin(req).catatLaporan(req.body, req.file ? req.file.filename : null);
            res.json({ success: true, kodeLaporan: kode, message: `Laporan ${kode} dicatat. Berikan kode ini kepada pelapor untuk cek status.` });
        })(req, res);
    });
});

// Admin menentukan prioritas laporan
router.put('/laporan-masyarakat/:id', tangani((req, res) => {
    LaporanMasyarakat.tentukanPrioritas(req.params.id, req.body.prioritas);
    res.json({ success: true });
}));

// Jadwalkan laporan masyarakat sebagai jadwal tambahan
router.post('/laporan-masyarakat/:id/jadwalkan', tangani((req, res) => {
    res.json({ success: true, message: admin(req).jadwalkanLaporan(req.params.id, req.body) });
}));

router.delete('/laporan-masyarakat/:id', tangani((req, res) => {
    LaporanMasyarakat.hapus(req.params.id);
    res.json({ success: true });
}));

module.exports = router;
