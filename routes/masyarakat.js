// ============================================
// Akun masyarakat (pelapor)
// - Daftar dengan email + password (langsung aktif, tanpa kode verifikasi)
// - Masuk dengan email + password, atau dengan akun Google
// - Lupa password: kode OTP ke email, lalu password baru
// - Laporan Saya: riwayat dan status laporan milik akun
// Sesi masyarakat disimpan di req.session.masyarakat (terpisah dari akun petugas).
// ============================================
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../database/db');
const email = require('../utils/email');

const MENIT_BERLAKU = 10;      // kode OTP berlaku 10 menit
const MAKS_PERCOBAAN = 5;      // salah memasukkan kode paling banyak 5 kali
const JEDA_KIRIM_DETIK = 60;   // kirim ulang kode paling cepat tiap 60 detik

const rapikanEmail = (v) => String(v || '').trim().toLowerCase();
const emailValid = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const waValid = (v) => /^(\+62|62|0)8[0-9]{7,12}$/.test(String(v || '').replace(/[\s-]/g, ''));
const rapikanWa = (v) => String(v || '').replace(/[\s-]/g, '');

const dataAkun = (m) => ({ id: m.id, nama: m.nama, email: m.email, no_wa: m.no_wa, pakai_google: !!m.google_id, punya_password: !!m.password });

function masukkanSesi(req, m) {
    req.session.masyarakat = { id: m.id, nama: m.nama, email: m.email };
}

// ---------- OTP ----------
async function kirimOtp(alamat, tujuan) {
    const terakhir = db.prepare(`SELECT created_at FROM otp_email WHERE email = ? AND tujuan = ? ORDER BY id DESC LIMIT 1`).get(alamat, tujuan);
    if (terakhir) {
        const detik = (Date.now() - new Date(terakhir.created_at + 'Z').getTime()) / 1000;
        if (detik < JEDA_KIRIM_DETIK) return { ok: false, tunggu: Math.ceil(JEDA_KIRIM_DETIK - detik) };
    }
    const kode = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    db.prepare(`UPDATE otp_email SET dipakai = 1 WHERE email = ? AND tujuan = ? AND dipakai = 0`).run(alamat, tujuan);
    db.prepare(`INSERT INTO otp_email (email, tujuan, kode_hash, kedaluwarsa) VALUES (?, ?, ?, datetime('now', '+${MENIT_BERLAKU} minutes'))`)
      .run(alamat, tujuan, bcrypt.hashSync(kode, 8));
    const judul = tujuan === 'verifikasi' ? 'Kode verifikasi akun' : 'Kode atur ulang password';
    const untuk = tujuan === 'verifikasi' ? 'memverifikasi email akun Anda' : 'mengatur ulang password akun Anda';
    await email.kirim(alamat, judul, `
        <p>Gunakan kode berikut untuk ${untuk}:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:12px 0">${kode}</p>
        <p>Kode berlaku ${MENIT_BERLAKU} menit. Abaikan email ini bila Anda tidak memintanya.</p>`);
    return { ok: true };
}

function cekOtp(alamat, tujuan, kode) {
    const otp = db.prepare(`SELECT * FROM otp_email WHERE email = ? AND tujuan = ? AND dipakai = 0 ORDER BY id DESC LIMIT 1`).get(alamat, tujuan);
    if (!otp) return 'Kode tidak ditemukan. Minta kode baru.';
    if (new Date(otp.kedaluwarsa + 'Z') < new Date()) return 'Kode sudah kedaluwarsa. Minta kode baru.';
    if (otp.percobaan >= MAKS_PERCOBAAN) return 'Terlalu banyak percobaan. Minta kode baru.';
    if (!bcrypt.compareSync(String(kode || '').trim(), otp.kode_hash)) {
        db.prepare('UPDATE otp_email SET percobaan = percobaan + 1 WHERE id = ?').run(otp.id);
        return 'Kode salah.';
    }
    db.prepare('UPDATE otp_email SET dipakai = 1 WHERE id = ?').run(otp.id);
    return null;
}

const pesanTunggu = (r) => `Tunggu ${r.tunggu} detik sebelum meminta kode lagi.`;

// GET /masyarakat/konfigurasi - pengaturan yang dibutuhkan halaman masuk
router.get('/konfigurasi', (req, res) => {
    res.json({ success: true, googleClientId: process.env.GOOGLE_CLIENT_ID || null, emailAktif: email.aktif() });
});

// POST /masyarakat/daftar
router.post('/daftar', async (req, res) => {
    try {
        const nama = String(req.body.nama || '').trim();
        const alamat = rapikanEmail(req.body.email);
        const { password } = req.body;
        if (!nama) return res.status(400).json({ success: false, message: 'Nama wajib diisi' });
        if (!emailValid(alamat)) return res.status(400).json({ success: false, message: 'Format email tidak valid' });
        if (!waValid(req.body.no_wa)) return res.status(400).json({ success: false, message: 'Nomor WhatsApp tidak valid (contoh: 081234567890)' });
        if (!password || String(password).length < 8) return res.status(400).json({ success: false, message: 'Password minimal 8 karakter' });

        const ada = db.prepare('SELECT * FROM masyarakat WHERE email = ?').get(alamat);
        if (ada && (ada.password || ada.google_id)) {
            return res.status(400).json({ success: false, message: ada.google_id && !ada.password ? 'Email ini sudah terdaftar dengan Google. Silakan masuk dengan Google.' : 'Email sudah terdaftar. Silakan masuk.' });
        }
        const { lastInsertRowid } = db.prepare('INSERT INTO masyarakat (nama, email, password, no_wa) VALUES (?, ?, ?, ?)')
            .run(nama, alamat, bcrypt.hashSync(String(password), 10), rapikanWa(req.body.no_wa));
        const m = db.prepare('SELECT * FROM masyarakat WHERE id = ?').get(lastInsertRowid);
        masukkanSesi(req, m);
        res.json({ success: true, akun: dataAkun(m), message: 'Pendaftaran berhasil.' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /masyarakat/kirim-ulang-kode  { email } - kode atur ulang password
router.post('/kirim-ulang-kode', async (req, res) => {
    try {
        const alamat = rapikanEmail(req.body.email);
        const tujuan = 'reset';
        const m = db.prepare('SELECT * FROM masyarakat WHERE email = ?').get(alamat);
        if (!m) return res.json({ success: true, message: 'Bila email terdaftar, kode baru sudah dikirim.' });
        const r = await kirimOtp(alamat, tujuan);
        if (!r.ok) return res.status(429).json({ success: false, message: pesanTunggu(r) });
        res.json({ success: true, message: `Kode baru dikirim ke ${alamat}.` });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /masyarakat/masuk  { email, password }
router.post('/masuk', (req, res) => {
    try {
        const alamat = rapikanEmail(req.body.email);
        const m = db.prepare('SELECT * FROM masyarakat WHERE email = ?').get(alamat);
        if (!m || !m.password || !bcrypt.compareSync(String(req.body.password || ''), m.password)) {
            const pesan = m && !m.password && m.google_id ? 'Akun ini terdaftar dengan Google. Silakan masuk dengan Google.' : 'Email atau password salah';
            return res.status(401).json({ success: false, message: pesan });
        }
        masukkanSesi(req, m);
        res.json({ success: true, akun: dataAkun(m) });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /masyarakat/google  { credential }  - ID token dari tombol "Masuk dengan Google"
router.post('/google', async (req, res) => {
    try {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!clientId) return res.status(400).json({ success: false, message: 'Masuk dengan Google belum diatur' });
        const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(req.body.credential || '')}`);
        const t = await r.json();
        const iss = ['accounts.google.com', 'https://accounts.google.com'];
        if (!r.ok || t.aud !== clientId || !iss.includes(t.iss) || String(t.email_verified) !== 'true' || Number(t.exp) * 1000 < Date.now()) {
            return res.status(401).json({ success: false, message: 'Gagal memverifikasi akun Google' });
        }
        const alamat = rapikanEmail(t.email);
        let m = db.prepare('SELECT * FROM masyarakat WHERE google_id = ? OR email = ?').get(t.sub, alamat);
        if (m) {
            // Akun email yang sama otomatis terhubung dengan Google
            db.prepare('UPDATE masyarakat SET google_id = ?, email_terverifikasi = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(t.sub, m.id);
        } else {
            const { lastInsertRowid } = db.prepare('INSERT INTO masyarakat (nama, email, google_id, email_terverifikasi) VALUES (?, ?, ?, 1)')
                .run(t.name || alamat.split('@')[0], alamat, t.sub);
            m = { id: lastInsertRowid };
        }
        m = db.prepare('SELECT * FROM masyarakat WHERE id = ?').get(m.id);
        masukkanSesi(req, m);
        res.json({ success: true, akun: dataAkun(m), perluNoWa: !m.no_wa });
    } catch (err) { res.status(500).json({ success: false, message: 'Gagal masuk dengan Google: ' + err.message }); }
});

// POST /masyarakat/lupa-password  { email }
router.post('/lupa-password', async (req, res) => {
    try {
        const alamat = rapikanEmail(req.body.email);
        const m = db.prepare('SELECT id FROM masyarakat WHERE email = ? AND password IS NOT NULL').get(alamat);
        if (m) {
            const r = await kirimOtp(alamat, 'reset');
            if (!r.ok) return res.status(429).json({ success: false, message: pesanTunggu(r) });
        }
        // Jawaban sama walau email tidak terdaftar, agar daftar email tidak bisa ditebak
        res.json({ success: true, message: 'Bila email terdaftar, kode atur ulang password sudah dikirim.' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /masyarakat/atur-ulang-password  { email, kode, password }
router.post('/atur-ulang-password', (req, res) => {
    try {
        const alamat = rapikanEmail(req.body.email);
        if (!req.body.password || String(req.body.password).length < 8) return res.status(400).json({ success: false, message: 'Password minimal 8 karakter' });
        const m = db.prepare('SELECT * FROM masyarakat WHERE email = ?').get(alamat);
        if (!m) return res.status(400).json({ success: false, message: 'Kode salah.' });
        const salah = cekOtp(alamat, 'reset', req.body.kode);
        if (salah) return res.status(400).json({ success: false, message: salah });
        db.prepare('UPDATE masyarakat SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(bcrypt.hashSync(String(req.body.password), 10), m.id);
        res.json({ success: true, message: 'Password berhasil diganti. Silakan masuk.' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ---------- Butuh login ----------
function wajibMasuk(req, res, next) {
    if (!req.session.masyarakat) return res.status(401).json({ success: false, message: 'Silakan masuk terlebih dahulu' });
    next();
}

// GET /masyarakat/saya
router.get('/saya', (req, res) => {
    if (!req.session.masyarakat) return res.json({ success: true, akun: null });
    const m = db.prepare('SELECT * FROM masyarakat WHERE id = ?').get(req.session.masyarakat.id);
    if (!m) { delete req.session.masyarakat; return res.json({ success: true, akun: null }); }
    res.json({ success: true, akun: dataAkun(m) });
});

// PUT /masyarakat/profil  { nama, no_wa }
router.put('/profil', wajibMasuk, (req, res) => {
    const nama = String(req.body.nama || '').trim();
    if (!nama) return res.status(400).json({ success: false, message: 'Nama wajib diisi' });
    if (!waValid(req.body.no_wa)) return res.status(400).json({ success: false, message: 'Nomor WhatsApp tidak valid (contoh: 081234567890)' });
    db.prepare('UPDATE masyarakat SET nama = ?, no_wa = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(nama, rapikanWa(req.body.no_wa), req.session.masyarakat.id);
    req.session.masyarakat.nama = nama;
    const m = db.prepare('SELECT * FROM masyarakat WHERE id = ?').get(req.session.masyarakat.id);
    res.json({ success: true, akun: dataAkun(m) });
});

// POST /masyarakat/keluar
router.post('/keluar', (req, res) => {
    delete req.session.masyarakat;
    res.json({ success: true });
});

// GET /masyarakat/laporan - laporan milik akun yang sedang masuk
router.get('/laporan', wajibMasuk, (req, res) => {
    const data = db.prepare(`
        SELECT lm.kode_laporan, lm.deskripsi, lm.foto, lm.alamat_lokasi, lm.patokan, lm.latitude, lm.longitude, lm.prioritas, lm.status,
               lm.catatan_tindak_lanjut, lm.foto_tindak_lanjut, lm.selesai_at, lm.rating, lm.ulasan, lm.dinilai_at, lm.created_at, lm.updated_at,
               jd.tanggal AS jadwal_tanggal, jd.jam AS jadwal_jam
        FROM laporan_masyarakat lm
        LEFT JOIN jadwal_pengangkutan jd ON jd.id = (SELECT MAX(id) FROM jadwal_pengangkutan WHERE laporan_id = lm.id AND status != 'batal')
        WHERE lm.masyarakat_id = ?
        ORDER BY lm.created_at DESC
    `).all(req.session.masyarakat.id);
    res.json({ success: true, data });
});

module.exports = router;
module.exports.wajibMasuk = wajibMasuk;
