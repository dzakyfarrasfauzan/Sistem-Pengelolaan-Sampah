import { Link } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';

// Komponen tampilan bersama untuk panel petugas

/** Kartu putih dengan judul, ikon, dan tautan opsional di kanan */
export function Kartu({ judul, ikon, aksi, keAksi, children, gaya }) {
  return (
    <section style={{ background: 'white', border: '1px solid #e1e5e9', borderRadius: '10px', boxShadow: '0 1px 2px rgba(16,24,40,0.04)', ...gaya }}>
      {judul && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '14px 18px', borderBottom: '1px solid #eef0f2' }}>
          <h3 style={{ fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {ikon && <span style={{ color: '#1f6b47', display: 'flex' }}>{ikon}</span>} {judul}
          </h3>
          {aksi && keAksi && (
            <Link to={keAksi} style={{ fontSize: '0.82rem', color: '#1f6b47', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
              {aksi} <ChevronRight size={15} />
            </Link>
          )}
        </div>
      )}
      <div style={{ padding: '16px 18px' }}>{children}</div>
    </section>
  );
}

/** Kartu angka (KPI) dengan ikon dalam lingkaran berwarna */
export function KartuAngka({ judul, nilai, ikon, warna = '#1f6b47', latar = '#e7f1eb', keterangan, ke }) {
  const isi = (
    <div style={{ background: 'white', border: '1px solid #e1e5e9', borderRadius: '10px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px', height: '100%', boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>
      <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: latar, color: warna, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{ikon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: '#5b6673', fontSize: '0.84rem' }}>{judul}</div>
        <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1f2933', lineHeight: 1.2 }}>{nilai}</div>
        {keterangan && <div style={{ fontSize: '0.76rem', color: '#8a939d' }}>{keterangan}</div>}
      </div>
    </div>
  );
  return ke ? <Link to={ke} style={{ display: 'block' }}>{isi}</Link> : isi;
}

const WARNA_STATUS = {
  masuk: ['#eef0f2', '#3a4550'], menunggu: ['#eef0f2', '#3a4550'],
  diproses: ['#fdf1e3', '#8a4b0f'], berjalan: ['#e6eef7', '#1d4f73'],
  selesai: ['#e3f1e8', '#17533a'], diperiksa: ['#e6eef7', '#1d4f73'], batal: ['#fbe9e9', '#9b1c1c'],
  tinggi: ['#fbe9e9', '#9b1c1c'], sedang: ['#fdf1e3', '#8a4b0f'], rendah: ['#e6eef7', '#1d4f73'],
  aktif: ['#e3f1e8', '#17533a'], nonaktif: ['#f1f3f5', '#5b6673'],
  baik: ['#e3f1e8', '#17533a'], 'rusak ringan': ['#fdf1e3', '#8a4b0f'], 'rusak berat': ['#fbe9e9', '#9b1c1c'],
  tersedia: ['#e3f1e8', '#17533a'], digunakan: ['#e6eef7', '#1d4f73'], maintenance: ['#fdf1e3', '#8a4b0f'],
  sopir: ['#e6eef7', '#1d4f73'], kru: ['#fdf1e3', '#8a4b0f'], rutin: ['#e6eef7', '#1d4f73'], tambahan: ['#fbf1e6', '#8a4b0f'],
  terlambat: ['#fbe9e9', '#9b1c1c'],
};

/** Lencana status/prioritas dengan warna yang seragam di semua halaman */
export function Lencana({ nilai, kosong = 'Belum ditentukan' }) {
  const [bg, fg] = WARNA_STATUS[nilai] || ['#f1f3f5', '#5b6673'];
  return (
    <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: '999px', fontSize: '0.76rem', fontWeight: 600, background: bg, color: fg, whiteSpace: 'nowrap' }}>
      {nilai ? nilai.charAt(0).toUpperCase() + nilai.slice(1) : kosong}
    </span>
  );
}

/** Judul halaman dengan keterangan dan tombol aksi */
export function JudulHalaman({ judul, keterangan, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
      <div>
        <h1 style={{ fontSize: '1.45rem' }}>{judul}</h1>
        {keterangan && <p style={{ color: '#5b6673', fontSize: '0.92rem', marginTop: '2px' }}>{keterangan}</p>}
      </div>
      {children && <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{children}</div>}
    </div>
  );
}

/** Deretan angka ringkas di atas tabel: [{ label, nilai, warna }] */
export function RingkasanAngka({ data }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '16px' }}>
      {data.map(d => (
        <div key={d.label} style={{ background: 'white', border: '1px solid #e1e5e9', borderRadius: '10px', padding: '12px 14px', borderLeft: `4px solid ${d.warna || '#1f6b47'}` }}>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#1f2933', lineHeight: 1.2 }}>{d.nilai}</div>
          <div style={{ fontSize: '0.8rem', color: '#5b6673' }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

/** Kotak pencarian */
export function KotakCari({ nilai, onUbah, petunjuk = 'Cari...' }) {
  return (
    <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '340px' }}>
      <Search size={16} color="#8a939d" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }} />
      <input value={nilai} onChange={e => onUbah(e.target.value)} placeholder={petunjuk}
        style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1px solid #d8dde3', borderRadius: '8px', background: 'white', boxSizing: 'border-box' }} />
    </div>
  );
}

/** Tab filter berbentuk pil: pilihan [{ nilai, label, jumlah }] */
export function TabFilter({ pilihan, aktif, onPilih }) {
  return (
    <div style={{ display: 'inline-flex', gap: '4px', background: '#eef1ef', padding: '4px', borderRadius: '10px', flexWrap: 'wrap' }}>
      {pilihan.map(p => {
        const on = p.nilai === aktif;
        return (
          <button key={p.nilai} type="button" onClick={() => onPilih(p.nilai)} style={{
            padding: '7px 14px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.86rem',
            background: on ? 'white' : 'transparent', color: on ? '#17533a' : '#5b6673', boxShadow: on ? '0 1px 2px rgba(16,24,40,0.1)' : 'none',
          }}>
            {p.label}{p.jumlah !== undefined && <span style={{ marginLeft: '6px', fontSize: '0.76rem', padding: '1px 7px', borderRadius: '999px', background: on ? '#e3f1e8' : '#dde2df', color: on ? '#17533a' : '#5b6673' }}>{p.jumlah}</span>}
          </button>
        );
      })}
    </div>
  );
}
