import { useEffect, useState } from 'react';
import axios from 'axios';
import { Truck, CheckCircle, Clock } from 'lucide-react';
import { API_URL } from '../../config';

export default function PetugasDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API_URL}/petugas/dashboard`, { withCredentials: true });
        if (res.data.success) {
          setData(res.data);
        } else {
          setErrorMsg('Akses ditolak atau data tidak ditemukan');
        }
      } catch (err) {
        console.error(err);
        setErrorMsg(err.response?.data?.message || 'Gagal terhubung ke peladen. Silakan login kembali.');
      }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <div style={{ padding: '40px' }}>Memuat data operasional...</div>;

  const { stats, jadwalHariIni } = data || {};

  return (
    <div style={{ padding: '40px' }}>
      <h2 style={{ margin: '0 0 30px', color: '#111827', fontSize: '1.8rem' }}>Ringkasan Operasional Hari Ini</h2>
      
      {errorMsg && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '15px', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold' }}>
          Error: {errorMsg}
        </div>
      )}
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ background: '#e0e7ff', padding: '16px', borderRadius: '12px', color: '#4f46e5' }}><Truck size={24} /></div>
          <div><div style={{ color: '#6b7280', fontSize: '0.9rem' }}>Total Tugas</div><div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{stats?.totalJadwal || 0}</div></div>
        </div>
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ background: '#fef3c7', padding: '16px', borderRadius: '12px', color: '#d97706' }}><Clock size={24} /></div>
          <div><div style={{ color: '#6b7280', fontSize: '0.9rem' }}>Sedang Berjalan</div><div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{stats?.jadwalBerjalan || 0}</div></div>
        </div>
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ background: '#d1fae5', padding: '16px', borderRadius: '12px', color: '#059669' }}><CheckCircle size={24} /></div>
          <div><div style={{ color: '#6b7280', fontSize: '0.9rem' }}>Tugas Selesai</div><div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{stats?.jadwalSelesai || 0}</div></div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 20px', color: '#111827' }}>Jadwal Mendatang (7 Hari ke Depan)</h3>
        {jadwalHariIni && jadwalHariIni.length > 0 ? (
          jadwalHariIni.map(j => (
            <div key={j.id} style={{ padding: '16px', border: '1px solid #f3f4f6', borderRadius: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#111827' }}>{j.nama_tps}</div>
                <div style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '4px' }}>{j.alamat}</div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <span style={{ background: '#e0e7ff', color: '#4f46e5', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600' }}>📅 {j.tanggal}</span>
                  <span style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600' }}>Pukul {j.jam}</span>
                  <span style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600' }}>Truk {j.nomor_polisi}</span>
                </div>
              </div>
              <div>
                <button style={{ padding: '10px 20px', background: j.status === 'selesai' ? '#d1fae5' : '#3b82f6', color: j.status === 'selesai' ? '#059669' : 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {j.status === 'selesai' ? 'Selesai' : 'Update Status'}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>Tidak ada jadwal dalam 7 hari ke depan.</div>
        )}
      </div>
    </div>
  );
}
