import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Truck, ClipboardCheck, AlertTriangle, CheckCircle, MessageSquareWarning } from 'lucide-react';
import { API_URL } from '../../config';

const Kartu = ({ judul, nilai, icon, fg, ket }) => (
  <div style={{ background: 'white', padding: '16px 18px', borderRadius: '6px', border: '1px solid #d8dde3', borderTop: `3px solid ${fg}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
    <div>
      <div style={{ color: '#5b6673', fontSize: '0.85rem' }}>{judul}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1f2933' }}>{nilai}</div>
      {ket && <div style={{ fontSize: '0.75rem', color: '#8a939d' }}>{ket}</div>}
    </div>
    <div style={{ color: fg, opacity: 0.85, display: 'flex' }}>{icon}</div>
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
      <h2 style={{ margin: '0 0 30px', color: '#1f2933', fontSize: '1.4rem' }}>Ringkasan Tugas Sopir</h2>
      {errorMsg && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '15px', borderRadius: '4px', marginBottom: '20px', fontWeight: 'bold' }}>{errorMsg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <Kartu judul="Total Jadwal" nilai={stats?.totalJadwal || 0} icon={<Truck size={24} />} bg="#e6eef5" fg="#17533a" />
        <Kartu judul="Belum Diperiksa" nilai={stats?.belumDiperiksa || 0} icon={<AlertTriangle size={24} />} bg="#fef3c7" fg="#d97706" />
        <Kartu judul="Pemeriksaan Dikirim" nilai={stats?.totalPemeriksaan || 0} icon={<ClipboardCheck size={24} />} bg="#eef0f2" fg="#5b6673" />
        <Kartu judul="Pengangkutan Selesai" nilai={stats?.jadwalSelesai || 0} icon={<CheckCircle size={24} />} bg="#e7f1eb" fg="#1f6b47" />
        <Kartu judul="Laporan Ditugaskan" nilai={stats?.laporanDitugaskan || 0} icon={<MessageSquareWarning size={24} />} bg="#fee2e2" fg="#dc2626" />
      </div>

      <div style={{ background: 'white', borderRadius: '6px', padding: '24px', boxShadow: '0 1px 2px rgba(16,24,40,0.06)' }}>
        <h3 style={{ margin: '0 0 20px', color: '#1f2933' }}>Jadwal Mendatang (7 Hari ke Depan)</h3>
        {jadwalMendatang && jadwalMendatang.length > 0 ? jadwalMendatang.map(j => (
          <div key={j.id} style={{ padding: '16px', border: '1px solid #f3f4f6', borderRadius: '6px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#1f2933' }}>{j.lokasi_tampil}</div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
                <span style={{ background: '#e6eef5', color: '#17533a', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600' }}>{j.tanggal}</span>
                <span style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600' }}>Pukul {j.jam}</span>
                <span style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600' }}>Truk {j.nomor_polisi}</span>
                <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600' }}>Kru: {j.kru_names || '-'}</span>
              </div>
            </div>
            <button onClick={() => navigate('/sopir/jadwal')} style={{ padding: '10px 20px', background: j.kondisi_berangkat ? '#e7f1eb' : '#1f6b47', color: j.kondisi_berangkat ? '#1f6b47' : 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
              {j.kondisi_berangkat ? 'Sudah Diperiksa' : 'Periksa Armada'}
            </button>
          </div>
        )) : (
          <div style={{ textAlign: 'center', color: '#8a939d', padding: '20px' }}>Tidak ada jadwal dalam 7 hari ke depan.</div>
        )}
      </div>
    </div>
  );
}
