// ============================================
// Jadwal pengangkutan per jalur layanan
// - Jadwal rutin mingguan diisi admin sekali, lalu sistem membuat jadwal harian
//   otomatis untuk 7 hari ke depan.
// - Jadwal tambahan (permohonan pelayanan) diperiksa bentroknya dengan jadwal lain
//   pada armada, sopir, dan kru yang sama.
// ============================================
const db = require('../database/db');
const notifikasi = require('./notifikasi');

const NAMA_HARI = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const HARI_KE_DEPAN = 7;

// Tanggal hari ini menurut WIB (YYYY-MM-DD)
const hariIni = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
const tambahHari = (tgl, n) => {
    const d = new Date(`${tgl}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};
// 1 = Senin ... 7 = Minggu
const hariDari = (tgl) => {
    const d = new Date(`${tgl}T00:00:00Z`).getUTCDay();
    return d === 0 ? 7 : d;
};
const keMenit = (jam) => {
    const [h, m] = String(jam || '00:00').split(':').map(Number);
    return h * 60 + (m || 0);
};
const formatJam = (menit) => {
    const m = Math.round(menit);
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
const normalKru = (v) => [...new Set((Array.isArray(v) ? v : []).map(Number).filter(Boolean))];

// Kolom tampilan jadwal harian beserta jalur dan TPS yang dilewati
const KOLOM_JADWAL = `
    j.*, jl.nama_jalur, jl.alamat_pelayanan, jl.desa, jl.kecamatan, jl.jarak_km, jl.estimasi_tonase,
    COALESCE(jl.nama_jalur, j.lokasi) AS lokasi_tampil,
    (SELECT GROUP_CONCAT(t.nama_tps, ', ') FROM jalur_tps jt JOIN tps t ON t.id = jt.tps_id WHERE jt.jalur_id = j.jalur_id) AS tps_names,
    k.nomor_polisi, k.jenis_kendaraan, k.kondisi AS kondisi_kendaraan, s.name AS sopir_name,
    (SELECT GROUP_CONCAT(u.name, ', ') FROM jadwal_kru jk JOIN users u ON u.id = jk.kru_id WHERE jk.jadwal_id = j.id) AS kru_names,
    (SELECT GROUP_CONCAT(jk.kru_id) FROM jadwal_kru jk WHERE jk.jadwal_id = j.id) AS kru_ids`;
const JOIN_JADWAL = `
    FROM jadwal_pengangkutan j
    LEFT JOIN jalur_layanan jl ON jl.id = j.jalur_id
    LEFT JOIN kendaraan k ON k.id = j.kendaraan_id
    LEFT JOIN users s ON s.id = j.sopir_id`;

// Buat jadwal harian dari jadwal rutin untuk satu tanggal (yang belum ada saja)
function buatUntukTanggal(tanggal, { beriNotifikasi = true } = {}) {
    const hari = hariDari(tanggal);
    const rutin = db.prepare(`
        SELECT r.*, COALESCE(jl.waktu_tempuh_jam, 8) AS durasi, jl.nama_jalur, k.nomor_polisi
        FROM jadwal_rutin r
        JOIN jalur_layanan jl ON jl.id = r.jalur_id
        LEFT JOIN kendaraan k ON k.id = r.kendaraan_id
        WHERE r.hari = ? AND r.status = 'aktif'
          AND NOT EXISTS (SELECT 1 FROM jadwal_pengangkutan j WHERE j.jadwal_rutin_id = r.id AND j.tanggal = ?)
    `).all(hari, tanggal);
    if (!rutin.length) return 0;
    const insJadwal = db.prepare(`INSERT INTO jadwal_pengangkutan (jenis, jadwal_rutin_id, jalur_id, kendaraan_id, sopir_id, tanggal, jam, durasi_jam, ritase, catatan)
        VALUES ('rutin', ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insKru = db.prepare('INSERT INTO jadwal_kru (jadwal_id, kru_id) SELECT ?, kru_id FROM jadwal_rutin_kru WHERE jadwal_rutin_id = ?');
    const dibuat = db.transaction(() => {
        for (const r of rutin) {
            const { lastInsertRowid } = insJadwal.run(r.id, r.jalur_id, r.kendaraan_id, r.sopir_id, tanggal, r.jam, r.durasi, r.ritase || 1, r.catatan || null);
            insKru.run(lastInsertRowid, r.id);
        }
    });
    dibuat();
    if (beriNotifikasi) {
        for (const r of rutin) {
            notifikasi.kirim(r.sopir_id, {
                jenis: 'jadwal_baru', judul: `Jadwal rutin ${NAMA_HARI[hari]}, ${tanggal}`,
                pesan: `${r.nama_jalur} pukul ${r.jam}, armada ${r.nomor_polisi || '-'}. Periksa armada sebelum berangkat.`,
                tautan: '/sopir/jadwal',
            });
        }
    }
    return rutin.length;
}

// Pastikan jadwal harian dari jadwal rutin sudah tersedia untuk hari ini s.d. 6 hari ke depan
function pastikanJadwalHarian() {
    let total = 0;
    const awal = hariIni();
    for (let i = 0; i < HARI_KE_DEPAN; i++) total += buatUntukTanggal(tambahHari(awal, i));
    return total;
}

// Hapus jadwal harian hasil jadwal rutin yang belum dikerjakan (untuk dibuat ulang setelah rutin diubah)
function hapusTurunanBelumJalan(rutinId) {
    const ids = db.prepare(`
        SELECT j.id FROM jadwal_pengangkutan j
        WHERE j.jadwal_rutin_id = ? AND j.tanggal >= ? AND j.status = 'menunggu'
          AND NOT EXISTS (SELECT 1 FROM pemeriksaan_kendaraan p WHERE p.jadwal_id = j.id)
    `).all(rutinId, hariIni()).map(r => r.id);
    const hapus = db.transaction(() => {
        for (const id of ids) {
            db.prepare('DELETE FROM jadwal_kru WHERE jadwal_id = ?').run(id);
            db.prepare('DELETE FROM jadwal_pengangkutan WHERE id = ?').run(id);
        }
    });
    hapus();
    return ids.length;
}

// Cari bentrok: armada, sopir, atau kru yang sama pada waktu yang beririsan
function uraikanBentrok(lain, { kendaraan_id, sopir_id, kruIds }, label) {
    const hasil = [];
    for (const o of lain) {
        const waktu = `${o.jam}–${formatJam(keMenit(o.jam) + (o.durasi || 8) * 60)}`;
        const tempat = `${label(o)} (${waktu})`;
        if (String(o.kendaraan_id) === String(kendaraan_id)) hasil.push(`Armada ${o.nomor_polisi} sudah dijadwalkan di ${tempat}`);
        if (sopir_id && String(o.sopir_id) === String(sopir_id)) hasil.push(`Sopir ${o.sopir_name} sudah bertugas di ${tempat}`);
        const kruLain = String(o.kru_ids || '').split(',').filter(Boolean).map(Number);
        const sama = kruIds.filter(k => kruLain.includes(k));
        if (sama.length) {
            const nama = db.prepare(`SELECT GROUP_CONCAT(name, ', ') AS n FROM users WHERE id IN (${sama.map(() => '?').join(',')})`).get(...sama).n;
            hasil.push(`Kru ${nama} sudah bertugas di ${tempat}`);
        }
    }
    return hasil;
}

const beririsan = (jamA, durA, jamB, durB) => {
    const a1 = keMenit(jamA), a2 = a1 + (durA || 8) * 60;
    const b1 = keMenit(jamB), b2 = b1 + (durB || 8) * 60;
    return a1 < b2 && b1 < a2;
};

// Bentrok jadwal harian pada tanggal tertentu
function cekBentrokHarian({ tanggal, jam, durasi_jam, kendaraan_id, sopir_id, kru_ids, kecualiId }) {
    if (tanggal >= hariIni()) buatUntukTanggal(tanggal);
    const kruIds = normalKru(kru_ids);
    const lain = db.prepare(`
        SELECT j.id, j.jam, j.durasi_jam AS durasi, j.kendaraan_id, j.sopir_id, j.jenis, k.nomor_polisi, s.name AS sopir_name,
               COALESCE(jl.nama_jalur, j.lokasi) AS lokasi_tampil,
               (SELECT GROUP_CONCAT(jk.kru_id) FROM jadwal_kru jk WHERE jk.jadwal_id = j.id) AS kru_ids
        ${JOIN_JADWAL}
        WHERE j.tanggal = ? AND j.status != 'batal' AND j.id != ?
    `).all(tanggal, kecualiId || 0).filter(o => beririsan(jam, durasi_jam, o.jam, o.durasi));
    return uraikanBentrok(lain, { kendaraan_id, sopir_id, kruIds },
        (o) => `${o.lokasi_tampil || '-'}${o.jenis === 'rutin' ? ' [jadwal rutin]' : ' [jadwal tambahan]'}`);
}

// Bentrok antar-jadwal rutin pada hari yang sama
function cekBentrokRutin({ hari, jam, jalur_id, kendaraan_id, sopir_id, kru_ids, kecualiId }) {
    const kruIds = normalKru(kru_ids);
    const durasi = (db.prepare('SELECT waktu_tempuh_jam FROM jalur_layanan WHERE id = ?').get(jalur_id) || {}).waktu_tempuh_jam || 8;
    const lain = db.prepare(`
        SELECT r.id, r.jam, COALESCE(jl.waktu_tempuh_jam, 8) AS durasi, r.kendaraan_id, r.sopir_id, jl.nama_jalur,
               k.nomor_polisi, s.name AS sopir_name,
               (SELECT GROUP_CONCAT(rk.kru_id) FROM jadwal_rutin_kru rk WHERE rk.jadwal_rutin_id = r.id) AS kru_ids
        FROM jadwal_rutin r
        JOIN jalur_layanan jl ON jl.id = r.jalur_id
        LEFT JOIN kendaraan k ON k.id = r.kendaraan_id
        LEFT JOIN users s ON s.id = r.sopir_id
        WHERE r.hari = ? AND r.status = 'aktif' AND r.id != ?
    `).all(hari, kecualiId || 0).filter(o => beririsan(jam, durasi, o.jam, o.durasi));
    return uraikanBentrok(lain, { kendaraan_id, sopir_id, kruIds }, (o) => `${o.nama_jalur} hari ${NAMA_HARI[hari]}`);
}

module.exports = {
    NAMA_HARI, hariIni, tambahHari, hariDari, normalKru,
    KOLOM_JADWAL, JOIN_JADWAL,
    buatUntukTanggal, pastikanJadwalHarian, hapusTurunanBelumJalan,
    cekBentrokHarian, cekBentrokRutin,
};
