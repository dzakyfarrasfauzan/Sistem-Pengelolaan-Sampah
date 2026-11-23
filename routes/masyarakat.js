// ============================================
// Akun masyarakat (pelapor)
// - Daftar dengan email + password; akun aktif setelah kode OTP dari email dimasukkan
// - Masuk dengan email + password, atau dengan akun Google (email Google sudah terverifikasi)
// - Lupa password: kode OTP ke email, lalu password baru
// - Ganti email: kode OTP dikirim ke email baru
// - Ganti nomor WhatsApp: kode OTP dikirim ke email akun
// Bila pengiriman email belum diatur (.env kosong), verifikasi dilewati agar aplikasi tetap bisa dipakai.
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
const TEKS_OTP = {
    verifikasi: ['Kode verifikasi akun', 'memverifikasi email akun Anda'],
    reset: ['Kode atur ulang password', 'mengatur ulang password akun Anda'],
    ganti_email: ['Kode konfirmasi email baru', 'mengganti email akun Anda ke alamat ini'],
    ganti_wa: ['Kode konfirmasi nomor WhatsApp', 'mengganti nomor WhatsApp akun Anda'],
};

async function kirimOtp(alamat, tujuan, tambahan = '') {
    const terakhir = db.prepare(`SELECT created_at FROM otp_email WHERE email = ? AND tujuan = ? ORDER BY id DESC LIMIT 1`).get(alamat, tujuan);
    if (terakhir) {
        const detik = (Date.now() - new Date(terakhir.created_at + 'Z').getTime()) / 1000;
        if (detik < JEDA_KIRIM_DETIK) return { ok: false, tunggu: Math.ceil(JEDA_KIRIM_DETIK - detik) };
    }
    const kode = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    db.prepare(`UPDATE otp_email SET dipakai = 1 WHERE email = ? AND tujuan = ? AND dipakai = 0`).run(alamat, tujuan);
    db.prepare(`INSERT INTO otp_email (email, tujuan, kode_hash, kedaluwarsa) VALUES (?, ?, ?, datetime('now', '+${MENIT_BERLAKU} minutes'))`)
      .run(alamat, tujuan, bcrypt.hashSync(kode, 8));
    const [judul, untuk] = TEKS_OTP[tujuan];
    await email.kirim(alamat, judul, `
        <p>Gunakan kode berikut untuk ${untuk}:</p>${tambahan}
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
        if (ada && (ada.email_terverifikasi || ada.google_id)) {
            return res.status(400).json({ success: false, message: ada.google_id && !ada.password ? 'Email ini sudah terdaftar dengan Google. Silakan masuk dengan Google.' : 'Email sudah terdaftar. Silakan masuk.' });
        }
        const hash = bcrypt.hashSync(String(password), 10);
        let id;
        if (ada) {
            // Pendaftaran sebelumnya belum diverifikasi: data diperbarui dan kode dikirim lagi
            db.prepare('UPDATE masyarakat SET nama = ?, password = ?, no_wa = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(nama, hash, rapikanWa(req.body.no_wa), ada.id);
            id = ada.id;
        } else {
            id = db.prepare('INSERT INTO masyarakat (nama, email, password, no_wa, email_terverifikasi) VALUES (?, ?, ?, ?, 0)')
                .run(nama, alamat, hash, rapikanWa(req.body.no_wa)).lastInsertRowid;
        }

        // Email belum diatur: akun langsung aktif
        if (!email.aktif()) {
            db.prepare('UPDATE masyarakat SET email_terverifikasi = 1 WHERE id = ?').run(id);
            const m = db.prepare('SELECT * FROM masyarakat WHERE id = ?').get(id);
            masukkanSesi(req, m);
            return res.json({ success: true, akun: dataAkun(m), message: 'Pendaftaran berhasil.' });
        }
        const r = await kirimOtp(alamat, 'verifikasi');
        res.json({
            success: true, perluVerifikasi: true, email: alamat,
            message: r.ok ? `Kode verifikasi dikirim ke ${alamat}.` : `Kode sebelumnya masih bisa dipakai. ${pesanTunggu(r)}`,
        });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /masyarakat/verifikasi-email  { email, kode } - mengaktifkan akun hasil pendaftaran
router.post('/verifikasi-email', (req, res) => {
    try {
        const alamat = rapikanEmail(req.body.email);
        const m = db.prepare('SELECT * FROM masyarakat WHERE email = ?').get(alamat);
        if (!m) return res.status(400).json({ success: false, message: 'Kode salah.' });
        if (!m.email_terverifikasi) {
            const salah = cekOtp(alamat, 'verifikasi', req.body.kode);
            if (salah) return res.status(400).json({ success: false, message: salah });
            db.prepare('UPDATE masyarakat SET email_terverifikasi = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(m.id);
        }
        const akun = db.prepare('SELECT * FROM masyarakat WHERE id = ?').get(m.id);
        masukkanSesi(req, akun);
        res.json({ success: true, akun: dataAkun(akun), message: 'Email berhasil diverifikasi.' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /masyarakat/kirim-ulang-kode  { email, tujuan: 'verifikasi' | 'reset' }
router.post('/kirim-ulang-kode', async (req, res) => {
    try {
        const alamat = rapikanEmail(req.body.email);
        const tujuan = req.body.tujuan === 'verifikasi' ? 'verifikasi' : 'reset';
        const m = db.prepare('SELECT * FROM masyarakat WHERE email = ?').get(alamat);
        if (!m) return res.json({ success: true, message: 'Bila email terdaftar, kode baru sudah dikirim.' });
        if (tujuan === 'verifikasi' && m.email_terverifikasi) return res.status(400).json({ success: false, message: 'Email ini sudah terverifikasi. Silakan masuk.' });
        const r = await kirimOtp(alamat, tujuan);
        if (!r.ok) return res.status(429).json({ success: false, message: pesanTunggu(r) });
        res.json({ success: true, message: `Kode baru dikirim ke ${alamat}.` });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /masyarakat/masuk  { email, password }
router.post('/masuk', async (req, res) => {
    try {
        const alamat = rapikanEmail(req.body.email);
        const m = db.prepare('SELECT * FROM masyarakat WHERE email = ?').get(alamat);
        if (!m || !m.password || !bcrypt.compareSync(String(req.body.password || ''), m.password)) {
            const pesan = m && !m.password && m.google_id ? 'Akun ini terdaftar dengan Google. Silakan masuk dengan Google.' : 'Email atau password salah';
            return res.status(401).json({ success: false, message: pesan });
        }
        if (!m.email_terverifikasi && email.aktif()) {
            // Akun belum diverifikasi: kirim kode, lalu pengguna diarahkan ke halaman verifikasi
            const r = await kirimOtp(alamat, 'verifikasi');
            return res.status(403).json({
                success: false, perluVerifikasi: true, email: alamat,
                message: r.ok ? `Email belum diverifikasi. Kode verifikasi dikirim ke ${alamat}.` : `Email belum diverifikasi. Masukkan kode yang sudah dikirim ke ${alamat}.`,
            });
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
        // Kode dari email sudah dimasukkan, sehingga email sekaligus terverifikasi
        db.prepare('UPDATE masyarakat SET password = ?, email_terverifikasi = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(bcrypt.hashSync(String(req.body.password), 10), m.id);
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
// Nomor WhatsApp hanya bisa diisi di sini bila masih kosong (misalnya setelah daftar dengan Google).
// Mengganti nomor yang sudah ada harus lewat kode OTP (/ganti-wa).
router.put('/profil', wajibMasuk, (req, res) => {
    const nama = String(req.body.nama || '').trim();
    if (!nama) return res.status(400).json({ success: false, message: 'Nama wajib diisi' });
    const lama = db.prepare('SELECT * FROM masyarakat WHERE id = ?').get(req.session.masyarakat.id);
    let noWa = lama.no_wa;
    if (!lama.no_wa) {
        if (!waValid(req.body.no_wa)) return res.status(400).json({ success: false, message: 'Nomor WhatsApp tidak valid (contoh: 081234567890)' });
        noWa = rapikanWa(req.body.no_wa);
    }
    db.prepare('UPDATE masyarakat SET nama = ?, no_wa = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(nama, noWa, lama.id);
    req.session.masyarakat.nama = nama;
    const m = db.prepare('SELECT * FROM masyarakat WHERE id = ?').get(lama.id);
    res.json({ success: true, akun: dataAkun(m) });
});

// POST /masyarakat/ganti-email  { email_baru }  - kirim kode ke email baru
router.post('/ganti-email', wajibMasuk, async (req, res) => {
    try {
        const baru = rapikanEmail(req.body.email_baru);
        const m = db.prepare('SELECT * FROM masyarakat WHERE id = ?').get(req.session.masyarakat.id);
        if (!emailValid(baru)) return res.status(400).json({ success: false, message: 'Format email tidak valid' });
        if (baru === m.email) return res.status(400).json({ success: false, message: 'Email baru sama dengan email sekarang' });
        if (db.prepare('SELECT 1 FROM masyarakat WHERE email = ? AND id != ?').get(baru, m.id)) return res.status(400).json({ success: false, message: 'Email ini sudah dipakai akun lain' });
        if (!email.aktif()) {
            db.prepare('UPDATE masyarakat SET email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(baru, m.id);
            req.session.masyarakat.email = baru;
            return res.json({ success: true, langsung: true, akun: dataAkun(db.prepare('SELECT * FROM masyarakat WHERE id = ?').get(m.id)), message: 'Email berhasil diganti.' });
        }
        const r = await kirimOtp(baru, 'ganti_email');
        if (!r.ok) return res.status(429).json({ success: false, message: pesanTunggu(r) });
        req.session.gantiEmail = baru;
        res.json({ success: true, message: `Kode konfirmasi dikirim ke ${baru}.` });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /masyarakat/ganti-email/konfirmasi  { kode }
router.post('/ganti-email/konfirmasi', wajibMasuk, (req, res) => {
    try {
        const baru = req.session.gantiEmail;
        if (!baru) return res.status(400).json({ success: false, message: 'Masukkan email baru terlebih dahulu' });
        const salah = cekOtp(baru, 'ganti_email', req.body.kode);
        if (salah) return res.status(400).json({ success: false, message: salah });
        if (db.prepare('SELECT 1 FROM masyarakat WHERE email = ? AND id != ?').get(baru, req.session.masyarakat.id)) return res.status(400).json({ success: false, message: 'Email ini sudah dipakai akun lain' });
        db.prepare('UPDATE masyarakat SET email = ?, email_terverifikasi = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(baru, req.session.masyarakat.id);
        req.session.masyarakat.email = baru;
        delete req.session.gantiEmail;
        const m = db.prepare('SELECT * FROM masyarakat WHERE id = ?').get(req.session.masyarakat.id);
        res.json({ success: true, akun: dataAkun(m), message: 'Email berhasil diganti.' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /masyarakat/ganti-wa  { no_wa }  - kirim kode ke email akun
router.post('/ganti-wa', wajibMasuk, async (req, res) => {
    try {
        const m = db.prepare('SELECT * FROM masyarakat WHERE id = ?').get(req.session.masyarakat.id);
        if (!waValid(req.body.no_wa)) return res.status(400).json({ success: false, message: 'Nomor WhatsApp tidak valid (contoh: 081234567890)' });
        const baru = rapikanWa(req.body.no_wa);
        if (baru === m.no_wa) return res.status(400).json({ success: false, message: 'Nomor baru sama dengan nomor sekarang' });
        if (!email.aktif()) {
            db.prepare('UPDATE masyarakat SET no_wa = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(baru, m.id);
            return res.json({ success: true, langsung: true, akun: dataAkun(db.prepare('SELECT * FROM masyarakat WHERE id = ?').get(m.id)), message: 'Nomor WhatsApp berhasil diganti.' });
        }
        const r = await kirimOtp(m.email, 'ganti_wa', `<p>Nomor WhatsApp baru: <strong>${baru}</strong></p>`);
        if (!r.ok) return res.status(429).json({ success: false, message: pesanTunggu(r) });
        req.session.gantiWa = baru;
        res.json({ success: true, message: `Kode konfirmasi dikirim ke email ${m.email}.` });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /masyarakat/ganti-wa/konfirmasi  { kode }
router.post('/ganti-wa/konfirmasi', wajibMasuk, (req, res) => {
    try {
        const baru = req.session.gantiWa;
        if (!baru) return res.status(400).json({ success: false, message: 'Masukkan nomor baru terlebih dahulu' });
        const m = db.prepare('SELECT * FROM masyarakat WHERE id = ?').get(req.session.masyarakat.id);
        const salah = cekOtp(m.email, 'ganti_wa', req.body.kode);
        if (salah) return res.status(400).json({ success: false, message: salah });
        db.prepare('UPDATE masyarakat SET no_wa = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(baru, m.id);
        delete req.session.gantiWa;
        res.json({ success: true, akun: dataAkun(db.prepare('SELECT * FROM masyarakat WHERE id = ?').get(m.id)), message: 'Nomor WhatsApp berhasil diganti.' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
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
