// ============================================
// Kelas Admin (turunan User)
// Admin Korwil mengelola data master (TPS, jalur layanan, armada, petugas),
// menyusun jadwal rutin, menjadwalkan laporan masyarakat sebagai jadwal
// tambahan, dan mengubah atau membatalkan jadwal harian.
// ============================================
const db = require('../database/db');
const User = require('./User');
const { Galat } = require('./Galat');
const Kendaraan = require('./Kendaraan');
const JadwalRutin = require('./JadwalRutin');
const JadwalPengangkutan = require('./JadwalPengangkutan');
const LaporanMasyarakat = require('./LaporanMasyarakat');
const PemeriksaanKendaraan = require('./PemeriksaanKendaraan');
const Notifikasi = require('./Notifikasi');
const { hariIni, normalKru, angka } = require('../utils/waktu');

const angkaDurasi = (v, cadangan) => angka(v) || cadangan || 2;
const bentrokDitolak = (bentrok) => new Galat(409, JadwalRutin.PESAN_BENTROK, { bentrok });

class Admin extends User {
    // Ringkasan dashboard admin
    dashboard() {
        JadwalRutin.buatJadwalHarian();
        const today = hariIni();
        const hitung = (sql, ...p) => db.prepare(sql).get(...p).count;
        const stats = {
            totalTps: hitung('SELECT COUNT(*) as count FROM tps'),
            totalJalur: hitung("SELECT COUNT(*) as count FROM jalur_layanan WHERE status = 'aktif'"),
            totalKendaraan: hitung('SELECT COUNT(*) as count FROM kendaraan'),
            totalSopir: User.jumlahAktif('sopir'),
            totalKru: User.jumlahAktif('kru'),
            teguranPengawas: hitung("SELECT COUNT(*) as count FROM laporan_masyarakat WHERE teguran_pengawas IS NOT NULL AND status != 'selesai'"),
            kendaraanPerluPerbaikan: hitung("SELECT COUNT(*) as count FROM kendaraan WHERE kondisi != 'baik'"),
            jadwalHariIni: hitung("SELECT COUNT(*) as count FROM jadwal_pengangkutan WHERE tanggal = ? AND status != 'batal'", today),
            laporanMasuk: hitung("SELECT COUNT(*) as count FROM laporan_masyarakat WHERE status = 'masuk'"),
            laporanBelumDitangani: hitung("SELECT COUNT(*) as count FROM laporan_masyarakat WHERE status != 'selesai'"),
            laporanSelesai: hitung("SELECT COUNT(*) as count FROM laporan_masyarakat WHERE status = 'selesai'"),
        };
        const jadwalTerbaru = JadwalPengangkutan.tampilTanggal(today);
        const laporanTerbaru = db.prepare(`SELECT * FROM laporan_masyarakat ORDER BY created_at DESC LIMIT 5`).all();
        // Laporan masuk dan selesai per bulan, 6 bulan terakhir (bulan tanpa laporan tetap ditampilkan 0)
        const rekap = db.prepare(`SELECT strftime('%Y-%m', created_at) AS bulan, COUNT(*) AS masuk,
                                  SUM(CASE WHEN status = 'selesai' THEN 1 ELSE 0 END) AS selesai
                                  FROM laporan_masyarakat GROUP BY bulan`).all();
        const perBulan = [];
        const d = new Date(`${today}T00:00:00Z`);
        for (let i = 5; i >= 0; i--) {
            const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
            const bulan = t.toISOString().slice(0, 7);
            const r = rekap.find(x => x.bulan === bulan) || {};
            perBulan.push({ bulan, masuk: r.masuk || 0, selesai: r.selesai || 0 });
        }
        const statusJadwalHariIni = db.prepare(`SELECT status, COUNT(*) AS jumlah FROM jadwal_pengangkutan WHERE tanggal = ? AND status != 'batal' GROUP BY status`).all(today);
        // Daftar "perlu tindakan hari ini"
        const laporanPerluJadwal = db.prepare(`SELECT id, kode_laporan, nama_pelapor, alamat_lokasi, prioritas, created_at FROM laporan_masyarakat
            WHERE status = 'masuk'
            ORDER BY CASE prioritas WHEN 'tinggi' THEN 0 WHEN 'sedang' THEN 1 WHEN 'rendah' THEN 2 ELSE 3 END, created_at ASC LIMIT 8`).all();
        const teguran = db.prepare(`SELECT id, kode_laporan, teguran_pengawas FROM laporan_masyarakat
            WHERE teguran_pengawas IS NOT NULL AND status != 'selesai' ORDER BY created_at ASC LIMIT 5`).all();
        const armadaRusak = db.prepare(`SELECT id, nomor_polisi, jenis_kendaraan, kondisi FROM kendaraan WHERE kondisi != 'baik' ORDER BY nomor_polisi`).all();
        return { stats, jadwalTerbaru, laporanTerbaru, perBulan, statusJadwalHariIni, laporanPerluJadwal, teguran, armadaRusak };
    }

    // Mencatat laporan masyarakat yang masuk lewat telepon atau WhatsApp
    catatLaporan(b, foto) {
        return LaporanMasyarakat.catat(b, foto, this.id);
    }

    // Menjadwalkan laporan masyarakat sebagai jadwal tambahan
    jadwalkanLaporan(laporanId, b) {
        const laporan = LaporanMasyarakat.tampilSatu(laporanId);
        if (!laporan) throw new Galat(404, 'Laporan tidak ditemukan');
        if (laporan.status === 'selesai') throw new Galat(400, 'Laporan sudah selesai ditangani');
        const ada = JadwalPengangkutan.aktifUntukLaporan(laporan.id);
        if (ada) throw new Galat(400, `Laporan ini sudah dijadwalkan pada ${ada.tanggal} pukul ${ada.jam}. Ubah jadwalnya di menu Jadwal.`);

        const prio = b.prioritas || laporan.prioritas;
        if (!LaporanMasyarakat.prioritasValid(prio)) throw new Galat(400, 'Tentukan prioritas laporan sebelum menjadwalkan');
        if (!b.tanggal || !b.jam) throw new Galat(400, 'Tanggal dan jam wajib diisi');
        const kruIds = normalKru(b.kru_ids);
        const errTim = User.validasiTim(b.sopir_id, kruIds);
        if (errTim) throw new Galat(400, errTim);
        const errKendaraan = Kendaraan.cekBisaDijadwalkan(b.kendaraan_id);
        if (errKendaraan) throw new Galat(400, errKendaraan);
        const durasi = angkaDurasi(b.durasi_jam);
        if (!b.paksa) {
            const bentrok = JadwalPengangkutan.cekBentrok({ tanggal: b.tanggal, jam: b.jam, durasi_jam: durasi, kendaraan_id: b.kendaraan_id, sopir_id: b.sopir_id, kru_ids: kruIds });
            if (bentrok.length) throw bentrokDitolak(bentrok);
        }
        const lokasi = laporan.alamat_lokasi || laporan.patokan || `Lokasi laporan ${laporan.kode_laporan}`;
        const jadwalId = db.transaction(() => {
            const id = JadwalPengangkutan.tambah({
                laporan_id: laporan.id, lokasi, pemohon: laporan.nama_pelapor, kendaraan_id: b.kendaraan_id, sopir_id: b.sopir_id,
                tanggal: b.tanggal, jam: b.jam, durasi_jam: durasi, ritase: Number(b.ritase) || 1, catatan: b.catatan || null, kruIds,
            });
            LaporanMasyarakat.jadwalkan(laporan.id, prio, b.sopir_id);
            return id;
        })();
        Notifikasi.kirim(Number(b.sopir_id), {
            jenis: 'jadwal_baru', judul: `Jadwal tambahan dari laporan ${laporan.kode_laporan} (prioritas ${prio})`,
            pesan: `${JadwalPengangkutan.teks(JadwalPengangkutan.info(jadwalId))}. Periksa armada sebelum berangkat.`, tautan: '/sopir/jadwal',
        });
        LaporanMasyarakat.kabariPelapor(laporan.id, 'dijadwalkan', { tanggal: b.tanggal, jam: b.jam });
        return `Laporan ${laporan.kode_laporan} dijadwalkan pada ${b.tanggal} pukul ${b.jam}.`;
    }

    // Mengubah jadwal harian: tim, armada, jam, atau membatalkan. Hasilnya pesan untuk admin.
    ubahJadwal(id, b) {
        const kruIds = normalKru(b.kru_ids);
        const errTim = User.validasiTim(b.sopir_id, kruIds);
        if (errTim) throw new Galat(400, errTim);

        const lama = JadwalPengangkutan.cari(id);
        if (!lama) throw new Galat(404, 'Jadwal tidak ditemukan');
        // Jalur/lokasi tidak diubah di sini: jadwal rutin mengikuti jalurnya, jadwal tambahan mengikuti lokasi laporan
        const durasi_jam = lama.jenis === 'rutin' ? lama.durasi_jam : angkaDurasi(b.durasi_jam, lama.durasi_jam);
        const ritase = Number(b.ritase) || lama.ritase;
        const tanggal = lama.jenis === 'rutin' ? lama.tanggal : (b.tanggal || lama.tanggal);
        const status = b.status || lama.status;

        const gantiArmada = String(lama.kendaraan_id) !== String(b.kendaraan_id);
        if (gantiArmada) {
            // Armada hanya dapat diganti sebelum pengangkutan dimulai
            if (lama.status !== 'menunggu') throw new Galat(400, 'Armada tidak dapat diganti pada jadwal yang sudah berjalan atau selesai');
            const errKendaraan = Kendaraan.cekBisaDijadwalkan(b.kendaraan_id);
            if (errKendaraan) throw new Galat(400, errKendaraan);
        }
        if (!b.paksa && status !== 'batal') {
            const bentrok = JadwalPengangkutan.cekBentrok({ tanggal, jam: b.jam, durasi_jam, kendaraan_id: b.kendaraan_id, sopir_id: b.sopir_id, kru_ids: kruIds, kecualiId: lama.id });
            if (bentrok.length) throw bentrokDitolak(bentrok);
        }

        db.transaction(() => {
            JadwalPengangkutan.ubah(lama.id, {
                jalur_id: lama.jalur_id, lokasi: lama.lokasi, pemohon: lama.pemohon, kendaraan_id: b.kendaraan_id, sopir_id: b.sopir_id,
                tanggal, jam: b.jam, durasi_jam, ritase, status, catatan: b.catatan || null, kruIds,
            });
            // Armada diganti: hasil pemeriksaan armada lama tidak berlaku, sopir memeriksa armada pengganti
            if (gantiArmada) PemeriksaanKendaraan.hapus(lama.id, 'sebelum berangkat');
            // Laporan masyarakat mengikuti jadwalnya
            if (lama.laporan_id) {
                if (status === 'batal') LaporanMasyarakat.kembalikanKeMasuk(lama.laporan_id);
                else LaporanMasyarakat.ikutiJadwal(lama.laporan_id, b.sopir_id);
            }
        })();
        const teks = JadwalPengangkutan.teks(JadwalPengangkutan.info(lama.id));
        if (String(lama.sopir_id) !== String(b.sopir_id)) {
            Notifikasi.kirim(Number(b.sopir_id), { jenis: 'jadwal_baru', judul: 'Jadwal pengangkutan baru', pesan: `${teks}. Periksa armada sebelum berangkat.`, tautan: '/sopir/jadwal' });
        } else if (gantiArmada) {
            Notifikasi.kirim(Number(b.sopir_id), { jenis: 'armada_diganti', judul: 'Armada diganti', pesan: `${teks}. Periksa armada pengganti sebelum berangkat.`, tautan: '/sopir/jadwal' });
        } else if (status === 'batal' && lama.status !== 'batal') {
            Notifikasi.kirim(Number(b.sopir_id), { jenis: 'jadwal_batal', judul: 'Jadwal dibatalkan', pesan: `${teks} dibatalkan oleh admin.`, tautan: '/sopir/jadwal' });
        }
        return gantiArmada ? 'Armada diganti, sopir perlu memeriksa armada pengganti sebelum berangkat' : undefined;
    }

    // Menghapus jadwal harian. Jadwal dari jadwal rutin cukup dibatalkan agar tidak dibuat ulang otomatis.
    hapusJadwal(id) {
        const jadwal = JadwalPengangkutan.cari(id);
        if (!jadwal) throw new Galat(404, 'Jadwal tidak ditemukan');
        if (jadwal.jenis === 'rutin') {
            JadwalPengangkutan.batalkan(jadwal.id);
            return 'Jadwal rutin pada tanggal ini dibatalkan';
        }
        db.transaction(() => {
            if (jadwal.laporan_id) LaporanMasyarakat.kembalikanKeMasuk(jadwal.laporan_id);
            JadwalPengangkutan.hapus(jadwal.id);
        })();
        return jadwal.laporan_id ? 'Jadwal dihapus. Laporan masyarakatnya kembali berstatus masuk dan dapat dijadwalkan ulang.' : undefined;
    }
}

module.exports = Admin;
