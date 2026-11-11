import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogOut } from 'lucide-react';
import { API_URL } from '../config';
import NotifikasiLonceng from './NotifikasiLonceng';

const NAMA_PERAN = { admin: 'Admin Korwil', sopir: 'Sopir', pengawas: 'Pengawas Bidang' };

/**
 * Kerangka halaman untuk pengguna yang login (admin, sopir, pengawas):
 * bilah atas berisi nama instansi dan akun, menu di kiri, isi halaman di kanan.
 * Di layar HP menu berpindah ke atas dan dapat digeser.
 */
export default function PanelLayout({ judulMenu, menu }) {
  const navigate = useNavigate();
  const [akun, setAkun] = useState(null);

  useEffect(() => {
    const muat = async () => {
      try {
        const res = await axios.get(`${API_URL}/me`, { withCredentials: true });
        if (res.data.success) setAkun(res.data.user);
      } catch { /* sesi habis: halaman tetap tampil, API akan menolak */ }
    };
    muat();
  }, []);

  const keluar = async () => {
    try { await axios.post(`${API_URL}/logout`, {}, { withCredentials: true }); } catch { /* abaikan */ }
    navigate('/login');
  };

  return (
    <div className="panel">
      <header className="panel-atas">
        <div className="panel-merek">
          <strong>DLH Kabupaten Sukabumi</strong>
          <span>Sistem Pengelolaan Sampah</span>
        </div>
        <div className="panel-akun">
          <NotifikasiLonceng />
          {akun && (
            <div className="nama">
              {akun.name}
              <small>{NAMA_PERAN[akun.role] || akun.role}</small>
            </div>
          )}
          <button className="panel-keluar" onClick={keluar} title="Keluar">
            <LogOut size={15} /> Keluar
          </button>
        </div>
      </header>

      <div className="panel-badan">
        <nav className="panel-menu">
          <div className="judul-menu">{judulMenu}</div>
          {menu.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to}>
              <Icon size={17} strokeWidth={1.8} /> {label}
            </NavLink>
          ))}
        </nav>
        <main className="panel-isi">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
