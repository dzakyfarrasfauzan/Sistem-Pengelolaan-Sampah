// ============================================
// Kelas Sopir (turunan User)
// Sopir memimpin tim petugas operasional (sopir + kru). Sopir memeriksa armada
// sebelum berangkat dan sesudah pulang, memperbarui status pengangkutan, dan
// menangani laporan masyarakat yang ditugaskan kepadanya.
// ============================================
const db = require('../database/db');
const User = require('./User');
const { Galat } = require('./Galat');
const JadwalRutin = require('./JadwalRutin');
const JadwalPengangkutan = require('./JadwalPengangkutan');
const PemeriksaanKendaraan = require('./PemeriksaanKendaraan');
const LaporanPengangkutan = require('./LaporanPengangkutan');
const LaporanMasyarakat = require('./LaporanMasyarakat');
const Notifikasi = require('./Notifikasi');
const { hariIni, tambahHari } = require('../utils/waktu');

class Sopir extends User {
    constructor(baris = {}) {
        super(baris);
        this.jugaKru = !!baris.juga_kru;
    }

    dashboard() {
        const id = this.id;
        JadwalRutin.buatJadwalHarian();
        const today = hariIni();
        const jadwalMendatang = JadwalPengangkutan.tampilUntukSopir(id,
            `AND j.tanggal >= ? AND j.tanggal <= ? AND j.status != 'batal' ORDER BY j.tanggal ASC, j.jam ASC`, today, tambahHari(today, 7));
        const r = JadwalPengangkutan.ringkasanSopir(id);
        const stats = {
            totalJadwal: r.totalJadwal,
            belumDiperiksa: r.belumDiperiksa,
            totalPemeriksaan: PemeriksaanKendaraan.jumlahOleh(id),
            jadwalSelesai: r.jadwalSelesai,
            laporanDitugaskan: LaporanMasyarakat.jumlahDitugaskan(id),
        };
        return { stats, jadwalMendatang };
    }

    // Jadwal 30 hari terakhir sampai 7 hari ke depan; yang dibatalkan tidak ditampilkan.
    // Urutan: hari ini dan yang akan datang lebih dulu (terdekat di atas), lalu riwayat
    lihatJadwal() {
        JadwalRutin.buatJadwalHarian();
        const hari = hariIni();
        return JadwalPengangkutan.tampilUntukSopir(this.id, `AND j.status != 'batal' AND j.tanggal BETWEEN ? AND ?
            ORDER BY (j.tanggal < ?), CASE WHEN j.tanggal >= ? THEN j.tanggal END ASC, j.tanggal DESC, j.jam ASC`,
            tambahHari(hari, -30), tambahHari(hari, 7), hari, hari);
    }

    jadwalSaya(jadwalId) {
        return JadwalPengangkutan.milikSopir(jadwalId, this.id);
    }

    // Memeriksa armada sebelum berangkat atau sesudah pulang (foto wajib). Hasilnya status kendaraan.
    periksaKendaraan(jadwalId, { jenis, kondisi, catatan }, foto) {
        PemeriksaanKendaraan.validasi({ jenis, kondisi, foto });
        const jadwal = this.jadwalSaya(jadwalId);
        if (!jadwal) throw new Galat(404, 'Jadwal tidak ditemukan atau bukan tugas Anda');
        return PemeriksaanKendaraan.simpan(jadwal, this, { jenis, kondisi, catatan, foto });
    }

    // Memulai (berjalan) atau menyelesaikan (selesai) pengangkutan beserta foto kegiatan
    ubahStatusJadwal(jadwalId, { status, catatan }, foto) {
        if (!['berjalan', 'selesai'].includes(status)) throw new Galat(400, 'Status tidak valid');
        const jadwal = this.jadwalSaya(jadwalId);
        if (!jadwal) throw new Galat(404, 'Jadwal tidak ditemukan atau bukan tugas Anda');

        if (jadwal.status === 'batal') throw new Galat(400, 'Jadwal ini sudah dibatalkan admin');
        if (status === 'berjalan') {
            if (jadwal.status !== 'menunggu') throw new Galat(400, 'Pengangkutan sudah dimulai atau selesai');
            const cek = PemeriksaanKendaraan.cari(jadwal.id, 'sebelum berangkat');
            if (!cek) throw new Galat(400, 'Periksa armada sebelum berangkat terlebih dahulu');
            if (cek.kondisi === 'rusak berat') throw new Galat(400, 'Armada dalam kondisi rusak berat dan tidak dapat digunakan');
        }
        if (status === 'selesai') {
            if (jadwal.status !== 'berjalan') throw new Galat(400, 'Pengangkutan belum berjalan');
            if (!foto) throw new Galat(400, 'Foto pelaksanaan pengangkutan wajib diunggah');
        }

        db.transaction(() => {
            JadwalPengangkutan.ubahStatus(jadwal.id, status, catatan, foto);
            // Laporan kegiatan pengangkutan tercatat otomatis atas nama sopir
            if (status === 'selesai') LaporanPengangkutan.simpan(jadwal, hariIni(), catatan, foto);
        })();
        // Jadwal tambahan dari laporan masyarakat: laporan ikut selesai dengan foto pengangkutan
        if (status === 'selesai' && jadwal.laporan_id) LaporanMasyarakat.selesaikanDariJadwal(jadwal, { foto, catatan, namaSopir: this.name });
        if (status === 'selesai') {
            const t = JadwalPengangkutan.namaLokasi(jadwal.id);
            Notifikasi.kirim({ peran: 'admin' }, {
                jenis: 'pengangkutan_selesai', judul: 'Pengangkutan selesai',
                pesan: `${this.name} menyelesaikan pengangkutan ${t ? t.nama : ''} (${jadwal.tanggal}).`, tautan: '/admin/jadwal',
            });
        }
        return status === 'selesai' ? 'Pengangkutan selesai. Lanjutkan pemeriksaan armada sesudah pulang.' : 'Pengangkutan dimulai';
    }

    // Laporan masyarakat yang ditugaskan kepada sopir, diurutkan berdasarkan prioritas
    lihatLaporan() {
        return LaporanMasyarakat.tampilUntukSopir(this.id);
    }

    // Menangani laporan masyarakat yang belum dijadwalkan
    tanganiLaporan(laporanId, { status, catatan_tindak_lanjut }, foto) {
        if (!['diproses', 'selesai'].includes(status)) throw new Galat(400, 'Status tidak valid');
        const laporan = LaporanMasyarakat.milikSopir(laporanId, this.id);
        if (!laporan) throw new Galat(404, 'Laporan tidak ditemukan atau tidak ditugaskan kepada Anda');
        // Laporan yang sudah dijadwalkan diselesaikan lewat jadwalnya (pemeriksaan armada, berjalan, selesai)
        const jd = JadwalPengangkutan.aktifUntukLaporan(laporan.id);
        if (jd) throw new Galat(400, `Laporan ini dikerjakan lewat jadwal ${jd.tanggal} pukul ${jd.jam}. Selesaikan dari menu Jadwal.`);
        if (status === 'selesai' && !foto && !laporan.foto_tindak_lanjut) throw new Galat(400, 'Foto hasil penanganan wajib diunggah');

        LaporanMasyarakat.ubah(laporan.id, { status, catatan_tindak_lanjut, foto });
        if (status === 'selesai') {
            LaporanMasyarakat.beritahuSelesai(LaporanMasyarakat.kode(laporan.id), this.name);
            LaporanMasyarakat.kabariPelapor(laporan.id, 'selesai');
        }
    }
}

module.exports = Sopir;
