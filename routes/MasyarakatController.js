// ============================================
// Controller akun masyarakat (pelapor)
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
const email = require('../utils/email');
const { Galat, tangani } = require('../models/Galat');
const Masyarakat = require('../models/Masyarakat');
const OtpEmail = require('../models/OtpEmail');

const masukkanSesi = (req, m) => { req.session.masyarakat = m.keSesi(); };
const gagal = (res, status, message, tambahan = {}) => res.status(status).json({ success: false, message, ...tambahan });

// GET /masyarakat/konfigurasi - pengaturan yang dibutuhkan halaman masuk
router.get('/konfigurasi', (req, res) => {
    res.json({ success: true, googleClientId: process.env.GOOGLE_CLIENT_ID || null, emailAktif: email.aktif() });
});

// POST /masyarakat/daftar
router.post('/daftar', tangani(async (req, res) => {
    const { id, email: alamat } = Masyarakat.daftar(req.body);
    // Email belum diatur: akun langsung aktif
    if (!email.aktif()) {
        Masyarakat.verifikasiEmail(id);
        const m = Masyarakat.tampil(id);
        masukkanSesi(req, m);
        return res.json({ success: true, akun: m.dataAkun(), message: 'Pendaftaran berhasil.' });
    }
    const r = await OtpEmail.buatKode(alamat, 'verifikasi');
    res.json({
        success: true, perluVerifikasi: true, email: alamat,
        message: r.ok ? `Kode verifikasi dikirim ke ${alamat}.` : `Kode sebelumnya masih bisa dipakai. ${OtpEmail.pesanTunggu(r)}`,
    });
}));

// POST /masyarakat/verifikasi-email  { email, kode } - mengaktifkan akun hasil pendaftaran
router.post('/verifikasi-email', tangani((req, res) => {
    const alamat = Masyarakat.rapikanEmail(req.body.email);
    const m = Masyarakat.cariEmail(alamat);
    if (!m) return gagal(res, 400, 'Kode salah.');
    if (!m.email_terverifikasi) {
        const salah = OtpEmail.cekKode(alamat, 'verifikasi', req.body.kode);
        if (salah) return gagal(res, 400, salah);
        Masyarakat.verifikasiEmail(m.id);
    }
    const akun = Masyarakat.tampil(m.id);
    masukkanSesi(req, akun);
    res.json({ success: true, akun: akun.dataAkun(), message: 'Email berhasil diverifikasi.' });
}));

// POST /masyarakat/kirim-ulang-kode  { email, tujuan: 'verifikasi' | 'reset' }
router.post('/kirim-ulang-kode', tangani(async (req, res) => {
    const alamat = Masyarakat.rapikanEmail(req.body.email);
    const tujuan = req.body.tujuan === 'verifikasi' ? 'verifikasi' : 'reset';
    const m = Masyarakat.cariEmail(alamat);
    if (!m) return res.json({ success: true, message: 'Bila email terdaftar, kode baru sudah dikirim.' });
    if (tujuan === 'verifikasi' && m.email_terverifikasi) return gagal(res, 400, 'Email ini sudah terverifikasi. Silakan masuk.');
    const r = await OtpEmail.buatKode(alamat, tujuan);
    if (!r.ok) return gagal(res, 429, OtpEmail.pesanTunggu(r));
    res.json({ success: true, message: `Kode baru dikirim ke ${alamat}.` });
}));

// POST /masyarakat/masuk  { email, password }
router.post('/masuk', tangani(async (req, res) => {
    const alamat = Masyarakat.rapikanEmail(req.body.email);
    const m = Masyarakat.cariEmail(alamat);
    if (!m || !m.cocokPassword(req.body.password)) {
        const pesan = m && !m.password && m.google_id ? 'Akun ini terdaftar dengan Google. Silakan masuk dengan Google.' : 'Email atau password salah';
        return gagal(res, 401, pesan);
    }
    if (!m.email_terverifikasi && email.aktif()) {
        // Akun belum diverifikasi: kirim kode, lalu pengguna diarahkan ke halaman verifikasi
        const r = await OtpEmail.buatKode(alamat, 'verifikasi');
        return gagal(res, 403, r.ok ? `Email belum diverifikasi. Kode verifikasi dikirim ke ${alamat}.` : `Email belum diverifikasi. Masukkan kode yang sudah dikirim ke ${alamat}.`,
            { perluVerifikasi: true, email: alamat });
    }
    masukkanSesi(req, m);
    res.json({ success: true, akun: m.dataAkun() });
}));

// POST /masyarakat/google  { credential }  - ID token dari tombol "Masuk dengan Google"
router.post('/google', async (req, res) => {
    try {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!clientId) return gagal(res, 400, 'Masuk dengan Google belum diatur');
        const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(req.body.credential || '')}`);
        const t = await r.json();
        const iss = ['accounts.google.com', 'https://accounts.google.com'];
        if (!r.ok || t.aud !== clientId || !iss.includes(t.iss) || String(t.email_verified) !== 'true' || Number(t.exp) * 1000 < Date.now()) {
            return gagal(res, 401, 'Gagal memverifikasi akun Google');
        }
        const m = Masyarakat.masukGoogle(t);
        masukkanSesi(req, m);
        res.json({ success: true, akun: m.dataAkun(), perluNoWa: !m.no_wa });
    } catch (err) { gagal(res, 500, 'Gagal masuk dengan Google: ' + err.message); }
});

// POST /masyarakat/lupa-password  { email }
router.post('/lupa-password', tangani(async (req, res) => {
    const alamat = Masyarakat.rapikanEmail(req.body.email);
    if (Masyarakat.punyaPassword(alamat)) {
        const r = await OtpEmail.buatKode(alamat, 'reset');
        if (!r.ok) return gagal(res, 429, OtpEmail.pesanTunggu(r));
    }
    // Jawaban sama walau email tidak terdaftar, agar daftar email tidak bisa ditebak
    res.json({ success: true, message: 'Bila email terdaftar, kode atur ulang password sudah dikirim.' });
}));

// POST /masyarakat/atur-ulang-password  { email, kode, password }
router.post('/atur-ulang-password', tangani((req, res) => {
    const alamat = Masyarakat.rapikanEmail(req.body.email);
    if (!req.body.password || String(req.body.password).length < 8) return gagal(res, 400, 'Password minimal 8 karakter');
    const m = Masyarakat.cariEmail(alamat);
    if (!m) return gagal(res, 400, 'Kode salah.');
    const salah = OtpEmail.cekKode(alamat, 'reset', req.body.kode);
    if (salah) return gagal(res, 400, salah);
    Masyarakat.aturUlangSandi(m.id, req.body.password);
    res.json({ success: true, message: 'Password berhasil diganti. Silakan masuk.' });
}));

// ---------- Butuh login ----------
function wajibMasuk(req, res, next) {
    if (!req.session.masyarakat) return gagal(res, 401, 'Silakan masuk terlebih dahulu');
    next();
}

// GET /masyarakat/saya
router.get('/saya', (req, res) => {
    if (!req.session.masyarakat) return res.json({ success: true, akun: null });
    const m = Masyarakat.tampil(req.session.masyarakat.id);
    if (!m) { delete req.session.masyarakat; return res.json({ success: true, akun: null }); }
    res.json({ success: true, akun: m.dataAkun() });
});

// PUT /masyarakat/profil  { nama, no_wa }
// Nomor WhatsApp hanya bisa diisi di sini bila masih kosong (misalnya setelah daftar dengan Google).
// Mengganti nomor yang sudah ada harus lewat kode OTP (/ganti-wa).
router.put('/profil', wajibMasuk, (req, res) => {
    const nama = String(req.body.nama || '').trim();
    if (!nama) return gagal(res, 400, 'Nama wajib diisi');
    const lama = Masyarakat.tampil(req.session.masyarakat.id);
    let noWa = lama.no_wa;
    if (!lama.no_wa) {
        if (!Masyarakat.waValid(req.body.no_wa)) return gagal(res, 400, 'Nomor WhatsApp tidak valid (contoh: 081234567890)');
        noWa = Masyarakat.rapikanWa(req.body.no_wa);
    }
    const m = Masyarakat.ubahProfil(lama.id, { nama, no_wa: noWa });
    req.session.masyarakat.nama = nama;
    res.json({ success: true, akun: m.dataAkun() });
});

// POST /masyarakat/ganti-email  { email_baru }  - kirim kode ke email baru
router.post('/ganti-email', wajibMasuk, tangani(async (req, res) => {
    const baru = Masyarakat.rapikanEmail(req.body.email_baru);
    const m = Masyarakat.tampil(req.session.masyarakat.id);
    if (!Masyarakat.emailValid(baru)) return gagal(res, 400, 'Format email tidak valid');
    if (baru === m.email) return gagal(res, 400, 'Email baru sama dengan email sekarang');
    if (Masyarakat.emailDipakai(baru, m.id)) return gagal(res, 400, 'Email ini sudah dipakai akun lain');
    if (!email.aktif()) {
        const akun = Masyarakat.ubahProfil(m.id, { email: baru, terverifikasi: false });
        req.session.masyarakat.email = baru;
        return res.json({ success: true, langsung: true, akun: akun.dataAkun(), message: 'Email berhasil diganti.' });
    }
    const r = await OtpEmail.buatKode(baru, 'ganti_email');
    if (!r.ok) return gagal(res, 429, OtpEmail.pesanTunggu(r));
    req.session.gantiEmail = baru;
    res.json({ success: true, message: `Kode konfirmasi dikirim ke ${baru}.` });
}));

// POST /masyarakat/ganti-email/konfirmasi  { kode }
router.post('/ganti-email/konfirmasi', wajibMasuk, tangani((req, res) => {
    const baru = req.session.gantiEmail;
    if (!baru) return gagal(res, 400, 'Masukkan email baru terlebih dahulu');
    const salah = OtpEmail.cekKode(baru, 'ganti_email', req.body.kode);
    if (salah) return gagal(res, 400, salah);
    if (Masyarakat.emailDipakai(baru, req.session.masyarakat.id)) return gagal(res, 400, 'Email ini sudah dipakai akun lain');
    const m = Masyarakat.ubahProfil(req.session.masyarakat.id, { email: baru });
    req.session.masyarakat.email = baru;
    delete req.session.gantiEmail;
    res.json({ success: true, akun: m.dataAkun(), message: 'Email berhasil diganti.' });
}));

// POST /masyarakat/ganti-wa  { no_wa }  - kirim kode ke email akun
router.post('/ganti-wa', wajibMasuk, tangani(async (req, res) => {
    const m = Masyarakat.tampil(req.session.masyarakat.id);
    if (!Masyarakat.waValid(req.body.no_wa)) return gagal(res, 400, 'Nomor WhatsApp tidak valid (contoh: 081234567890)');
    const baru = Masyarakat.rapikanWa(req.body.no_wa);
    if (baru === m.no_wa) return gagal(res, 400, 'Nomor baru sama dengan nomor sekarang');
    if (!email.aktif()) {
        const akun = Masyarakat.ubahProfil(m.id, { no_wa: baru });
        return res.json({ success: true, langsung: true, akun: akun.dataAkun(), message: 'Nomor WhatsApp berhasil diganti.' });
    }
    const r = await OtpEmail.buatKode(m.email, 'ganti_wa', `<p>Nomor WhatsApp baru: <strong>${baru}</strong></p>`);
    if (!r.ok) return gagal(res, 429, OtpEmail.pesanTunggu(r));
    req.session.gantiWa = baru;
    res.json({ success: true, message: `Kode konfirmasi dikirim ke email ${m.email}.` });
}));

// POST /masyarakat/ganti-wa/konfirmasi  { kode }
router.post('/ganti-wa/konfirmasi', wajibMasuk, tangani((req, res) => {
    const baru = req.session.gantiWa;
    if (!baru) return gagal(res, 400, 'Masukkan nomor baru terlebih dahulu');
    const m = Masyarakat.tampil(req.session.masyarakat.id);
    const salah = OtpEmail.cekKode(m.email, 'ganti_wa', req.body.kode);
    if (salah) return gagal(res, 400, salah);
    const akun = Masyarakat.ubahProfil(m.id, { no_wa: baru });
    delete req.session.gantiWa;
    res.json({ success: true, akun: akun.dataAkun(), message: 'Nomor WhatsApp berhasil diganti.' });
}));

// POST /masyarakat/keluar
router.post('/keluar', (req, res) => {
    delete req.session.masyarakat;
    res.json({ success: true });
});

// GET /masyarakat/laporan - laporan milik akun yang sedang masuk
router.get('/laporan', wajibMasuk, (req, res) => {
    res.json({ success: true, data: Masyarakat.laporanSaya(req.session.masyarakat.id) });
});

module.exports = router;
module.exports.wajibMasuk = wajibMasuk;
