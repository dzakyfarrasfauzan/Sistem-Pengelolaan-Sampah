import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Trash2, 
  Truck, 
  Users, 
  AlertTriangle,
  CheckCircle,
  FileText,
  MessageSquareWarning,
  UserCog,
  Wrench
} from 'lucide-react';
import { API_URL } from '../../config';

const StatCard = ({ title, value, icon, color }) => (
  <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02), 0 10px 15px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '20px', transition: 'transform 0.2s ease', cursor: 'default' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
    <div style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`, padding: '16px', borderRadius: '16px', color: 'white', display: 'flex', boxShadow: `0 8px 16px ${color}40` }}>
      {icon}
    </div>
    <div>
      <div style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '4px', fontWeight: '500' }}>{title}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#111827' }}>{value}</div>
    </div>
  </div>
);

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await axios.get(`${API_URL}/admin/dashboard`, { withCredentials: true });
        if (res.data.success) {
          setData(res.data);
        }
      } catch (err) {
        if (err.response?.status === 401) navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [navigate]);


  if (loading) return <div style={{ padding: '40px', color: '#6b7280' }}>Memuat data dashboard...</div>;

  const { stats, laporanTerbaru } = data || {};

  return (
    <div style={{ padding: '40px' }}>
      <h2 style={{ margin: '0 0 30px', color: '#111827', fontSize: '1.8rem' }}>Ringkasan Sistem</h2>
      
      {/* Top 4 Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        <StatCard title="Total TPS" value={stats?.totalTps || 0} icon={<Trash2 size={24} />} color="#3b82f6" />
        <StatCard title="Total Kendaraan" value={stats?.totalKendaraan || 0} icon={<Truck size={24} />} color="#f59e0b" />
        <StatCard title="Sopir" value={stats?.totalSopir || 0} icon={<UserCog size={24} />} color="#0ea5e9" />
        <StatCard title="Kru" value={stats?.totalKru || 0} icon={<Users size={24} />} color="#10b981" />
        <StatCard title="Jadwal Hari Ini" value={stats?.jadwalHariIni || 0} icon={<BarChart3 size={24} />} color="#8b5cf6" />
      </div>

      {/* Laporan Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <StatCard title="Laporan Masuk" value={stats?.laporanMasuk || 0} icon={<FileText size={24} />} color="#6366f1" />
        <StatCard title="Laporan Pending" value={stats?.laporanBelumDitangani || 0} icon={<AlertTriangle size={24} />} color="#ef4444" />
        <StatCard title="Laporan Selesai" value={stats?.laporanSelesai || 0} icon={<CheckCircle size={24} />} color="#10b981" />
        <StatCard title="Kendaraan Perlu Perbaikan" value={stats?.kendaraanPerluPerbaikan || 0} icon={<Wrench size={24} />} color="#f97316" />
      </div>

      {stats?.teguranPengawas > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '16px 20px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600' }}>
          <AlertTriangle size={20} /> Ada {stats.teguranPengawas} teguran dari Bidang untuk laporan masyarakat yang belum selesai. Lihat di menu Laporan Publik.
        </div>
      )}

      {/* Recent Reports Table */}
      <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 20px', color: '#111827', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquareWarning size={20} color="#f59e0b" /> Laporan Terbaru
        </h3>
        {laporanTerbaru && laporanTerbaru.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontSize: '0.9rem' }}>
                <th style={{ padding: '12px 0' }}>Kode</th>
                <th style={{ padding: '12px 0' }}>Pelapor</th>
                <th style={{ padding: '12px 0' }}>Prioritas</th>
                <th style={{ padding: '12px 0' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {laporanTerbaru.map((lap) => (
                <tr key={lap.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '16px 0', fontWeight: '500', color: '#111827' }}>{lap.kode_laporan}</td>
                  <td style={{ padding: '16px 0', color: '#4b5563' }}>{lap.nama_pelapor}</td>
                  <td style={{ padding: '16px 0' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', background: lap.prioritas === 'tinggi' ? '#fee2e2' : lap.prioritas ? '#fef3c7' : '#f3f4f6', color: lap.prioritas === 'tinggi' ? '#dc2626' : lap.prioritas ? '#d97706' : '#6b7280' }}>
                      {(lap.prioritas || 'belum ditentukan').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '16px 0' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', background: lap.status === 'selesai' ? '#d1fae5' : '#e0e7ff', color: lap.status === 'selesai' ? '#059669' : '#4f46e5' }}>
                      {lap.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>Belum ada laporan terbaru.</div>
        )}
      </div>
    </div>
  );
}

// Ensure MessageSquareWarning is imported from lucide-react above.

