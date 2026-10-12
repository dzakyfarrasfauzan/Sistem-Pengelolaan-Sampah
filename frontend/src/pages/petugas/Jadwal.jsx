import { useEffect, useState } from 'react';
import axios from 'axios';
import { Truck, CheckCircle, Clock } from 'lucide-react';
import { API_URL } from '../../config';

export default function Jadwal() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/petugas/jadwal`, { withCredentials: true });
      if (res.data.success) {
        setList(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setList(prev => prev || []); // Ensure list fallback
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      await fetchData();
    };
    load();
  }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      let catatan = '';
      if (newStatus === 'selesai') {
        catatan = window.prompt('Masukkan catatan penyelesaian (Opsional):') || '';
      }
      await axios.put(`${API_URL}/petugas/jadwal/${id}/status`, { status: newStatus, catatan }, { withCredentials: true });
      fetchData();
    } catch (err) {
      alert('Gagal memperbarui status: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) return <div style={{ padding: '40px' }}>Memuat jadwal Anda...</div>;

  return (
    <div style={{ padding: '40px', fontFamily: 'Inter, sans-serif' }}>
      <h1 style={{ margin: '0 0 8px', color: '#111827' }}>Jadwal Rute Saya</h1>
      <p style={{ color: '#6b7280', margin: '0 0 30px' }}>Kelola status pengangkutan di berbagai titik TPS yang ditugaskan kepada Anda.</p>

      {list.length === 0 ? (
        <div style={{ background: 'white', padding: '40px', textAlign: 'center', borderRadius: '16px', color: '#6b7280' }}>
          Tidak ada jadwal pengangkutan untuk Anda.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {list.map(j => (
            <div key={j.id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', background: j.status === 'selesai' ? '#d1fae5' : j.status === 'berjalan' ? '#fef3c7' : '#e0e7ff', color: j.status === 'selesai' ? '#059669' : j.status === 'berjalan' ? '#d97706' : '#4f46e5' }}>
                    {j.status.toUpperCase()}
                  </span>
                  <span style={{ fontWeight: 'bold', color: '#374151', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={16} /> {new Date(j.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} • Pukul {j.jam}
                  </span>
                </div>
                
                <h3 style={{ margin: '0 0 4px', fontSize: '1.4rem', color: '#111827' }}>{j.nama_tps}</h3>
                <div style={{ color: '#6b7280', marginBottom: '12px' }}>{j.alamat}</div>
                
                <div style={{ alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#4b5563', background: '#f3f4f6', padding: '8px 12px', borderRadius: '8px', display: 'inline-flex' }}>
                  <Truck size={16} color="#3b82f6" /> {j.nomor_polisi} - {j.jenis_kendaraan}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {j.status === 'menunggu' && (
                  <button onClick={() => updateStatus(j.id, 'berjalan')} style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.2)' }}>
                    Mulai Jalan
                  </button>
                )}
                {j.status === 'berjalan' && (
                  <button onClick={() => updateStatus(j.id, 'selesai')} style={{ padding: '12px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={18} /> Tandai Selesai
                  </button>
                )}
                {j.status === 'selesai' && (
                  <div style={{ color: '#059669', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#ecfdf5', borderRadius: '8px' }}>
                    <CheckCircle size={18} /> Selesai Diangkut
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
