// ============================================
// Kelas PemeriksaanKendaraan
// Sopir memeriksa armada sebelum berangkat dan sesudah pulang dengan foto.
// Kondisi dan status penggunaan kendaraan mengikuti hasil pemeriksaan.
// ============================================
const db = require('../database/db');
const { Galat } = require('./Galat');
const Kendaraan = require('./Kendaraan');
const Notifikasi = require('./Notifikasi');

const JENIS = ['sebelum berangkat', 'sesudah pulang'];
const KONDISI = ['baik', 'rusak ringan', 'rusak berat'];

class PemeriksaanKendaraan {
    // Daftar seluruh pemeriksaan untuk admin
    static tampil() {
        return db.prepare(`
            SELECT p.*, k.nomor_polisi, k.jenis_kendaraan, s.name as sopir_name,
                   j.tanggal, j.jam, COALESCE(jl.nama_jalur, j.lokasi) AS lokasi_tampil
            FROM pemeriksaan_kendaraan p
            LEFT JOIN kendaraan k ON p.kendaraan_id = k.id
            LEFT JOIN users s ON p.sopir_id = s.id
            LEFT JOIN jadwal_pengangkutan j ON p.jadwal_id = j.id
            LEFT JOIN jalur_layanan jl ON j.jalur_id = jl.id
            ORDER BY p.created_at DESC
        `).all();
    }

    static cari(jadwalId, jenis) {
        return db.prepare('SELECT id, kondisi FROM pemeriksaan_kendaraan WHERE jadwal_id = ? AND jenis = ?').get(jadwalId, jenis);
    }

    // Validasi isian sebelum jadwal dicari (urutan pesan sama seperti sebelumnya)
    static validasi({ jenis, kondisi, foto }) {
        if (!JENIS.includes(jenis)) throw new Galat(400, 'Jenis pemeriksaan tidak valid');
        if (!KONDISI.includes(kondisi)) throw new Galat(400, 'Kondisi kendaraan tidak valid');
        if (!foto) throw new Galat(400, 'Foto kondisi kendaraan wajib diunggah');
    }

    // Simpan hasil pemeriksaan untuk sebuah jadwal. Hasilnya status penggunaan kendaraan.
    static simpan(jadwal, sopir, { jenis, kondisi, catatan, foto }) {
        if (PemeriksaanKendaraan.cari(jadwal.id, jenis)) throw new Galat(400, `Pemeriksaan ${jenis} sudah dilakukan`);
        if (jenis === 'sebelum berangkat' && jadwal.status !== 'menunggu') {
            throw new Galat(400, 'Pemeriksaan sebelum berangkat hanya untuk jadwal yang belum berjalan');
        }
        if (jenis === 'sesudah pulang') {
            if (!PemeriksaanKendaraan.cari(jadwal.id, 'sebelum berangkat')) throw new Galat(400, 'Lakukan pemeriksaan sebelum berangkat terlebih dahulu');
            if (jadwal.status !== 'selesai') throw new Galat(400, 'Pemeriksaan sesudah pulang dilakukan setelah pengangkutan selesai');
        }

        // Status kendaraan mengikuti hasil pemeriksaan sopir
        let statusKendaraan;
        if (kondisi === 'rusak berat') statusKendaraan = 'maintenance';
        else statusKendaraan = jenis === 'sebelum berangkat' ? 'digunakan' : 'tersedia';

        db.transaction(() => {
            db.prepare(`INSERT INTO pemeriksaan_kendaraan (jadwal_id, kendaraan_id, sopir_id, jenis, kondisi, catatan, foto) VALUES (?, ?, ?, ?, ?, ?, ?)`)
              .run(jadwal.id, jadwal.kendaraan_id, sopir.id, jenis, kondisi, catatan || null, foto);
            Kendaraan.perbaruiKondisi(jadwal.kendaraan_id, kondisi, statusKendaraan);
        })();

        if (kondisi !== 'baik') {
            const k = Kendaraan.tampilSatu(jadwal.kendaraan_id);
            Notifikasi.kirim({ peran: 'admin' }, {
                jenis: 'kendaraan_rusak', judul: `Kendaraan ${kondisi}`,
                pesan: `${k ? k.nomor_polisi : 'Kendaraan'} dilaporkan ${kondisi} oleh ${sopir.name} (pemeriksaan ${jenis})${catatan ? `: ${catatan}` : ''}.`
                    + (kondisi === 'rusak berat' && jenis === 'sebelum berangkat' ? ' Ganti armada pada jadwal ini.' : ''),
                tautan: '/admin/pemeriksaan-kendaraan',
            });
        }
        return statusKendaraan;
    }

    // Hapus pemeriksaan sebuah jadwal (semua, atau satu jenis saja)
    static hapus(jadwalId, jenis = null) {
        if (jenis) db.prepare('DELETE FROM pemeriksaan_kendaraan WHERE jadwal_id = ? AND jenis = ?').run(jadwalId, jenis);
        else db.prepare('DELETE FROM pemeriksaan_kendaraan WHERE jadwal_id = ?').run(jadwalId);
    }

    static jumlahOleh(sopirId) {
        return db.prepare('SELECT COUNT(*) as count FROM pemeriksaan_kendaraan WHERE sopir_id = ?').get(sopirId).count;
    }
}

module.exports = PemeriksaanKendaraan;
