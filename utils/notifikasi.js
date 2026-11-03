// ============================================
// Notifikasi (pemberitahuan) untuk akun admin, sopir, dan pengawas.
// Riwayat disimpan selama 30 hari, setelah itu dihapus otomatis.
// ============================================
const db = require('../database/db');

const MASA_SIMPAN_HARI = 30;
const BATAS_TERLAMBAT_JAM = 48;

// Hapus notifikasi yang lebih tua dari 30 hari
function bersihkan() {
    db.prepare(`DELETE FROM notifikasi WHERE created_at < datetime('now', '-${MASA_SIMPAN_HARI} days')`).run();
}

/**
 * Kirim notifikasi ke satu atau beberapa akun.
 * tujuan: id user, array id user, atau { peran: 'admin' | 'pengawas' | 'sopir' }
 */
function kirim(tujuan, { jenis, judul, pesan, tautan = null }) {
    try {
        let ids = [];
        if (tujuan && typeof tujuan === 'object' && !Array.isArray(tujuan) && tujuan.peran) {
            ids = db.prepare("SELECT id FROM users WHERE role = ? AND status = 'aktif'").all(tujuan.peran).map(u => u.id);
        } else {
            ids = (Array.isArray(tujuan) ? tujuan : [tujuan]).filter(Boolean);
        }
        const ins = db.prepare('INSERT INTO notifikasi (user_id, jenis, judul, pesan, tautan) VALUES (?, ?, ?, ?, ?)');
        db.transaction(() => { for (const id of ids) ins.run(id, jenis, judul, pesan, tautan); })();
    } catch (err) {
        // Notifikasi gagal tidak boleh menggagalkan proses utama
        console.error('Gagal mengirim notifikasi:', err.message);
    }
}

// Pengawas diberi tahu satu kali untuk setiap laporan yang belum selesai lebih dari 2 hari
function periksaLaporanTerlambat() {
    const terlambat = db.prepare(`
        SELECT id, kode_laporan, alamat_lokasi FROM laporan_masyarakat
        WHERE status != 'selesai' AND notif_terlambat_at IS NULL
          AND (julianday('now') - julianday(created_at)) * 24 > ${BATAS_TERLAMBAT_JAM}
    `).all();
    for (const l of terlambat) {
        kirim({ peran: 'pengawas' }, {
            jenis: 'terlambat',
            judul: 'Laporan terlambat ditangani',
            pesan: `${l.kode_laporan} belum selesai lebih dari 2 hari${l.alamat_lokasi ? ` (${l.alamat_lokasi})` : ''}.`,
            tautan: '/pengawas/laporan',
        });
        db.prepare('UPDATE laporan_masyarakat SET notif_terlambat_at = CURRENT_TIMESTAMP WHERE id = ?').run(l.id);
    }
}

module.exports = { kirim, bersihkan, periksaLaporanTerlambat, MASA_SIMPAN_HARI };
