import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Phone, Mail, MapPin, UserPlus, Camera, CalendarCheck, CheckCircle2, Inbox, Truck, Trash2, Route as IkonJalur } from 'lucide-react';
import { API_URL } from '../config';
import KepalaSitus from '../components/KepalaSitus';
import IlustrasiTruk from '../components/IlustrasiTruk';
import Lambang from '../components/Lambang';

const LANGKAH = [
  [UserPlus, 'Masuk atau daftar', 'Daftar dengan email dan password, atau masuk dengan akun Google.'],
  [Camera, 'Kirim laporan', 'Tulis keterangan, foto tumpukan sampah dari kamera, dan tandai lokasinya di peta.'],
  [CalendarCheck, 'Dijadwalkan petugas', 'Admin Korwil menentukan prioritas dan menjadwalkan armada pengangkut.'],
  [CheckCircle2, 'Sampah diangkut', 'Anda mendapat kabar lewat email dan dapat menilai pelayanan di Laporan Saya.'],
];

const STATUS = [
  ['Masuk', 'Laporan diterima admin Korwil dan menunggu ditentukan prioritasnya.', '#eef0f2', '#3a4550'],
  ['Diproses', 'Pengangkutan sudah dijadwalkan: tanggal, armada, dan petugas sudah ditentukan.', '#fdf1e3', '#8a4b0f'],
  ['Selesai', 'Sampah sudah diangkut. Foto hasil pengangkutan dapat dilihat pelapor.', '#e3f1e8', '#17533a'],
];

const lebarIsi = { maxWidth: '1080px', margin: '0 auto', padding: '0 20px' };

export default function Home() {
  const [stat, setStat] = useState(null);

  useEffect(() => {
    const muat = async () => {
      try {
        const r = await axios.get(`${API_URL}/api/public/statistik`);
        setStat(r.data.data);
      } catch { /* statistik opsional */ }
    };
    muat();
  }, []);

  const angka = [
    [Inbox, 'Laporan diterima', stat?.totalLaporan],
    [CheckCircle2, 'Laporan selesai', stat?.laporanSelesai],
    [IkonJalur, 'Jalur layanan', stat?.jumlahJalur],
    [Truck, 'Armada pengangkut', stat?.jumlahArmada],
  ];

  return (
    <div style={{ background: '#f3f4f6', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <KepalaSitus />

      {/* Banner */}
      <section style={{ background: '#14472e', color: 'white', paddingBottom: '64px' }}>
        <div style={{ ...lebarIsi, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '28px', paddingTop: '40px' }}>
          <div style={{ flex: '1 1 380px' }}>
            <div style={{ display: 'inline-block', fontSize: '0.8rem', color: '#cfe3d6', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '999px', padding: '4px 12px', marginBottom: '14px' }}>
              Koordinator Wilayah Jampangkulon
            </div>
            <h1 style={{ color: 'white', fontSize: '2.1rem', lineHeight: 1.2, marginBottom: '12px' }}>
              Laporkan sampah menumpuk,<br />kami jadwalkan pengangkutannya.
            </h1>
            <p style={{ color: '#d3e5da', fontSize: '1rem', marginBottom: '22px', maxWidth: '520px' }}>
              Layanan pengaduan dan permohonan pengangkutan sampah Dinas Lingkungan Hidup Kabupaten Sukabumi.
              Pantau status laporan Anda dari awal sampai sampah diangkut.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Link to="/laporan" style={{ padding: '12px 22px', borderRadius: '8px', background: '#e9b949', color: '#3d2c00', fontWeight: 700 }}>Buat Laporan</Link>
              <Link to="/laporan-saya" style={{ padding: '12px 22px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.5)', color: 'white', fontWeight: 600 }}>Laporan Saya</Link>
            </div>
          </div>
          <div style={{ flex: '1 1 340px', maxWidth: '480px' }}>
            <IlustrasiTruk />
          </div>
        </div>
      </section>

      {/* Angka */}
      <section style={{ ...lebarIsi, width: '100%', marginTop: '-40px' }}>
        <div style={{ background: 'white', border: '1px solid #e1e5e9', borderRadius: '12px', boxShadow: '0 6px 18px rgba(16,24,40,0.08)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {angka.map(([Ikon, nama, nilai], i) => (
            <div key={nama} style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderLeft: i ? '1px solid #eef0f2' : 'none' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#e7f1eb', color: '#1f6b47', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ikon size={20} /></div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.1 }}>{nilai ?? '–'}</div>
                <div style={{ fontSize: '0.84rem', color: '#5b6673' }}>{nama}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <main style={{ ...lebarIsi, width: '100%', flex: 1, paddingTop: '40px', paddingBottom: '48px' }}>
        {/* Alur */}
        <h2 style={{ fontSize: '1.3rem', marginBottom: '4px' }}>Cara melapor</h2>
        <p style={{ color: '#5b6673', marginBottom: '18px' }}>Empat langkah dari laporan sampai sampah diangkut.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '40px' }}>
          {LANGKAH.map(([Ikon, judul, isi], i) => (
            <div key={judul} style={{ background: 'white', border: '1px solid #e1e5e9', borderRadius: '12px', padding: '20px', position: 'relative' }}>
              <span style={{ position: 'absolute', top: '14px', right: '16px', fontSize: '1.8rem', fontWeight: 700, color: '#eef0f2' }}>{i + 1}</span>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#1f6b47', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}><Ikon size={22} /></div>
              <div style={{ fontWeight: 700, marginBottom: '4px' }}>{judul}</div>
              <div style={{ color: '#5b6673', fontSize: '0.9rem' }}>{isi}</div>
            </div>
          ))}
        </div>

        {/* Status & wilayah */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
          <div style={{ background: 'white', border: '1px solid #e1e5e9', borderRadius: '12px', padding: '20px 22px' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Arti status laporan</h2>
            {STATUS.map(([s, arti, bg, fg]) => (
              <div key={s} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '10px 0', borderTop: '1px solid #f1f3f5' }}>
                <span style={{ padding: '3px 10px', borderRadius: '999px', background: bg, color: fg, fontWeight: 600, fontSize: '0.8rem', minWidth: '78px', textAlign: 'center' }}>{s}</span>
                <span style={{ color: '#3a4550', fontSize: '0.92rem' }}>{arti}</span>
              </div>
            ))}
          </div>
          <div style={{ background: 'white', border: '1px solid #e1e5e9', borderRadius: '12px', padding: '20px 22px' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Wilayah layanan Korwil Jampangkulon</h2>
            {[['Kecamatan Jampangkulon', 'Kel. Jampangkulon, Ciparay, Tanjung, Nagraksari, Bojonggenteng, Cijaksa'],
              ['Kecamatan Surade', 'Kel. Surade, Pasiripis, Buniwangi, Surade Kidul, Jagamukti, Kadaleman'],
              ['Kecamatan Ciracap', 'Pasirpanjang, Ciracap, Ujunggenteng']].map(([kec, desa]) => (
              <div key={kec} style={{ display: 'flex', gap: '10px', padding: '10px 0', borderTop: '1px solid #f1f3f5' }}>
                <MapPin size={17} color="#1f6b47" style={{ flexShrink: 0, marginTop: '3px' }} />
                <div><div style={{ fontWeight: 600 }}>{kec}</div><div style={{ color: '#5b6673', fontSize: '0.88rem' }}>{desa}</div></div>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#5b6673', fontSize: '0.85rem', marginTop: '8px' }}>
              <Trash2 size={15} /> {stat?.jumlahTps ?? '–'} TPS terdaftar
            </div>
          </div>
        </div>
      </main>

      <footer style={{ background: '#0f3522', color: '#cfe3d6' }}>
        <div style={{ ...lebarIsi, padding: '28px 20px', display: 'flex', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap', fontSize: '0.88rem' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Lambang ukuran={40} latar="#ffffff" warna="#17533a" />
            <div>
              <div style={{ fontWeight: 600, color: 'white' }}>Dinas Lingkungan Hidup Kabupaten Sukabumi</div>
              <div>Sistem Pengelolaan Sampah</div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: '6px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={15} /> (0266) 225 078</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Mail size={15} /> dlh@sukabumikab.go.id</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={15} /> Jl. Bhayangkara No. 1, Palabuhanratu</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
