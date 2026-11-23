// ============================================
// Kelas Masyarakat
// Akun pelapor: daftar dengan email dan password (aktif setelah kode OTP),
// atau masuk dengan akun Google. Tersimpan pada tabel masyarakat.
// ============================================
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { Galat } = require('./Galat');

const rapikanEmail = (v) => String(v || '').trim().toLowerCase();
const emailValid = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const waValid = (v) => /^(\+62|62|0)8[0-9]{7,12}$/.test(String(v || '').replace(/[\s-]/g, ''));
const rapikanWa = (v) => String(v || '').replace(/[\s-]/g, '');

class Masyarakat {
    constructor(baris) {
        Object.assign(this, baris);
    }

    static dariBaris(baris) { return baris ? new Masyarakat(baris) : null; }
    static tampil(id) { return Masyarakat.dariBaris(db.prepare('SELECT * FROM masyarakat WHERE id = ?').get(id)); }
    static cariEmail(alamat) { return Masyarakat.dariBaris(db.prepare('SELECT * FROM masyarakat WHERE email = ?').get(alamat)); }

    static rapikanEmail(v) { return rapikanEmail(v); }
    static emailValid(v) { return emailValid(v); }
    static waValid(v) { return waValid(v); }
    static rapikanWa(v) { return rapikanWa(v); }

    // Data akun yang dikirim ke halaman (tanpa password)
    dataAkun() {
        return { id: this.id, nama: this.nama, email: this.email, no_wa: this.no_wa, pakai_google: !!this.google_id, punya_password: !!this.password };
    }

    // Data yang disimpan pada sesi masyarakat
    keSesi() {
        return { id: this.id, nama: this.nama, email: this.email };
    }

    // Mengirim laporan sampah dari website. Hasilnya kode laporan.
    kirimLaporan(isian, foto) {
        return require('./LaporanMasyarakat').kirim(this, isian, foto);
    }

    cocokPassword(password) {
        return !!this.password && bcrypt.compareSync(String(password || ''), this.password);
    }

    // Pendaftaran akun. Pendaftaran lama yang belum diverifikasi diperbarui. Hasilnya id akun.
    static daftar({ nama, email, no_wa, password }) {
        nama = String(nama || '').trim();
        const alamat = rapikanEmail(email);
        if (!nama) throw new Galat(400, 'Nama wajib diisi');
        if (!emailValid(alamat)) throw new Galat(400, 'Format email tidak valid');
        if (!waValid(no_wa)) throw new Galat(400, 'Nomor WhatsApp tidak valid (contoh: 081234567890)');
        if (!password || String(password).length < 8) throw new Galat(400, 'Password minimal 8 karakter');

        const ada = Masyarakat.cariEmail(alamat);
        if (ada && (ada.email_terverifikasi || ada.google_id)) {
            throw new Galat(400, ada.google_id && !ada.password ? 'Email ini sudah terdaftar dengan Google. Silakan masuk dengan Google.' : 'Email sudah terdaftar. Silakan masuk.');
        }
        const hash = bcrypt.hashSync(String(password), 10);
        if (ada) {
            // Pendaftaran sebelumnya belum diverifikasi: data diperbarui dan kode dikirim lagi
            db.prepare('UPDATE masyarakat SET nama = ?, password = ?, no_wa = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(nama, hash, rapikanWa(no_wa), ada.id);
            return { id: ada.id, email: alamat };
        }
        const id = db.prepare('INSERT INTO masyarakat (nama, email, password, no_wa, email_terverifikasi) VALUES (?, ?, ?, ?, 0)')
            .run(nama, alamat, hash, rapikanWa(no_wa)).lastInsertRowid;
        return { id, email: alamat };
    }

    // Menandai email akun sudah terverifikasi
    static verifikasiEmail(id) {
        db.prepare('UPDATE masyarakat SET email_terverifikasi = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
    }

    // Masuk dengan akun Google: akun dengan email yang sama dihubungkan, atau akun baru dibuat
    static masukGoogle({ sub, email, name }) {
        const alamat = rapikanEmail(email);
        let m = db.prepare('SELECT * FROM masyarakat WHERE google_id = ? OR email = ?').get(sub, alamat);
        if (m) {
            db.prepare('UPDATE masyarakat SET google_id = ?, email_terverifikasi = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(sub, m.id);
        } else {
            const { lastInsertRowid } = db.prepare('INSERT INTO masyarakat (nama, email, google_id, email_terverifikasi) VALUES (?, ?, ?, 1)')
                .run(name || alamat.split('@')[0], alamat, sub);
            m = { id: lastInsertRowid };
        }
        return Masyarakat.tampil(m.id);
    }

    // Akun yang dapat memakai fitur lupa password (punya password)
    static punyaPassword(alamat) {
        return !!db.prepare('SELECT id FROM masyarakat WHERE email = ? AND password IS NOT NULL').get(alamat);
    }

    static aturUlangSandi(id, password) {
        // Kode dari email sudah dimasukkan, sehingga email sekaligus terverifikasi
        db.prepare('UPDATE masyarakat SET password = ?, email_terverifikasi = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(bcrypt.hashSync(String(password), 10), id);
    }

    // Ubah nama, email, atau nomor WhatsApp (email dan nomor WhatsApp setelah dikonfirmasi kode OTP)
    static ubahProfil(id, { nama, no_wa, email, terverifikasi = true }) {
        if (email !== undefined) {
            if (terverifikasi) db.prepare('UPDATE masyarakat SET email = ?, email_terverifikasi = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(email, id);
            else db.prepare('UPDATE masyarakat SET email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(email, id);
        } else if (nama !== undefined) {
            db.prepare('UPDATE masyarakat SET nama = ?, no_wa = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(nama, no_wa, id);
        } else {
            db.prepare('UPDATE masyarakat SET no_wa = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(no_wa, id);
        }
        return Masyarakat.tampil(id);
    }

    // Email sudah dipakai akun lain
    static emailDipakai(alamat, kecualiId) {
        return !!db.prepare('SELECT 1 FROM masyarakat WHERE email = ? AND id != ?').get(alamat, kecualiId);
    }

    // Laporan milik akun beserta jadwal pengangkutannya
    static laporanSaya(id) {
        return db.prepare(`
            SELECT lm.kode_laporan, lm.deskripsi, lm.foto, lm.alamat_lokasi, lm.patokan, lm.latitude, lm.longitude, lm.prioritas, lm.status,
                   lm.catatan_tindak_lanjut, lm.foto_tindak_lanjut, lm.selesai_at, lm.rating, lm.ulasan, lm.dinilai_at, lm.created_at, lm.updated_at,
                   jd.tanggal AS jadwal_tanggal, jd.jam AS jadwal_jam
            FROM laporan_masyarakat lm
            LEFT JOIN jadwal_pengangkutan jd ON jd.id = (SELECT MAX(id) FROM jadwal_pengangkutan WHERE laporan_id = lm.id AND status != 'batal')
            WHERE lm.masyarakat_id = ?
            ORDER BY lm.created_at DESC
        `).all(id);
    }
}

module.exports = Masyarakat;
