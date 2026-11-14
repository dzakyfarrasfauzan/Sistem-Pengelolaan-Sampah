import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';

const tautan = ({ isActive }) => ({
  padding: '6px 2px',
  color: isActive ? '#17533a' : '#3a4550',
  fontWeight: isActive ? 600 : 400,
  borderBottom: isActive ? '2px solid #1f6b47' : '2px solid transparent',
  fontSize: '0.92rem',
});

/** Kepala halaman publik: nama instansi dan menu utama */
export default function KepalaSitus() {
  const navigate = useNavigate();
  const [akun, setAkun] = useState(undefined); // undefined = memuat, null = belum masuk

  useEffect(() => {
    const muat = async () => {
      try {
        const r = await axios.get(`${API_URL}/masyarakat/saya`, { withCredentials: true });
        setAkun(r.data.akun || null);
      } catch { setAkun(null); }
    };
    muat();
  }, []);

  const keluar = async () => {
    try { await axios.post(`${API_URL}/masyarakat/keluar`, {}, { withCredentials: true }); } catch { /* abaikan */ }
    setAkun(null);
    navigate('/');
  };

  return (
    <header style={{ background: 'white', borderBottom: '1px solid #d8dde3' }}>
      <div style={{ background: '#17533a', color: '#dfece4', fontSize: '0.78rem' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '4px 20px', display: 'flex', justifyContent: 'space-between' }}>
          <span>Pemerintah Kabupaten Sukabumi</span>
          <Link to="/login" style={{ color: '#dfece4' }}>Masuk Petugas</Link>
        </div>
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
          {akun ? (
            <>
              <NavLink to="/laporan-saya" style={tautan}>Laporan Saya</NavLink>
              <span style={{ fontSize: '0.85rem', color: '#5b6673' }}>{akun.nama}</span>
              <button type="button" onClick={keluar} style={{ padding: '6px 12px', border: '1px solid #b9c2cb', borderRadius: '4px', background: 'white', color: '#3a4550', fontSize: '0.88rem', cursor: 'pointer' }}>Keluar</button>
            </>
          ) : (
            <>
              <NavLink to="/cek-status" style={tautan}>Cek Status</NavLink>
              {akun === null && <Link to="/masuk" style={{ padding: '6px 12px', border: '1px solid #1f6b47', borderRadius: '4px', color: '#1f6b47', fontSize: '0.88rem' }}>Masuk</Link>}
              {akun === null && <Link to="/daftar" style={{ padding: '6px 12px', borderRadius: '4px', background: '#1f6b47', color: 'white', fontSize: '0.88rem' }}>Daftar</Link>}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
