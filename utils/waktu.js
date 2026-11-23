// Fungsi bantu tanggal dan jam (zona WIB)
const NAMA_HARI = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

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
// Nama hari dan tanggal untuk email, contoh "Senin, 23 November 2026"
const NAMA_HARI_MINGGU = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
function tanggalIndo(tgl) {
    const d = new Date(`${tgl}T00:00:00Z`);
    return `${NAMA_HARI_MINGGU[d.getUTCDay()]}, ${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}`;
}
// Daftar id kru dari input (tanpa duplikat)
const normalKru = (v) => [...new Set((Array.isArray(v) ? v : []).map(Number).filter(Boolean))];
// Angka dari input formulir; kosong menjadi null
const angka = (v) => (v === '' || v === null || v === undefined || isNaN(Number(v)) ? null : Number(v));

module.exports = { NAMA_HARI, hariIni, tambahHari, hariDari, keMenit, formatJam, tanggalIndo, normalKru, angka };
