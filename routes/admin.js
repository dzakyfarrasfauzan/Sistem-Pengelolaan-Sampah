const express = require('express');
const router = express.Router();
const db = require('../database/db');
const bcrypt = require('bcryptjs');
const { requireAdmin } = require('../middleware/auth');
const notifikasi = require('../utils/notifikasi');
const J = require('../utils/jadwal');
const L = require('../utils/laporan');
const upload = require('../middleware/upload');

router.use(requireAdmin);

// Dashboard
router.get('/dashboard', (req, res) => {
    try {
        J.pastikanJadwalHarian();
        const today = J.hariIni();
        const stats = {
            totalTps: db.prepare('SELECT COUNT(*) as count FROM tps').get().count,
            totalJalur: db.prepare("SELECT COUNT(*) as count FROM jalur_layanan WHERE status = 'aktif'").get().count,
            totalKendaraan: db.prepare('SELECT COUNT(*) as count FROM kendaraan').get().count,
            totalSopir: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'sopir' AND status = 'aktif'").get().count,
            totalKru: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'kru' AND status = 'aktif'").get().count,
            teguranPengawas: db.prepare("SELECT COUNT(*) as count FROM laporan_masyarakat WHERE teguran_pengawas IS NOT NULL AND status != 'selesai'").get().count,
            kendaraanPerluPerbaikan: db.prepare("SELECT COUNT(*) as count FROM kendaraan WHERE kondisi != 'baik'").get().count,
            jadwalHariIni: db.prepare("SELECT COUNT(*) as count FROM jadwal_pengangkutan WHERE tanggal = ? AND status != 'batal'").get(today).count,
            laporanMasuk: db.prepare("SELECT COUNT(*) as count FROM laporan_masyarakat WHERE status = 'masuk'").get().count,
            laporanBelumDitangani: db.prepare("SELECT COUNT(*) as count FROM laporan_masyarakat WHERE status != 'selesai'").get().count,
            laporanSelesai: db.prepare("SELECT COUNT(*) as count FROM laporan_masyarakat WHERE status = 'selesai'").get().count
        };
        const jadwalTerbaru = db.prepare(`${SELECT_JADWAL} WHERE j.tanggal = ? AND j.status != 'batal' ORDER BY j.jam ASC`).all(today);
        const laporanTerbaru = db.prepare(`SELECT * FROM laporan_masyarakat ORDER BY created_at DESC LIMIT 5`).all();
        // Laporan masuk dan selesai per bulan, 6 bulan terakhir (bulan tanpa laporan tetap ditampilkan 0)
        const rekap = db.prepare(`SELECT strftime('%Y-%m', created_at) AS bulan, COUNT(*) AS masuk,
                                  SUM(CASE WHEN status = 'selesai' THEN 1 ELSE 0 END) AS selesai
                                  FROM laporan_masyarakat GROUP BY bulan`).all();
        const perBulan = [];
        const d = new Date(`${today}T00:00:00Z`);
        for (let i = 5; i >= 0; i--) {
            const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
            const bulan = t.toISOString().slice(0, 7);
            const r = rekap.find(x => x.bulan === bulan) || {};
            perBulan.push({ bulan, masuk: r.masuk || 0, selesai: r.selesai || 0 });
        }
        const statusJadwalHariIni = db.prepare(`SELECT status, COUNT(*) AS jumlah FROM jadwal_pengangkutan WHERE tanggal = ? AND status != 'batal' GROUP BY status`).all(today);

        // Daftar "perlu tindakan hari ini" untuk dashboard
        const laporanPerluJadwal = db.prepare(`SELECT id, kode_laporan, nama_pelapor, alamat_lokasi, prioritas, created_at FROM laporan_masyarakat
            WHERE status = 'masuk'
            ORDER BY CASE prioritas WHEN 'tinggi' THEN 0 WHEN 'sedang' THEN 1 WHEN 'rendah' THEN 2 ELSE 3 END, created_at ASC LIMIT 8`).all();
        const teguran = db.prepare(`SELECT id, kode_laporan, teguran_pengawas FROM laporan_masyarakat
            WHERE teguran_pengawas IS NOT NULL AND status != 'selesai' ORDER BY created_at ASC LIMIT 5`).all();
        const armadaRusak = db.prepare(`SELECT id, nomor_polisi, jenis_kendaraan, kondisi FROM kendaraan WHERE kondisi != 'baik' ORDER BY nomor_polisi`).all();

        res.json({ success: true, stats, jadwalTerbaru, laporanTerbaru, perBulan, statusJadwalHariIni, laporanPerluJadwal, teguran, armadaRusak });
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
            // TPS cukup dilepas dari jalur layanan; jadwal tetap tercatat per jalur
            db.prepare('DELETE FROM jalur_tps WHERE tps_id = ?').run(id);
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
            db.prepare('DELETE FROM jadwal_rutin WHERE kendaraan_id = ?').run(id);
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
    db.prepare('SELECT 1 FROM jadwal_pengangkutan WHERE sopir_id = ? UNION SELECT 1 FROM jadwal_kru WHERE kru_id = ? UNION SELECT 1 FROM jadwal_rutin WHERE sopir_id = ? UNION SELECT 1 FROM jadwal_rutin_kru WHERE kru_id = ? LIMIT 1').get(id, id, id, id);

router.get('/petugas', (req, res) => {
    try {
        const list = db.prepare(`
            SELECT id, name, username, role AS peran, juga_kru, phone, address, status, created_at
            FROM users WHERE role IN ('sopir','kru')
            ORDER BY CASE role WHEN 'sopir' THEN 1 ELSE 2 END, name
        `).all();
        res.json({ success: true, data: list });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/petugas', (req, res) => {
    try {
        const { name, peran, username, password, phone, address, juga_kru } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Nama wajib diisi' });
        if (!PERAN.includes(peran)) return res.status(400).json({ success: false, message: 'Peran harus sopir atau kru' });
        if (peran === 'sopir' && (!username || !password)) {
            return res.status(400).json({ success: false, message: 'Sopir wajib memiliki username dan password untuk login' });
        }
        db.prepare(`INSERT INTO users (name, username, password, role, juga_kru, phone, address, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'aktif')`).run(
            name.trim(),
            peran === 'sopir' ? username.trim() : null,
            peran === 'sopir' ? bcrypt.hashSync(password, 10) : null,
            peran, peran === 'sopir' && juga_kru ? 1 : 0, phone || null, address || null
        );
        res.json({ success: true });
    } catch (err) {
        if (err.message.includes('UNIQUE')) return res.status(400).json({ success: false, message: 'Username sudah dipakai' });
        res.status(500).json({ success: false, message: err.message });
    }
});

router.put('/petugas/:id', (req, res) => {
    try {
        const { name, peran, username, password, phone, address, status, juga_kru } = req.body;
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
        db.prepare(`UPDATE users SET name = ?, username = ?, password = ?, role = ?, juga_kru = ?, phone = ?, address = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(name, user, pass, peran, peran === 'sopir' && juga_kru ? 1 : 0, phone || null, address || null, status || 'aktif', lama.id);
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

// Validasi tim: satu sopir aktif dan kru aktif (armada kecil seperti cator boleh tanpa kru).
// Sopir yang ditandai "juga kru" boleh menjadi kru pada jadwal lain (mis. pagi kru, siang sopir cator).
function cekTim(sopirId, kruIds) {
    if (!sopirId) return 'Sopir wajib dipilih';
    const sopir = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'sopir' AND status = 'aktif'").get(sopirId);
    if (!sopir) return 'Sopir tidak ditemukan atau tidak aktif';
    for (const k of kruIds) {
        if (String(k) === String(sopirId)) return 'Sopir tidak dapat sekaligus menjadi kru pada jadwal yang sama';
        const kru = db.prepare("SELECT id FROM users WHERE id = ? AND status = 'aktif' AND (role = 'kru' OR (role = 'sopir' AND juga_kru = 1))").get(k);
        if (!kru) return 'Kru tidak ditemukan atau tidak aktif';
    }
    return null;
}
const normalKru = J.normalKru;
// Ringkasan jadwal untuk isi notifikasi sopir
const infoJadwal = (id) => db.prepare(`
    SELECT j.tanggal, j.jam, COALESCE(jl.nama_jalur, j.lokasi) AS lokasi_tampil, k.nomor_polisi FROM jadwal_pengangkutan j
    LEFT JOIN jalur_layanan jl ON jl.id = j.jalur_id LEFT JOIN kendaraan k ON k.id = j.kendaraan_id WHERE j.id = ?`).get(id);
const teksJadwal = (j) => `${j.lokasi_tampil}, ${j.tanggal} pukul ${j.jam}, armada ${j.nomor_polisi}`;

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

// Jawaban bila ada bentrok: admin melihat daftarnya lalu boleh tetap menyimpan (paksa)
const tolakBentrok = (res, bentrok) => res.status(409).json({
    success: false, bentrok,
    message: 'Jadwal bentrok dengan jadwal lain. Periksa daftar di bawah, lalu pilih "Tetap Simpan" bila memang disengaja.',
});

// Query jadwal beserta jalur, tim, dan hasil pemeriksaan armada
const SELECT_JADWAL = `
    SELECT ${J.KOLOM_JADWAL},
           pb.kondisi as kondisi_berangkat, pb.foto as foto_berangkat,
           pp.kondisi as kondisi_pulang, pp.foto as foto_pulang
    ${J.JOIN_JADWAL}
    LEFT JOIN pemeriksaan_kendaraan pb ON pb.jadwal_id = j.id AND pb.jenis = 'sebelum berangkat'
    LEFT JOIN pemeriksaan_kendaraan pp ON pp.jadwal_id = j.id AND pp.jenis = 'sesudah pulang'
`;

// ============================================
// Jalur Layanan
// ============================================
const SELECT_JALUR = `
    SELECT jl.*,
           (SELECT GROUP_CONCAT(t.nama_tps, ', ') FROM jalur_tps jt JOIN tps t ON t.id = jt.tps_id WHERE jt.jalur_id = jl.id) AS tps_names,
           (SELECT GROUP_CONCAT(jt.tps_id) FROM jalur_tps jt WHERE jt.jalur_id = jl.id) AS tps_ids,
           (SELECT COUNT(*) FROM jadwal_rutin r WHERE r.jalur_id = jl.id AND r.status = 'aktif') AS jumlah_rutin
    FROM jalur_layanan jl`;
const angka = (v) => (v === '' || v === null || v === undefined || isNaN(Number(v)) ? null : Number(v));
const simpanJalurTps = (jalurId, tpsIds) => {
    db.prepare('DELETE FROM jalur_tps WHERE jalur_id = ?').run(jalurId);
    const ins = db.prepare('INSERT OR IGNORE INTO jalur_tps (jalur_id, tps_id) VALUES (?, ?)');
    for (const t of [...new Set((tpsIds || []).map(Number).filter(Boolean))]) ins.run(jalurId, t);
};

router.get('/jalur', (req, res) => {
    try {
        res.json({ success: true, data: db.prepare(`${SELECT_JALUR} ORDER BY jl.status, jl.nama_jalur`).all() });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.post('/jalur', (req, res) => {
    try {
        const b = req.body;
        if (!b.nama_jalur || !b.nama_jalur.trim()) return res.status(400).json({ success: false, message: 'Nama jalur wajib diisi' });
        const simpan = db.transaction(() => {
            const { lastInsertRowid } = db.prepare(`INSERT INTO jalur_layanan (nama_jalur, alamat_pelayanan, desa, kecamatan, jarak_km, waktu_tempuh_jam, estimasi_tonase, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(b.nama_jalur.trim(), b.alamat_pelayanan || null, b.desa || null, b.kecamatan || null,
                angka(b.jarak_km), angka(b.waktu_tempuh_jam) || 8, angka(b.estimasi_tonase), b.status || 'aktif');
            simpanJalurTps(lastInsertRowid, b.tps_ids);
        });
        simpan();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.put('/jalur/:id', (req, res) => {
    try {
        const b = req.body;
        if (!b.nama_jalur || !b.nama_jalur.trim()) return res.status(400).json({ success: false, message: 'Nama jalur wajib diisi' });
        const simpan = db.transaction(() => {
            db.prepare(`UPDATE jalur_layanan SET nama_jalur = ?, alamat_pelayanan = ?, desa = ?, kecamatan = ?, jarak_km = ?, waktu_tempuh_jam = ?,
                estimasi_tonase = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(b.nama_jalur.trim(), b.alamat_pelayanan || null,
                b.desa || null, b.kecamatan || null, angka(b.jarak_km), angka(b.waktu_tempuh_jam) || 8, angka(b.estimasi_tonase), b.status || 'aktif', req.params.id);
            simpanJalurTps(req.params.id, b.tps_ids);
        });
        simpan();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.delete('/jalur/:id', (req, res) => {
    try {
        const dipakai = db.prepare('SELECT 1 FROM jadwal_rutin WHERE jalur_id = ? UNION SELECT 1 FROM jadwal_pengangkutan WHERE jalur_id = ? LIMIT 1').get(req.params.id, req.params.id);
        if (dipakai) return res.status(400).json({ success: false, message: 'Jalur sudah dipakai pada jadwal. Ubah statusnya menjadi nonaktif.' });
        db.prepare('DELETE FROM jalur_layanan WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ============================================
// Jadwal Rutin Mingguan
// ============================================
const SELECT_RUTIN = `
    SELECT r.*, jl.nama_jalur, jl.desa, jl.kecamatan, jl.waktu_tempuh_jam, jl.jarak_km, jl.estimasi_tonase,
           k.nomor_polisi, k.jenis_kendaraan, s.name AS sopir_name,
           (SELECT GROUP_CONCAT(u.name, ', ') FROM jadwal_rutin_kru rk JOIN users u ON u.id = rk.kru_id WHERE rk.jadwal_rutin_id = r.id) AS kru_names,
           (SELECT GROUP_CONCAT(rk.kru_id) FROM jadwal_rutin_kru rk WHERE rk.jadwal_rutin_id = r.id) AS kru_ids
    FROM jadwal_rutin r
    LEFT JOIN jalur_layanan jl ON jl.id = r.jalur_id
    LEFT JOIN kendaraan k ON k.id = r.kendaraan_id
    LEFT JOIN users s ON s.id = r.sopir_id`;
const simpanRutinKru = (rutinId, kruIds) => {
    db.prepare('DELETE FROM jadwal_rutin_kru WHERE jadwal_rutin_id = ?').run(rutinId);
    const ins = db.prepare('INSERT INTO jadwal_rutin_kru (jadwal_rutin_id, kru_id) VALUES (?, ?)');
    for (const k of kruIds) ins.run(rutinId, k);
};
function validasiRutin(b, kruIds) {
    const hari = Number(b.hari);
    if (!(hari >= 1 && hari <= 7)) return 'Hari tidak valid';
    if (!b.jalur_id) return 'Jalur layanan wajib dipilih';
    if (!b.kendaraan_id) return 'Armada wajib dipilih';
    if (!b.jam) return 'Jam berangkat wajib diisi';
    return cekTim(b.sopir_id, kruIds);
}

router.get('/jadwal-rutin', (req, res) => {
    try {
        res.json({ success: true, data: db.prepare(`${SELECT_RUTIN} ORDER BY r.hari, r.jam, k.nomor_polisi`).all() });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.post('/jadwal-rutin', (req, res) => {
    try {
        const b = req.body;
        const kruIds = normalKru(b.kru_ids);
        const err = validasiRutin(b, kruIds);
        if (err) return res.status(400).json({ success: false, message: err });
        if (!b.paksa) {
            const bentrok = J.cekBentrokRutin({ ...b, hari: Number(b.hari), kru_ids: kruIds });
            if (bentrok.length) return tolakBentrok(res, bentrok);
        }
        const simpan = db.transaction(() => {
            const { lastInsertRowid } = db.prepare(`INSERT INTO jadwal_rutin (hari, jalur_id, kendaraan_id, sopir_id, jam, ritase, status, catatan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
                .run(Number(b.hari), b.jalur_id, b.kendaraan_id, b.sopir_id, b.jam, Number(b.ritase) || 1, b.status || 'aktif', b.catatan || null);
            simpanRutinKru(lastInsertRowid, kruIds);
        });
        simpan();
        const dibuat = J.pastikanJadwalHarian();
        res.json({ success: true, message: dibuat ? `Jadwal rutin disimpan. ${dibuat} jadwal harian dibuat otomatis untuk 7 hari ke depan.` : 'Jadwal rutin disimpan.' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.put('/jadwal-rutin/:id', (req, res) => {
    try {
        const b = req.body;
        const kruIds = normalKru(b.kru_ids);
        const err = validasiRutin(b, kruIds);
        if (err) return res.status(400).json({ success: false, message: err });
        if (!b.paksa && (b.status || 'aktif') === 'aktif') {
            const bentrok = J.cekBentrokRutin({ ...b, hari: Number(b.hari), kru_ids: kruIds, kecualiId: Number(req.params.id) });
            if (bentrok.length) return tolakBentrok(res, bentrok);
        }
        const simpan = db.transaction(() => {
            db.prepare(`UPDATE jadwal_rutin SET hari = ?, jalur_id = ?, kendaraan_id = ?, sopir_id = ?, jam = ?, ritase = ?, status = ?, catatan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
                .run(Number(b.hari), b.jalur_id, b.kendaraan_id, b.sopir_id, b.jam, Number(b.ritase) || 1, b.status || 'aktif', b.catatan || null, req.params.id);
            simpanRutinKru(req.params.id, kruIds);
        });
        simpan();
        // Jadwal harian yang belum dikerjakan dibuat ulang mengikuti perubahan
        J.hapusTurunanBelumJalan(Number(req.params.id));
        J.pastikanJadwalHarian();
        res.json({ success: true, message: 'Jadwal rutin diperbarui. Jadwal harian yang belum berjalan ikut disesuaikan.' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.delete('/jadwal-rutin/:id', (req, res) => {
    try {
        const id = Number(req.params.id);
        J.hapusTurunanBelumJalan(id);
        // Jadwal harian yang sudah berjalan/selesai tetap tersimpan sebagai riwayat
        db.prepare('DELETE FROM jadwal_rutin WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ============================================
// Jadwal Harian (hasil jadwal rutin + jadwal tambahan dari laporan masyarakat)
// ============================================
router.get('/jadwal', (req, res) => {
    try {
        J.pastikanJadwalHarian();
        const dari = req.query.dari || J.tambahHari(J.hariIni(), -30);
        const sampai = req.query.sampai || J.tambahHari(J.hariIni(), 7);
        const list = db.prepare(`${SELECT_JADWAL} WHERE j.tanggal BETWEEN ? AND ? ORDER BY j.tanggal DESC, j.jam ASC`).all(dari, sampai);
        res.json({ success: true, data: list });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Jadwal tambahan berasal dari laporan masyarakat (lihat POST /laporan-masyarakat/:id/jadwalkan)
const angkaDurasi = (v, cadangan) => angka(v) || cadangan || 2;

router.put('/jadwal/:id', (req, res) => {
    try {
        const b = req.body;
        const kruIds = normalKru(b.kru_ids);
        const errTim = cekTim(b.sopir_id, kruIds);
        if (errTim) return res.status(400).json({ success: false, message: errTim });

        const lama = db.prepare('SELECT * FROM jadwal_pengangkutan WHERE id = ?').get(req.params.id);
        if (!lama) return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan' });
        // Jalur/lokasi tidak diubah di sini: jadwal rutin mengikuti jalurnya, jadwal tambahan mengikuti lokasi laporan
        const d = {
            jalur_id: lama.jalur_id, lokasi: lama.lokasi, pemohon: lama.pemohon,
            durasi_jam: lama.jenis === 'rutin' ? lama.durasi_jam : angkaDurasi(b.durasi_jam, lama.durasi_jam),
            ritase: Number(b.ritase) || lama.ritase,
        };
        const tanggal = lama.jenis === 'rutin' ? lama.tanggal : (b.tanggal || lama.tanggal);
        const status = b.status || lama.status;

        const gantiArmada = String(lama.kendaraan_id) !== String(b.kendaraan_id);
        if (gantiArmada) {
            // Armada hanya dapat diganti sebelum pengangkutan dimulai
            if (lama.status !== 'menunggu') return res.status(400).json({ success: false, message: 'Armada tidak dapat diganti pada jadwal yang sudah berjalan atau selesai' });
            const errKendaraan = cekKendaraan(b.kendaraan_id);
            if (errKendaraan) return res.status(400).json({ success: false, message: errKendaraan });
        }
        if (!b.paksa && status !== 'batal') {
            const bentrok = J.cekBentrokHarian({ tanggal, jam: b.jam, durasi_jam: d.durasi_jam, kendaraan_id: b.kendaraan_id, sopir_id: b.sopir_id, kru_ids: kruIds, kecualiId: lama.id });
            if (bentrok.length) return tolakBentrok(res, bentrok);
        }

        const simpan = db.transaction(() => {
            db.prepare(`UPDATE jadwal_pengangkutan SET jalur_id = ?, lokasi = ?, pemohon = ?, kendaraan_id = ?, sopir_id = ?, tanggal = ?, jam = ?, durasi_jam = ?, ritase = ?,
                status = ?, catatan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
              .run(d.jalur_id, d.lokasi, d.pemohon, b.kendaraan_id, b.sopir_id, tanggal, b.jam, d.durasi_jam, d.ritase, status, b.catatan || null, lama.id);
            simpanKru(lama.id, kruIds);
            // Armada diganti: hasil pemeriksaan armada lama tidak berlaku, sopir memeriksa armada pengganti
            if (gantiArmada) db.prepare("DELETE FROM pemeriksaan_kendaraan WHERE jadwal_id = ? AND jenis = 'sebelum berangkat'").run(lama.id);
            // Laporan masyarakat mengikuti jadwalnya
            if (lama.laporan_id) {
                if (status === 'batal') L.kembalikanKeMasuk(lama.laporan_id);
                else db.prepare(`UPDATE laporan_masyarakat SET ditangani_oleh = ?, status = CASE WHEN status = 'selesai' THEN status ELSE 'diproses' END,
                                 updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(b.sopir_id, lama.laporan_id);
            }
        });
        simpan();
        const info = infoJadwal(lama.id);
        if (String(lama.sopir_id) !== String(b.sopir_id)) {
            notifikasi.kirim(Number(b.sopir_id), { jenis: 'jadwal_baru', judul: 'Jadwal pengangkutan baru', pesan: `${teksJadwal(info)}. Periksa armada sebelum berangkat.`, tautan: '/sopir/jadwal' });
        } else if (gantiArmada) {
            notifikasi.kirim(Number(b.sopir_id), { jenis: 'armada_diganti', judul: 'Armada diganti', pesan: `${teksJadwal(info)}. Periksa armada pengganti sebelum berangkat.`, tautan: '/sopir/jadwal' });
        } else if (status === 'batal' && lama.status !== 'batal') {
            notifikasi.kirim(Number(b.sopir_id), { jenis: 'jadwal_batal', judul: 'Jadwal dibatalkan', pesan: `${teksJadwal(info)} dibatalkan oleh admin.`, tautan: '/sopir/jadwal' });
        }
        res.json({ success: true, message: gantiArmada ? 'Armada diganti, sopir perlu memeriksa armada pengganti sebelum berangkat' : undefined });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/jadwal/:id', (req, res) => {
    try {
        const jadwal = db.prepare('SELECT * FROM jadwal_pengangkutan WHERE id = ?').get(req.params.id);
        if (!jadwal) return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan' });
        // Jadwal dari jadwal rutin cukup dibatalkan agar tidak dibuat ulang otomatis
        if (jadwal.jenis === 'rutin') {
            db.prepare("UPDATE jadwal_pengangkutan SET status = 'batal', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(jadwal.id);
            return res.json({ success: true, message: 'Jadwal rutin pada tanggal ini dibatalkan' });
        }
        const deleteJadwal = db.transaction((id) => {
            if (jadwal.laporan_id) L.kembalikanKeMasuk(jadwal.laporan_id);
            db.prepare('DELETE FROM pemeriksaan_kendaraan WHERE jadwal_id = ?').run(id);
            db.prepare('DELETE FROM laporan_pengangkutan WHERE jadwal_id = ?').run(id);
            db.prepare('DELETE FROM jadwal_kru WHERE jadwal_id = ?').run(id);
            db.prepare('DELETE FROM jadwal_pengangkutan WHERE id = ?').run(id);
        });
        deleteJadwal(jadwal.id);
        res.json({ success: true, message: jadwal.laporan_id ? 'Jadwal dihapus. Laporan masyarakatnya kembali berstatus masuk dan dapat dijadwalkan ulang.' : undefined });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ============================================
// Pemeriksaan Kendaraan oleh Sopir
// ============================================
router.get('/pemeriksaan-kendaraan', (req, res) => {
    try {
        const list = db.prepare(`
            SELECT p.*, k.nomor_polisi, k.jenis_kendaraan, s.name as sopir_name,
                   j.tanggal, j.jam, COALESCE(jl.nama_jalur, j.lokasi) AS lokasi_tampil
            FROM pemeriksaan_kendaraan p
            LEFT JOIN kendaraan k ON p.kendaraan_id = k.id
            LEFT JOIN users s ON p.sopir_id = s.id
            LEFT JOIN jadwal_pengangkutan j ON p.jadwal_id = j.id
            LEFT JOIN jalur_layanan jl ON j.jalur_id = jl.id
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
            SELECT lm.*, u.name as nama_petugas, u.phone as phone_petugas, u.role as peran_petugas, a.name AS nama_pencatat,
                   jd.id AS jadwal_id, jd.tanggal AS jadwal_tanggal, jd.jam AS jadwal_jam, jd.status AS jadwal_status,
                   k.nomor_polisi AS jadwal_armada,
                   (SELECT GROUP_CONCAT(x.name, ', ') FROM jadwal_kru jk JOIN users x ON x.id = jk.kru_id WHERE jk.jadwal_id = jd.id) AS jadwal_kru
            FROM laporan_masyarakat lm
            LEFT JOIN users u ON lm.ditangani_oleh = u.id
            LEFT JOIN users a ON lm.dicatat_oleh = a.id
            LEFT JOIN jadwal_pengangkutan jd ON jd.id = (SELECT MAX(id) FROM jadwal_pengangkutan WHERE laporan_id = lm.id AND status != 'batal')
            LEFT JOIN kendaraan k ON k.id = jd.kendaraan_id
            ORDER BY lm.created_at DESC
        `).all();
        res.json({ success: true, data: list });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Admin mencatat laporan yang masuk lewat telepon, WhatsApp, surat, atau pelapor yang datang langsung
router.post('/laporan-masyarakat', (req, res) => {
    upload.single('foto')(req, res, (errUpload) => {
        if (errUpload) return res.status(400).json({ success: false, message: errUpload.message || 'Gagal mengunggah foto' });
        try {
            const b = req.body;
            const wajib = { nama_pelapor: 'Nama pelapor', nomor_telepon: 'Nomor telepon', alamat_lokasi: 'Lokasi', deskripsi: 'Keterangan' };
            for (const [k, nama] of Object.entries(wajib)) {
                if (!(b[k] || '').trim()) return res.status(400).json({ success: false, message: `${nama} wajib diisi` });
            }
            if (!L.SUMBER.includes(b.sumber) || b.sumber === 'website') {
                return res.status(400).json({ success: false, message: 'Pilih sumber laporan: telepon, WhatsApp, surat, atau datang langsung' });
            }
            const kode = L.buatKodeLaporan();
            db.prepare(`INSERT INTO laporan_masyarakat (kode_laporan, nama_pelapor, nomor_telepon, deskripsi, foto, alamat_lokasi, patokan, sumber, dicatat_oleh, prioritas, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'masuk')`)
              .run(kode, b.nama_pelapor.trim(), b.nomor_telepon.trim(), b.deskripsi.trim(), req.file ? req.file.filename : null,
                   b.alamat_lokasi.trim(), (b.patokan || '').trim() || null, b.sumber, req.session.user.id, b.prioritas || null);
            notifikasi.kirim({ peran: 'pengawas' }, {
                jenis: 'laporan_baru', judul: 'Laporan masyarakat baru',
                pesan: `${kode} dari ${b.nama_pelapor.trim()} (lewat ${b.sumber}) dicatat oleh admin Korwil.`, tautan: '/pengawas/laporan',
            });
            res.json({ success: true, kodeLaporan: kode, message: `Laporan ${kode} dicatat. Berikan kode ini kepada pelapor untuk cek status.` });
        } catch (err) { res.status(500).json({ success: false, message: err.message }); }
    });
});

// Admin menentukan prioritas laporan
router.put('/laporan-masyarakat/:id', (req, res) => {
    try {
        const prio = req.body.prioritas || null;
        if (prio && !['tinggi', 'sedang', 'rendah'].includes(prio)) return res.status(400).json({ success: false, message: 'Prioritas tidak valid' });
        const r = db.prepare('UPDATE laporan_masyarakat SET prioritas = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(prio, req.params.id);
        if (!r.changes) return res.status(404).json({ success: false, message: 'Laporan tidak ditemukan' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Jadwalkan laporan masyarakat sebagai jadwal tambahan
router.post('/laporan-masyarakat/:id/jadwalkan', (req, res) => {
    try {
        const b = req.body;
        const laporan = db.prepare('SELECT * FROM laporan_masyarakat WHERE id = ?').get(req.params.id);
        if (!laporan) return res.status(404).json({ success: false, message: 'Laporan tidak ditemukan' });
        if (laporan.status === 'selesai') return res.status(400).json({ success: false, message: 'Laporan sudah selesai ditangani' });
        const ada = L.jadwalAktif(laporan.id);
        if (ada) return res.status(400).json({ success: false, message: `Laporan ini sudah dijadwalkan pada ${ada.tanggal} pukul ${ada.jam}. Ubah jadwalnya di menu Jadwal.` });

        const prio = b.prioritas || laporan.prioritas;
        if (!['tinggi', 'sedang', 'rendah'].includes(prio)) return res.status(400).json({ success: false, message: 'Tentukan prioritas laporan sebelum menjadwalkan' });
        if (!b.tanggal || !b.jam) return res.status(400).json({ success: false, message: 'Tanggal dan jam wajib diisi' });
        const kruIds = normalKru(b.kru_ids);
        const errTim = cekTim(b.sopir_id, kruIds);
        if (errTim) return res.status(400).json({ success: false, message: errTim });
        const errKendaraan = cekKendaraan(b.kendaraan_id);
        if (errKendaraan) return res.status(400).json({ success: false, message: errKendaraan });
        const durasi = angkaDurasi(b.durasi_jam);
        if (!b.paksa) {
            const bentrok = J.cekBentrokHarian({ tanggal: b.tanggal, jam: b.jam, durasi_jam: durasi, kendaraan_id: b.kendaraan_id, sopir_id: b.sopir_id, kru_ids: kruIds });
            if (bentrok.length) return tolakBentrok(res, bentrok);
        }
        const lokasi = laporan.alamat_lokasi || laporan.patokan || `Lokasi laporan ${laporan.kode_laporan}`;
        const simpan = db.transaction(() => {
            const { lastInsertRowid } = db.prepare(`INSERT INTO jadwal_pengangkutan (jenis, laporan_id, lokasi, pemohon, kendaraan_id, sopir_id, tanggal, jam, durasi_jam, ritase, catatan)
                VALUES ('tambahan', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                .run(laporan.id, lokasi, laporan.nama_pelapor, b.kendaraan_id, b.sopir_id, b.tanggal, b.jam, durasi, Number(b.ritase) || 1, b.catatan || null);
            simpanKru(lastInsertRowid, kruIds);
            db.prepare(`UPDATE laporan_masyarakat SET prioritas = ?, status = 'diproses', ditangani_oleh = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
              .run(prio, b.sopir_id, laporan.id);
            return lastInsertRowid;
        });
        const jadwalId = simpan();
        notifikasi.kirim(Number(b.sopir_id), {
            jenis: 'jadwal_baru', judul: `Jadwal tambahan dari laporan ${laporan.kode_laporan} (prioritas ${prio})`,
            pesan: `${teksJadwal(infoJadwal(jadwalId))}. Periksa armada sebelum berangkat.`, tautan: '/sopir/jadwal',
        });
        L.kabariPelapor(laporan.id, 'dijadwalkan', { tanggal: b.tanggal, jam: b.jam });
        res.json({ success: true, message: `Laporan ${laporan.kode_laporan} dijadwalkan pada ${b.tanggal} pukul ${b.jam}.` });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/laporan-masyarakat/:id', (req, res) => {
    try {
        if (db.prepare('SELECT 1 FROM jadwal_pengangkutan WHERE laporan_id = ? LIMIT 1').get(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Laporan sudah memiliki jadwal pengangkutan. Hapus jadwalnya terlebih dahulu.' });
        }
        db.prepare('DELETE FROM laporan_masyarakat WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
