// ============================================
// Kelas Notifikasi
// Pemberitahuan untuk akun admin, sopir, dan pengawas. Notifikasi disimpan di
// tabel notifikasi lalu langsung dikirim ke browser penerima melalui Socket.IO.
// Riwayat disimpan 30 hari, lalu dihapus otomatis.
// ============================================
const db = require('../database/db');
const socket = require('../utils/socket');

const MASA_SIMPAN_HARI = 30;
const BATAS_TERLAMBAT_JAM = 48;

class Notifikasi {
    static get MASA_SIMPAN_HARI() { return MASA_SIMPAN_HARI; }

    /**
     * Kirim notifikasi ke satu atau beberapa akun.
     * tujuan: id user, array id user, atau { peran: 'admin' | 'pengawas' | 'sopir' }
     */
    static kirim(tujuan, { jenis, judul, pesan, tautan = null }) {
        try {
            let ids = [];
            if (tujuan && typeof tujuan === 'object' && !Array.isArray(tujuan) && tujuan.peran) {
                ids = db.prepare("SELECT id FROM users WHERE role = ? AND status = 'aktif'").all(tujuan.peran).map(u => u.id);
            } else {
                ids = (Array.isArray(tujuan) ? tujuan : [tujuan]).filter(Boolean);
            }
            const ins = db.prepare('INSERT INTO notifikasi (user_id, jenis, judul, pesan, tautan) VALUES (?, ?, ?, ?, ?)');
            db.transaction(() => { for (const id of ids) ins.run(id, jenis, judul, pesan, tautan); })();
            // Dorong ke browser penerima secara real-time
            socket.kirimKe(ids, { jenis, judul, pesan, tautan });
        } catch (err) {
            // Notifikasi gagal tidak boleh menggagalkan proses utama
            console.error('Gagal mengirim notifikasi:', err.message);
        }
    }

    // Daftar notifikasi milik satu akun beserta jumlah yang belum dibaca
    static tampil(userId) {
        const data = db.prepare('SELECT * FROM notifikasi WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 100').all(userId);
        const belumDibaca = db.prepare('SELECT COUNT(*) AS c FROM notifikasi WHERE user_id = ? AND dibaca = 0').get(userId).c;
        return { data, belumDibaca };
    }

    // Tandai satu notifikasi (id) atau semua notifikasi akun (tanpa id) sudah dibaca
    static tandaiDibaca(userId, id = null) {
        if (id === null) db.prepare('UPDATE notifikasi SET dibaca = 1 WHERE user_id = ?').run(userId);
        else db.prepare('UPDATE notifikasi SET dibaca = 1 WHERE id = ? AND user_id = ?').run(id, userId);
    }

    // Hapus notifikasi yang lebih tua dari 30 hari
    static bersihkan() {
        db.prepare(`DELETE FROM notifikasi WHERE created_at < datetime('now', '-${MASA_SIMPAN_HARI} days')`).run();
    }

    // Pengawas diberi tahu satu kali untuk setiap laporan yang belum selesai lebih dari 2 hari
    static periksaLaporanTerlambat() {
        const terlambat = db.prepare(`
            SELECT id, kode_laporan, alamat_lokasi FROM laporan_masyarakat
            WHERE status != 'selesai' AND notif_terlambat_at IS NULL
              AND (julianday('now') - julianday(created_at)) * 24 > ${BATAS_TERLAMBAT_JAM}
        `).all();
        for (const l of terlambat) {
            Notifikasi.kirim({ peran: 'pengawas' }, {
                jenis: 'terlambat',
                judul: 'Laporan terlambat ditangani',
                pesan: `${l.kode_laporan} belum selesai lebih dari 2 hari${l.alamat_lokasi ? ` (${l.alamat_lokasi})` : ''}.`,
                tautan: '/pengawas/laporan',
            });
            db.prepare('UPDATE laporan_masyarakat SET notif_terlambat_at = CURRENT_TIMESTAMP WHERE id = ?').run(l.id);
        }
    }
}

module.exports = Notifikasi;
