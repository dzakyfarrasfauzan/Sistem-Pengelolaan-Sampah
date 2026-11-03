import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Truck, ClipboardCheck, AlertTriangle, CheckCircle, MessageSquareWarning } from 'lucide-react';
import { API_URL } from '../../config';

const Kartu = ({ judul, nilai, icon, bg, fg }) => (
  <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '20px' }}>
    <div style={{ background: bg, padding: '16px', borderRadius: '12px', color: fg }}>{icon}</div>
    <div><div style={{ color: '#6b7280', fontSize: '0.9rem' }}>{judul}</div><div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{nilai}</div></div>
  </div>
);

export default function SopirDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API_URL}/sopir/dashboard`, { withCredentials: true });
        if (res.data.success) setData(res.data);
      } catch (err) {
        if (err.response?.status === 401) navigate('/login');
        setErrorMsg(err.response?.data?.message || 'Gagal memuat data. Silakan login kembali.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  if (loading) return <div style={{ padding: '40px' }}>Memuat data...</div>;
  const { stats, jadwalMendatang } = data || {};

  return (
    <div style={{ padding: '40px' }}>
      <h2 style={{ margin: '0 0 30px', color: '#111827', fontSize: '1.8rem' }}>Ringkasan Tugas Sopir</h2>
      {errorMsg && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '15px', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold' }}>{errorMsg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <Kartu judul="Total Jadwal" nilai={stats?.totalJadwal || 0} icon={<Truck size={24} />} bg="#e0f2fe" fg="#0284c7" />
        <Kartu judul="Belum Diperiksa" nilai={stats?.belumDiperiksa || 0} icon={<AlertTriangle size={24} />} bg="#fef3c7" fg="#d97706" />
        <Kartu judul="Pemeriksaan Dikirim" nilai={stats?.totalPemeriksaan || 0} icon={<ClipboardCheck size={24} />} bg="#ede9fe" fg="#7c3aed" />
        <Kartu judul="Pengangkutan Selesai" nilai={stats?.jadwalSelesai || 0} icon={<CheckCircle size={24} />} bg="#d1fae5" fg="#059669" />
        <Kartu judul="Laporan Ditugaskan" nilai={stats?.laporanDitugaskan || 0} icon={<MessageSquareWarning size={24} />} bg="#fee2e2" fg="#dc2626" />
      </div>

      <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 20px', color: '#111827' }}>Jadwal Mendatang (7 Hari ke Depan)</h3>
        {jadwalMendatang && jadwalMendatang.length > 0 ? jadwalMendatang.map(j => (
          <div key={j.id} style={{ padding: '16px', border: '1px solid #f3f4f6', borderRadius: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#111827' }}>{j.nama_tps}</div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
                <span style={{ background: '#e0f2fe', color: '#0284c7', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600' }}>📅 {j.tanggal}</span>
                <span style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600' }}>Pukul {j.jam}</span>
                <span style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600' }}>Truk {j.nomor_polisi}</span>
                <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600' }}>Kru: {j.kru_names || '-'}</span>
              </div>
            </div>
            <button onClick={() => navigate('/sopir/jadwal')} style={{ padding: '10px 20px', background: j.kondisi_berangkat ? '#d1fae5' : '#0ea5e9', color: j.kondisi_berangkat ? '#059669' : 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
              {j.kondisi_berangkat ? 'Sudah Diperiksa' : 'Periksa Armada'}
            </button>
          </div>
        )) : (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>Tidak ada jadwal dalam 7 hari ke depan.</div>
        )}
      </div>
    </div>
  );
}
