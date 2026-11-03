// ============================================
// Routes Pengawas (Bidang)
// Memantau laporan masyarakat yang masuk ke admin Korwil dan sejauh mana sudah
// ditindaklanjuti. Laporan yang melewati batas waktu muncul sebagai peringatan,
// dan pengawas dapat memberikan teguran yang tampil pada halaman admin.
// ============================================
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requirePengawas } = require('../middleware/auth');

router.use(requirePengawas);

// Laporan dianggap terlambat bila belum selesai lebih dari 2 x 24 jam sejak masuk
const BATAS_JAM = 48;

const SELECT_LAPORAN = `
    SELECT lm.*, u.name AS nama_petugas,
           ROUND((julianday(COALESCE(lm.selesai_at, 'now')) - julianday(lm.created_at)) * 24, 1) AS umur_jam,
           CASE WHEN lm.status != 'selesai' AND (julianday('now') - julianday(lm.created_at)) * 24 > ${BATAS_JAM}
                THEN 1 ELSE 0 END AS terlambat
    FROM laporan_masyarakat lm
    LEFT JOIN users u ON lm.ditangani_oleh = u.id
`;

router.get('/dashboard', (req, res) => {
    try {
        const satu = (sql) => db.prepare(sql).get();
        const stats = {
            batasJam: BATAS_JAM,
            totalLaporan: satu('SELECT COUNT(*) AS c FROM laporan_masyarakat').c,
            belumDiprioritaskan: satu("SELECT COUNT(*) AS c FROM laporan_masyarakat WHERE status = 'masuk' AND prioritas IS NULL").c,
            diproses: satu("SELECT COUNT(*) AS c FROM laporan_masyarakat WHERE status = 'diproses'").c,
            selesai: satu("SELECT COUNT(*) AS c FROM laporan_masyarakat WHERE status = 'selesai'").c,
            terlambat: satu(`SELECT COUNT(*) AS c FROM laporan_masyarakat WHERE status != 'selesai' AND (julianday('now') - julianday(created_at)) * 24 > ${BATAS_JAM}`).c,
            rataJamPenanganan: satu("SELECT ROUND(AVG((julianday(selesai_at) - julianday(created_at)) * 24), 1) AS c FROM laporan_masyarakat WHERE status = 'selesai' AND selesai_at IS NOT NULL").c,
            rataRating: satu('SELECT ROUND(AVG(rating), 1) AS c FROM laporan_masyarakat WHERE rating IS NOT NULL').c,
            jumlahPenilaian: satu('SELECT COUNT(*) AS c FROM laporan_masyarakat WHERE rating IS NOT NULL').c,
        };
        const peringatan = db.prepare(`${SELECT_LAPORAN} WHERE lm.status != 'selesai' AND (julianday('now') - julianday(lm.created_at)) * 24 > ${BATAS_JAM} ORDER BY lm.created_at ASC`).all();
        // Rekap laporan per bulan untuk melihat kecenderungan pengaduan
        const perBulan = db.prepare(`
            SELECT strftime('%Y-%m', created_at) AS bulan, COUNT(*) AS jumlah,
                   SUM(CASE WHEN status = 'selesai' THEN 1 ELSE 0 END) AS selesai
            FROM laporan_masyarakat GROUP BY bulan ORDER BY bulan DESC LIMIT 6
        `).all();
        res.json({ success: true, stats, peringatan, perBulan });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/laporan', (req, res) => {
    try {
        const list = db.prepare(`${SELECT_LAPORAN} ORDER BY terlambat DESC, lm.created_at DESC`).all();
        res.json({ success: true, data: list, batasJam: BATAS_JAM });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Teguran pengawas kepada admin Korwil atas laporan yang belum ditangani
router.put('/laporan/:id/teguran', (req, res) => {
    try {
        const teguran = (req.body.teguran || '').trim();
        const laporan = db.prepare('SELECT id, status FROM laporan_masyarakat WHERE id = ?').get(req.params.id);
        if (!laporan) return res.status(404).json({ success: false, message: 'Laporan tidak ditemukan' });
        if (laporan.status === 'selesai') return res.status(400).json({ success: false, message: 'Laporan sudah selesai ditangani' });
        db.prepare('UPDATE laporan_masyarakat SET teguran_pengawas = ?, teguran_at = CASE WHEN ? IS NULL THEN NULL ELSE CURRENT_TIMESTAMP END WHERE id = ?')
          .run(teguran || null, teguran || null, laporan.id);
        res.json({ success: true, message: teguran ? 'Teguran dikirim ke admin Korwil' : 'Teguran dihapus' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Jadwal pengangkutan (hanya dilihat)
router.get('/jadwal', (req, res) => {
    try {
        const list = db.prepare(`
            SELECT j.*, t.nama_tps, k.nomor_polisi, s.name AS sopir_name,
                   (SELECT GROUP_CONCAT(u.name, ', ') FROM jadwal_kru jk JOIN users u ON u.id = jk.kru_id WHERE jk.jadwal_id = j.id) AS kru_names
            FROM jadwal_pengangkutan j
            LEFT JOIN tps t ON j.tps_id = t.id
            LEFT JOIN kendaraan k ON j.kendaraan_id = k.id
            LEFT JOIN users s ON j.sopir_id = s.id
            ORDER BY j.tanggal DESC, j.jam DESC
        `).all();
        res.json({ success: true, data: list });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
