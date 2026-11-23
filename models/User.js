// ============================================
// Kelas User (induk generalisasi)
// Seluruh personel disimpan pada satu tabel users dan dibedakan oleh kolom role
// (single table inheritance). Saat dibaca dari basis data, setiap baris dijadikan
// objek turunan sesuai perannya: Admin, Pengawas, Sopir, atau Kru.
// ============================================
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { Galat } = require('./Galat');

const PERAN_PETUGAS = ['sopir', 'kru'];

class User {
    constructor(baris = {}) {
        this.id = baris.id;
        this.name = baris.name;
        this.username = baris.username || null;
        this.role = baris.role;
        this.phone = baris.phone || null;
        this.address = baris.address || null;
        this.status = baris.status || 'aktif';
    }

    // Membuat objek turunan sesuai kolom role
    static dariBaris(baris) {
        if (!baris) return null;
        const Kelas = {
            admin: require('./Admin'),
            pengawas: require('./Pengawas'),
            sopir: require('./Sopir'),
            kru: require('./Kru'),
        }[baris.role] || User;
        return new Kelas(baris);
    }

    // Objek pengguna dari data sesi login
    static dariSesi(sesi) {
        return sesi ? User.dariBaris(sesi) : null;
    }

    // Akun yang boleh login: admin, pengawas, dan sopir yang aktif; kru tidak login
    static login(username, password) {
        const baris = db.prepare("SELECT * FROM users WHERE username = ? AND status = 'aktif' AND role IN ('admin','pengawas','sopir') AND password IS NOT NULL").get(username);
        if (!baris || !bcrypt.compareSync(password, baris.password)) return null;
        const user = User.dariBaris(baris);
        return user.bisaLogin() ? user : null;
    }

    bisaLogin() { return true; }

    // Data yang disimpan pada sesi login
    keSesi() {
        return { id: this.id, name: this.name, username: this.username, role: this.role };
    }

    static cari(id) {
        return User.dariBaris(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
    }

    // ---------- Pengelolaan petugas operasional (sopir dan kru) oleh admin ----------
    static tampil() {
        return db.prepare(`
            SELECT id, name, username, role AS peran, juga_kru, phone, address, status, created_at
            FROM users WHERE role IN ('sopir','kru')
            ORDER BY CASE role WHEN 'sopir' THEN 1 ELSE 2 END, name
        `).all();
    }

    static tampilSatu(id) {
        return db.prepare("SELECT id, name, username, role AS peran, phone, address, status, created_at, updated_at FROM users WHERE id = ? AND role IN ('sopir','kru')").get(id);
    }

    // Petugas yang sudah tercantum pada jadwal (rutin maupun harian)
    static dipakaiJadwal(id) {
        return db.prepare('SELECT 1 FROM jadwal_pengangkutan WHERE sopir_id = ? UNION SELECT 1 FROM jadwal_kru WHERE kru_id = ? UNION SELECT 1 FROM jadwal_rutin WHERE sopir_id = ? UNION SELECT 1 FROM jadwal_rutin_kru WHERE kru_id = ? LIMIT 1').get(id, id, id, id);
    }

    static tambah({ name, peran, username, password, phone, address, juga_kru }) {
        if (!name || !name.trim()) throw new Galat(400, 'Nama wajib diisi');
        if (!PERAN_PETUGAS.includes(peran)) throw new Galat(400, 'Peran harus sopir atau kru');
        if (peran === 'sopir' && (!username || !password)) throw new Galat(400, 'Sopir wajib memiliki username dan password untuk login');
        try {
            return db.prepare(`INSERT INTO users (name, username, password, role, juga_kru, phone, address, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'aktif')`).run(
                name.trim(),
                peran === 'sopir' ? username.trim() : null,
                peran === 'sopir' ? bcrypt.hashSync(password, 10) : null,
                peran, peran === 'sopir' && juga_kru ? 1 : 0, phone || null, address || null
            ).lastInsertRowid;
        } catch (err) {
            if (err.message.includes('UNIQUE')) throw new Galat(400, 'Username sudah dipakai');
            throw err;
        }
    }

    static ubah(id, { name, peran, username, password, phone, address, status, juga_kru }) {
        const lama = db.prepare("SELECT * FROM users WHERE id = ? AND role IN ('sopir','kru')").get(id);
        if (!lama) throw new Galat(404, 'Petugas tidak ditemukan');
        if (!PERAN_PETUGAS.includes(peran)) throw new Galat(400, 'Peran harus sopir atau kru');
        if (peran !== lama.role && User.dipakaiJadwal(lama.id)) throw new Galat(400, 'Peran tidak dapat diubah karena petugas sudah tercantum pada jadwal');
        let user = null, pass = null;
        if (peran === 'sopir') {
            if (!username) throw new Galat(400, 'Sopir wajib memiliki username');
            user = username.trim();
            pass = password && password.trim() !== '' ? bcrypt.hashSync(password, 10) : lama.password;
            if (!pass) throw new Galat(400, 'Isi password untuk akun login sopir');
        }
        try {
            db.prepare(`UPDATE users SET name = ?, username = ?, password = ?, role = ?, juga_kru = ?, phone = ?, address = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
              .run(name, user, pass, peran, peran === 'sopir' && juga_kru ? 1 : 0, phone || null, address || null, status || 'aktif', lama.id);
        } catch (err) {
            if (err.message.includes('UNIQUE')) throw new Galat(400, 'Username sudah dipakai');
            throw err;
        }
    }

    static hapus(id) {
        const riwayat = User.dipakaiJadwal(id)
            || db.prepare('SELECT 1 FROM laporan_masyarakat WHERE ditangani_oleh = ? LIMIT 1').get(id)
            || db.prepare('SELECT 1 FROM pemeriksaan_kendaraan WHERE sopir_id = ? LIMIT 1').get(id);
        if (riwayat) throw new Galat(400, 'Petugas sudah memiliki riwayat jadwal atau penanganan laporan. Ubah statusnya menjadi nonaktif.');
        db.prepare("DELETE FROM users WHERE id = ? AND role IN ('sopir','kru')").run(id);
    }

    // Validasi tim pada jadwal: satu sopir aktif dan kru aktif (armada kecil seperti cator boleh tanpa kru).
    // Sopir yang ditandai "juga kru" boleh menjadi kru pada jadwal lain.
    static validasiTim(sopirId, kruIds) {
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

    static jumlahAktif(role) {
        return db.prepare("SELECT COUNT(*) as count FROM users WHERE role = ? AND status = 'aktif'").get(role).count;
    }
}

module.exports = User;
