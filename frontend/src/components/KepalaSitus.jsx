import { Link, NavLink } from 'react-router-dom';

const tautan = ({ isActive }) => ({
  padding: '6px 2px',
  color: isActive ? '#17533a' : '#3a4550',
  fontWeight: isActive ? 600 : 400,
  borderBottom: isActive ? '2px solid #1f6b47' : '2px solid transparent',
  fontSize: '0.92rem',
});

/** Kepala halaman publik: nama instansi dan menu utama */
export default function KepalaSitus() {
  return (
    <header style={{ background: 'white', borderBottom: '1px solid #d8dde3' }}>
      <div style={{ background: '#17533a', color: '#dfece4', fontSize: '0.78rem' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '4px 20px' }}>Pemerintah Kabupaten Sukabumi</div>
      </div>
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '4px', background: '#1f6b47', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>DLH</div>
          <div style={{ lineHeight: 1.25 }}>
            <div style={{ fontWeight: 600, color: '#1f2933' }}>Dinas Lingkungan Hidup</div>
            <div style={{ fontSize: '0.82rem', color: '#5b6673' }}>Kabupaten Sukabumi</div>
          </div>
        </Link>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <NavLink to="/" end style={tautan}>Beranda</NavLink>
          <NavLink to="/laporan" style={tautan}>Lapor Sampah</NavLink>
          <NavLink to="/cek-status" style={tautan}>Cek Status Laporan</NavLink>
          <Link to="/login" style={{ padding: '6px 12px', border: '1px solid #1f6b47', borderRadius: '4px', color: '#1f6b47', fontSize: '0.88rem' }}>Masuk Petugas</Link>
        </nav>
      </div>
    </header>
  );
}
