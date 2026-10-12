// Migrasi: tambah kolom ditangani_oleh & catatan_tindak_lanjut ke laporan_masyarakat
const db = require('./database/db');

try {
  db.prepare("ALTER TABLE laporan_masyarakat ADD COLUMN ditangani_oleh INTEGER REFERENCES users(id)").run();
  console.log('✅ Kolom ditangani_oleh berhasil ditambahkan');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('ℹ️  Kolom ditangani_oleh sudah ada');
  } else {
    console.error('❌', e.message);
  }
}

try {
  db.prepare("ALTER TABLE laporan_masyarakat ADD COLUMN catatan_tindak_lanjut TEXT").run();
  console.log('✅ Kolom catatan_tindak_lanjut berhasil ditambahkan');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('ℹ️  Kolom catatan_tindak_lanjut sudah ada');
  } else {
    console.error('❌', e.message);
  }
}

console.log('✅ Migrasi selesai');
process.exit(0);
