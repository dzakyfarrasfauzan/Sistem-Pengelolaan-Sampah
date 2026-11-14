import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogOut, Menu as IkonMenu, X } from 'lucide-react';
import { API_URL } from '../config';
import NotifikasiLonceng from './NotifikasiLonceng';
import Lambang from './Lambang';

const NAMA_PERAN = { admin: 'Admin Korwil', sopir: 'Sopir', pengawas: 'Pengawas Bidang' };
const inisial = (nama = '') => nama.split(/\s+/).filter(Boolean).slice(0, 2).map(k => k[0].toUpperCase()).join('') || '?';
const tanggalHariIni = () => new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Kerangka halaman pengguna yang login (admin, sopir, pengawas):
 * menu samping hijau tua, bilah atas berisi judul halaman, tanggal, notifikasi, dan akun.
 * Di layar HP menu samping dibuka lewat tombol menu.
 */
export default function PanelLayout({ judulMenu, menu }) {
  const navigate = useNavigate();
  const lokasi = useLocation();
  const [akun, setAkun] = useState(null);
  const [menuHp, setMenuHp] = useState(false);

  useEffect(() => {
    const muat = async () => {
      try {
        const res = await axios.get(`${API_URL}/me`, { withCredentials: true });
        if (res.data.success) setAkun(res.data.user);
      } catch { /* sesi habis: API halaman akan menolak */ }
    };
    muat();
  }, []);

  const keluar = async () => {
    try { await axios.post(`${API_URL}/logout`, {}, { withCredentials: true }); } catch { /* abaikan */ }
    navigate('/login');
  };

  const aktif = menu.find(m => lokasi.pathname.startsWith(m.to));

  return (
    <div className="panel">
      <aside className={`panel-samping${menuHp ? ' buka' : ''}`}>
        <div className="panel-merek">
          <Lambang ukuran={38} latar="#ffffff" warna="#17533a" />
          <div>
            <strong>Sistem Pengelolaan Sampah</strong>
            <span>DLH Kabupaten Sukabumi</span>
          </div>
          <button className="panel-tutup" onClick={() => setMenuHp(false)} aria-label="Tutup menu"><X size={20} /></button>
        </div>

        <div className="judul-menu">{judulMenu}</div>
        <nav className="panel-menu">
          {menu.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} onClick={() => setMenuHp(false)}>
              <Icon size={18} strokeWidth={1.9} /> <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {akun && (
          <div className="panel-akun">
            <div className="avatar">{inisial(akun.name)}</div>
            <div className="nama">
              {akun.name}
              <small>{NAMA_PERAN[akun.role] || akun.role}</small>
            </div>
            <button onClick={keluar} title="Keluar" aria-label="Keluar"><LogOut size={17} /></button>
          </div>
        )}
      </aside>
      {menuHp && <div className="panel-tirai" onClick={() => setMenuHp(false)} />}

      <div className="panel-kanan">
        <header className="panel-atas">
          <button className="panel-buka" onClick={() => setMenuHp(true)} aria-label="Buka menu"><IkonMenu size={20} /></button>
          <div className="panel-judul">
            <div className="jejak">{judulMenu} <span>›</span> <strong>{aktif?.label || 'Dashboard'}</strong></div>
            <span className="tanggal">{tanggalHariIni()}</span>
          </div>
          <NotifikasiLonceng />
        </header>
        <main className="panel-isi">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
