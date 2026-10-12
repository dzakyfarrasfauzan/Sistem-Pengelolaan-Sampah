// Migrasi: tambah kolom patokan ke laporan_masyarakat
const db = require('./database/db');

try {
  db.prepare("ALTER TABLE laporan_masyarakat ADD COLUMN patokan TEXT").run();
  console.log('✅ Kolom patokan berhasil ditambahkan');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('ℹ️  Kolom patokan sudah ada');
  } else {
    console.error('❌', e.message);
  }
}

console.log('✅ Migrasi selesai');
process.exit(0);
