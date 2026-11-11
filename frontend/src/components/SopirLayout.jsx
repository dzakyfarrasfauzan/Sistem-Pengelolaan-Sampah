import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  LayoutDashboard,
  ClipboardCheck,
  MessageSquareWarning,
  LogOut
} from 'lucide-react';
import { API_URL } from '../config';
import NotifikasiLonceng from './NotifikasiLonceng';

export default function SopirLayout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/logout`, {}, { withCredentials: true });
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

  const navStyles = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
    margin: '8px 16px',
    borderRadius: '12px',
    color: isActive ? '#fff' : '#d1d5db',
    background: isActive ? 'linear-gradient(90deg, #0ea5e9 0%, #0284c7 100%)' : 'transparent',
    textDecoration: 'none',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    boxShadow: isActive ? '0 4px 12px rgba(14, 165, 233, 0.3)' : 'none'
  });

  return (
    <div className="sopir-layout" style={{ display: 'flex', minHeight: '100vh', background: '#f3f4f6', fontFamily: 'Inter, sans-serif' }}>
      {/* Tampilan HP: sidebar menjadi menu atas yang bisa digeser */}
      <style>{`
        @media (max-width: 768px) {
          .sopir-layout { flex-direction: column; }
          .sopir-aside { width: 100% !important; flex-direction: row !important; align-items: center; position: sticky; top: 0; }
          .sopir-aside .sopir-judul { display: none; }
          .sopir-aside nav { display: flex; overflow-x: auto; }
          .sopir-aside nav a { margin: 6px 4px !important; padding: 8px 12px !important; white-space: nowrap; font-size: 0.85rem; }
          .sopir-aside .sopir-keluar { padding: 6px !important; }
          .sopir-aside .sopir-keluar span { display: none; }
          .sopir-header { padding: 0 12px !important; height: 56px !important; }
          .sopir-header .sopir-nama { display: none !important; }
          .sopir-konten > div { padding: 16px !important; }
        }
      `}</style>
      {/* Sidebar */}
      <aside className="sopir-aside" style={{ width: '280px', background: '#0c4a6e', color: 'white', display: 'flex', flexDirection: 'column', boxShadow: '4px 0 10px rgba(0,0,0,0.1)', zIndex: 20 }}>
        <div className="sopir-judul" style={{ padding: '24px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '20px' }}>
          <h2 style={{ color: '#bae6fd', margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>DLH SOPIR</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#7dd3fc' }}>Pemimpin Tim Petugas Operasional</p>
        </div>

        <nav style={{ flex: 1 }}>
          <NavLink to="/sopir/dashboard" style={navStyles}><LayoutDashboard size={20} /> Dashboard</NavLink>
          <NavLink to="/sopir/jadwal" style={navStyles}><ClipboardCheck size={20} /> Jadwal &amp; Armada</NavLink>
          <NavLink to="/sopir/laporan" style={navStyles}><MessageSquareWarning size={20} /> Laporan Prioritas</NavLink>
        </nav>

        <div className="sopir-keluar" style={{ padding: '20px' }}>
          <button title="Logout" 
            onClick={handleLogout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'rgba(255, 255, 255, 0.1)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.3s' }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'; }}
          >
            <LogOut size={18} /> <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header className="sopir-header" style={{ height: '70px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 40px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <NotifikasiLonceng />
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#0ea5e9', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              S
            </div>
            <div className="sopir-nama" style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#111827' }}>Akun Sopir</span>
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Shift Aktif</span>
            </div>
          </div>
        </header>

        <div className="sopir-konten" style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
