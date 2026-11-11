import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin } from 'lucide-react';
import KepalaSitus from '../components/KepalaSitus';

const LANGKAH = [
  ['Buka formulir laporan', 'Pilih menu Lapor Sampah. Tidak perlu membuat akun.'],
  ['Isi data dan ambil foto', 'Tuliskan nama, nomor WhatsApp, dan keterangan, lalu foto tumpukan sampah langsung dari kamera.'],
  ['Tentukan lokasi', 'Lokasi terisi dari GPS ponsel. Geser penanda di peta bila kurang tepat dan tambahkan patokan.'],
  ['Simpan kode laporan', 'Setelah terkirim Anda mendapat kode laporan untuk memantau status dan memberi penilaian.'],
];

const STATUS = [
  ['Masuk', 'Laporan diterima admin Korwil dan menunggu ditentukan prioritasnya.'],
  ['Diproses', 'Pengangkutan sudah dijadwalkan: tanggal, armada, dan petugas sudah ditentukan.'],
  ['Selesai', 'Sampah sudah diangkut. Foto hasil pengangkutan dapat dilihat di halaman Cek Status.'],
];

export default function Home() {
  const tombol = { display: 'inline-block', padding: '10px 18px', borderRadius: '4px', fontWeight: 600, fontSize: '0.95rem' };

  return (
    <div style={{ background: '#f3f4f6', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <KepalaSitus />

      <main style={{ flex: 1, maxWidth: '1080px', width: '100%', margin: '0 auto', padding: '32px 20px 48px' }}>
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', alignItems: 'start' }}>
          <div style={{ background: 'white', border: '1px solid #d8dde3', borderRadius: '6px', padding: '28px' }}>
            <div style={{ fontSize: '0.85rem', color: '#5b6673', marginBottom: '6px' }}>Layanan pengaduan masyarakat</div>
            <h1 style={{ fontSize: '1.6rem', marginBottom: '12px' }}>Laporan Sampah dan Permohonan Pengangkutan</h1>
            <p style={{ color: '#3a4550', marginBottom: '20px' }}>
              Laporkan tumpukan sampah liar atau ajukan permohonan pengangkutan sampah kepada Dinas Lingkungan Hidup
              Kabupaten Sukabumi. Laporan diterima admin Koordinator Wilayah, lalu dijadwalkan pengangkutannya.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Link to="/laporan" style={{ ...tombol, background: '#1f6b47', color: 'white' }}>Buat Laporan</Link>
              <Link to="/cek-status" style={{ ...tombol, border: '1px solid #b9c2cb', color: '#1f2933', background: 'white' }}>Cek Status Laporan</Link>
            </div>
            <p style={{ color: '#5b6673', fontSize: '0.85rem', marginTop: '18px' }}>
              Tidak bisa mengisi formulir? Laporan juga dapat disampaikan lewat telepon, WhatsApp, atau surat ke kantor Korwil,
              dan akan dicatatkan oleh admin.
            </p>
          </div>

          <div style={{ background: 'white', border: '1px solid #d8dde3', borderRadius: '6px', padding: '24px 28px' }}>
            <h2 style={{ fontSize: '1.05rem', marginBottom: '14px' }}>Cara melapor</h2>
            <ol style={{ listStyle: 'none', display: 'grid', gap: '14px' }}>
              {LANGKAH.map(([judul, isi], i) => (
                <li key={judul} style={{ display: 'flex', gap: '12px' }}>
                  <span style={{ flexShrink: 0, width: '24px', height: '24px', borderRadius: '50%', border: '1px solid #1f6b47', color: '#1f6b47', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                  <span>
                    <span style={{ display: 'block', fontWeight: 600 }}>{judul}</span>
                    <span style={{ display: 'block', color: '#5b6673', fontSize: '0.9rem' }}>{isi}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section style={{ background: 'white', border: '1px solid #d8dde3', borderRadius: '6px', padding: '24px 28px', marginTop: '24px' }}>
          <h2 style={{ fontSize: '1.05rem', marginBottom: '14px' }}>Arti status laporan</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem' }}>
            <tbody>
              {STATUS.map(([s, arti]) => (
                <tr key={s} style={{ borderTop: '1px solid #eceff2' }}>
                  <td style={{ padding: '10px 12px 10px 0', fontWeight: 600, width: '120px', verticalAlign: 'top' }}>{s}</td>
                  <td style={{ padding: '10px 0', color: '#3a4550' }}>{arti}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>

      <footer style={{ background: 'white', borderTop: '1px solid #d8dde3' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '20px', display: 'flex', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', fontSize: '0.85rem', color: '#5b6673' }}>
          <div>
            <div style={{ fontWeight: 600, color: '#1f2933' }}>Dinas Lingkungan Hidup Kabupaten Sukabumi</div>
            <div>Sistem Pengelolaan Sampah</div>
          </div>
          <div style={{ display: 'grid', gap: '4px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} /> (0266) 225 078</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14} /> dlh@sukabumikab.go.id</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> Jl. Bhayangkara No. 1, Palabuhanratu</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
