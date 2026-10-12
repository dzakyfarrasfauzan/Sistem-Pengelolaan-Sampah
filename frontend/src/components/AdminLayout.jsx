import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  LayoutDashboard,
  Trash2,
  Truck,
  Users,
  CalendarDays,
  MessageSquareWarning,
  LogOut
} from 'lucide-react';
import { API_URL } from '../config';

export default function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/logout`, {}, { withCredentials: true });
      navigate('/login');
    } catch {
      console.error('Logout failed');
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
    color: isActive ? '#fff' : '#9ca3af',
    background: isActive ? 'linear-gradient(90deg, #059669 0%, #10b981 100%)' : 'transparent',
    textDecoration: 'none',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    boxShadow: isActive ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none'
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb', fontFamily: 'Inter, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ width: '280px', background: '#111827', color: 'white', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px', textAlign: 'center', borderBottom: '1px solid #1f2937', marginBottom: '20px' }}>
          <h2 style={{ color: '#10b981', margin: 0, fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '1px' }}>DLH ADMIN</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#9ca3af' }}>Kabupaten Sukabumi</p>
        </div>

        <nav style={{ flex: 1 }}>
          <NavLink to="/admin/dashboard" style={navStyles}><LayoutDashboard size={20} /> Dashboard</NavLink>
          <NavLink to="/admin/tps" style={navStyles}><Trash2 size={20} /> Data TPS</NavLink>
          <NavLink to="/admin/kendaraan" style={navStyles}><Truck size={20} /> Kendaraan</NavLink>
          <NavLink to="/admin/petugas" style={navStyles}><Users size={20} /> Petugas</NavLink>
          <NavLink to="/admin/jadwal" style={navStyles}><CalendarDays size={20} /> Jadwal</NavLink>
          <NavLink to="/admin/laporan-masyarakat" style={navStyles}><MessageSquareWarning size={20} /> Laporan Publik</NavLink>
        </nav>

        <div style={{ padding: '20px' }}>
          <button 
            onClick={handleLogout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.3s' }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; }}
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <header style={{ height: '70px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', zIndex: 10 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#374151' }}>
            Panel Administrasi
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              A
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#111827' }}>Administrator</span>
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Aktif</span>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
