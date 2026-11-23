// ============================================
// Kelas OtpEmail
// Kode OTP 6 digit yang dikirim ke email untuk verifikasi akun, atur ulang
// password, ganti email, dan ganti nomor WhatsApp. Kode disimpan dalam bentuk
// hash, berlaku 10 menit, dan dapat dicoba paling banyak 5 kali.
// ============================================
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../database/db');
const email = require('../utils/email');

const MENIT_BERLAKU = 10;      // kode OTP berlaku 10 menit
const MAKS_PERCOBAAN = 5;      // salah memasukkan kode paling banyak 5 kali
const JEDA_KIRIM_DETIK = 60;   // kirim ulang kode paling cepat tiap 60 detik

const TEKS_OTP = {
    verifikasi: ['Kode verifikasi akun', 'memverifikasi email akun Anda'],
    reset: ['Kode atur ulang password', 'mengatur ulang password akun Anda'],
    ganti_email: ['Kode konfirmasi email baru', 'mengganti email akun Anda ke alamat ini'],
    ganti_wa: ['Kode konfirmasi nomor WhatsApp', 'mengganti nomor WhatsApp akun Anda'],
};

class OtpEmail {
    // Membuat kode baru lalu mengirimkannya ke email. Hasil { ok } atau { ok: false, tunggu } bila terlalu cepat.
    static async buatKode(alamat, tujuan, tambahan = '') {
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

    // Mencocokkan kode. Hasil null bila benar, atau pesan kesalahan.
    static cekKode(alamat, tujuan, kode) {
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

    static pesanTunggu(r) {
        return `Tunggu ${r.tunggu} detik sebelum meminta kode lagi.`;
    }
}

module.exports = OtpEmail;
