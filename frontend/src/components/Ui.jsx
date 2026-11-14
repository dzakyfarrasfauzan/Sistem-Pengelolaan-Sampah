import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

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
