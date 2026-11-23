// Fungsi bantu pemeriksaan bentrok jadwal: armada, sopir, atau kru yang sama pada waktu yang beririsan
const db = require('../database/db');
const { keMenit, formatJam } = require('./waktu');

function uraikanBentrok(lain, { kendaraan_id, sopir_id, kruIds }, label) {
    const hasil = [];
    for (const o of lain) {
        const waktu = `${o.jam}–${formatJam(keMenit(o.jam) + (o.durasi || 8) * 60)}`;
        const tempat = `${label(o)} (${waktu})`;
        if (String(o.kendaraan_id) === String(kendaraan_id)) hasil.push(`Armada ${o.nomor_polisi} sudah dijadwalkan di ${tempat}`);
        if (sopir_id && String(o.sopir_id) === String(sopir_id)) hasil.push(`Sopir ${o.sopir_name} sudah bertugas di ${tempat}`);
        const kruLain = String(o.kru_ids || '').split(',').filter(Boolean).map(Number);
        // Petugas yang merangkap sopir dan kru tidak boleh bertugas di dua jadwal yang waktunya beririsan
        if (sopir_id && kruLain.includes(Number(sopir_id))) {
            hasil.push(`${db.prepare('SELECT name FROM users WHERE id = ?').get(sopir_id).name} sudah bertugas sebagai kru di ${tempat}`);
        }
        if (o.sopir_id && kruIds.includes(Number(o.sopir_id))) hasil.push(`${o.sopir_name} sudah bertugas sebagai sopir di ${tempat}`);
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

module.exports = { uraikanBentrok, beririsan };
