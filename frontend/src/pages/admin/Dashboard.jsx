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
  <div style={{ background: 'white', padding: '16px 18px', borderRadius: '6px', border: '1px solid #d8dde3', borderTop: `3px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
    <div>
      <div style={{ color: '#5b6673', fontSize: '0.85rem', marginBottom: '2px' }}>{title}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1f2933' }}>{value}</div>
    </div>
    <div style={{ color, opacity: 0.85, display: 'flex' }}>{icon}</div>
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


  if (loading) return <div style={{ padding: '40px', color: '#5b6673' }}>Memuat data dashboard...</div>;

  const { stats, laporanTerbaru } = data || {};

  return (
    <div style={{ padding: '40px' }}>
      <h2 style={{ margin: '0 0 30px', color: '#1f2933', fontSize: '1.4rem' }}>Ringkasan Sistem</h2>
      
      {/* Top 4 Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        <StatCard title="Total TPS" value={stats?.totalTps || 0} icon={<Trash2 size={24} />} color="#3b82f6" />
        <StatCard title="Total Kendaraan" value={stats?.totalKendaraan || 0} icon={<Truck size={24} />} color="#f59e0b" />
        <StatCard title="Sopir" value={stats?.totalSopir || 0} icon={<UserCog size={24} />} color="#1f6b47" />
        <StatCard title="Kru" value={stats?.totalKru || 0} icon={<Users size={24} />} color="#1f6b47" />
        <StatCard title="Jadwal Hari Ini" value={stats?.jadwalHariIni || 0} icon={<BarChart3 size={24} />} color="#5b6673" />
      </div>

      {/* Laporan Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <StatCard title="Laporan Masuk" value={stats?.laporanMasuk || 0} icon={<FileText size={24} />} color="#1f6b47" />
        <StatCard title="Laporan Pending" value={stats?.laporanBelumDitangani || 0} icon={<AlertTriangle size={24} />} color="#ef4444" />
        <StatCard title="Laporan Selesai" value={stats?.laporanSelesai || 0} icon={<CheckCircle size={24} />} color="#1f6b47" />
        <StatCard title="Kendaraan Perlu Perbaikan" value={stats?.kendaraanPerluPerbaikan || 0} icon={<Wrench size={24} />} color="#f97316" />
      </div>

      {stats?.teguranPengawas > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '16px 20px', borderRadius: '6px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600' }}>
          <AlertTriangle size={20} /> Ada {stats.teguranPengawas} teguran dari Bidang untuk laporan masyarakat yang belum selesai. Lihat di menu Laporan Publik.
        </div>
      )}

      {/* Recent Reports Table */}
      <div style={{ background: 'white', borderRadius: '6px', padding: '24px', boxShadow: '0 1px 2px rgba(16,24,40,0.06)' }}>
        <h3 style={{ margin: '0 0 20px', color: '#1f2933', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquareWarning size={20} color="#f59e0b" /> Laporan Terbaru
        </h3>
        {laporanTerbaru && laporanTerbaru.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f3f4f6', color: '#5b6673', fontSize: '0.9rem' }}>
                <th style={{ padding: '12px 0' }}>Kode</th>
                <th style={{ padding: '12px 0' }}>Pelapor</th>
                <th style={{ padding: '12px 0' }}>Prioritas</th>
                <th style={{ padding: '12px 0' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {laporanTerbaru.map((lap) => (
                <tr key={lap.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '16px 0', fontWeight: '500', color: '#1f2933' }}>{lap.kode_laporan}</td>
                  <td style={{ padding: '16px 0', color: '#4b5563' }}>{lap.nama_pelapor}</td>
                  <td style={{ padding: '16px 0' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', background: lap.prioritas === 'tinggi' ? '#fee2e2' : lap.prioritas ? '#fef3c7' : '#f3f4f6', color: lap.prioritas === 'tinggi' ? '#dc2626' : lap.prioritas ? '#d97706' : '#5b6673' }}>
                      {(lap.prioritas || 'belum ditentukan').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '16px 0' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', background: lap.status === 'selesai' ? '#e7f1eb' : '#e7f1eb', color: lap.status === 'selesai' ? '#1f6b47' : '#1f6b47' }}>
                      {lap.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', color: '#8a939d', padding: '20px' }}>Belum ada laporan terbaru.</div>
        )}
      </div>
    </div>
  );
}

// Ensure MessageSquareWarning is imported from lucide-react above.

