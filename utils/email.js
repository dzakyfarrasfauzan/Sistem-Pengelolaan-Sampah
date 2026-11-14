// ============================================
// Pengiriman email (Nodemailer + SMTP Gmail)
// Pengaturan di file .env:
//   EMAIL_PENGIRIM=akun.gmail@gmail.com
//   EMAIL_APP_PASSWORD=sandi aplikasi 16 huruf dari Google
// Bila belum diatur, isi email ditampilkan di terminal backend saja
// (berguna saat uji coba tanpa internet).
// ============================================
const nodemailer = require('nodemailer');

let transporter = null;
function siapkan() {
    if (transporter || !process.env.EMAIL_PENGIRIM || !process.env.EMAIL_APP_PASSWORD) return transporter;
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_PENGIRIM, pass: process.env.EMAIL_APP_PASSWORD.replace(/\s+/g, '') },
    });
    return transporter;
}

const bungkus = (judul, isi) => `
<div style="font-family:Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;color:#1f2933">
  <div style="background:#17533a;color:#fff;padding:12px 18px;font-weight:600">DLH Kabupaten Sukabumi · Sistem Pengelolaan Sampah</div>
  <div style="border:1px solid #d8dde3;border-top:none;padding:18px">
    <h2 style="font-size:18px;margin:0 0 12px">${judul}</h2>
    ${isi}
    <p style="color:#5b6673;font-size:12px;margin-top:20px">Email ini dikirim otomatis, mohon tidak dibalas.</p>
  </div>
</div>`;

// Kirim email; tidak pernah melempar error agar proses utama (simpan laporan dsb.) tetap berhasil
async function kirim(ke, judul, isiHtml) {
    if (!ke) return false;
    const t = siapkan();
    if (!t) {
        console.log(`\n✉️  [EMAIL belum diatur — ditampilkan di sini]\n   Ke: ${ke}\n   Judul: ${judul}\n   ${isiHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}\n`);
        return false;
    }
    try {
        await t.sendMail({ from: `"DLH Kab. Sukabumi" <${process.env.EMAIL_PENGIRIM}>`, to: ke, subject: judul, html: bungkus(judul, isiHtml) });
        return true;
    } catch (err) {
        console.error('Gagal mengirim email:', err.message);
        return false;
    }
}

const aktif = () => !!siapkan();

module.exports = { kirim, aktif };
