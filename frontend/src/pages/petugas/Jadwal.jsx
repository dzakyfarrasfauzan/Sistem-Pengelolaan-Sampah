import { useEffect, useState } from 'react';
import axios from 'axios';
import { Truck, CheckCircle, Clock, X, Camera } from 'lucide-react';
import { API_URL } from '../../config';
import KameraLangsung from '../../components/KameraLangsung';

export default function Jadwal() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selesaiModal, setSelesaiModal] = useState(null); // jadwal yang akan ditandai selesai
  const [catatan, setCatatan] = useState('');
  const [fotoFile, setFotoFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
      const fd = new FormData();
      fd.append('status', newStatus);
      await axios.put(`${API_URL}/petugas/jadwal/${id}/status`, fd, { withCredentials: true });
      fetchData();
    } catch (err) {
      alert('Gagal memperbarui status: ' + (err.response?.data?.message || err.message));
    }
  };

  const openSelesai = (jadwal) => {
    setSelesaiModal(jadwal);
    setCatatan('');
    setFotoFile(null);
  };

  const submitSelesai = async (e) => {
    e.preventDefault();
    if (!fotoFile) {
      alert('Foto kegiatan pengangkutan wajib diunggah');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('status', 'selesai');
      fd.append('catatan', catatan);
      fd.append('foto', fotoFile);
      await axios.put(`${API_URL}/petugas/jadwal/${selesaiModal.id}/status`, fd, { withCredentials: true });
      setSelesaiModal(null);
      fetchData();
    } catch (err) {
      alert('Gagal memperbarui status: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
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
                {j.sopir_name && (
                  <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '8px' }}>Sopir: {j.sopir_name}</div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {j.status === 'menunggu' && j.sopir_id && !j.kondisi_berangkat && (
                  <div style={{ maxWidth: '200px', fontSize: '0.82rem', color: '#d97706', background: '#fffbeb', padding: '10px 12px', borderRadius: '8px', textAlign: 'center' }}>
                    Menunggu sopir memeriksa kesiapan armada
                  </div>
                )}
                {j.status === 'menunggu' && j.kondisi_berangkat === 'rusak berat' && (
                  <div style={{ maxWidth: '200px', fontSize: '0.82rem', color: '#dc2626', background: '#fee2e2', padding: '10px 12px', borderRadius: '8px', textAlign: 'center' }}>
                    Armada rusak berat, hubungi admin
                  </div>
                )}
                {j.status === 'menunggu' && (!j.sopir_id || (j.kondisi_berangkat && j.kondisi_berangkat !== 'rusak berat')) && (
                  <button onClick={() => updateStatus(j.id, 'berjalan')} style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.2)' }}>
                    Mulai Jalan
                  </button>
                )}
                {j.status === 'berjalan' && (
                  <button onClick={() => openSelesai(j)} style={{ padding: '12px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={18} /> Tandai Selesai
                  </button>
                )}
                {j.status === 'selesai' && (
                  <div style={{ color: '#059669', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#ecfdf5', borderRadius: '8px' }}>
                    <CheckCircle size={18} /> Selesai Diangkut
                  </div>
                )}
                {j.foto_kegiatan && (
                  <a href={`${API_URL}/uploads/${j.foto_kegiatan}`} target="_blank" rel="noopener noreferrer"
                     style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#2563eb', fontWeight: '600', textDecoration: 'none', justifyContent: 'center' }}>
                    <Camera size={16} /> Lihat foto kegiatan
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tandai Selesai + Foto Kegiatan */}
      {selesaiModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '460px', margin: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#111827' }}>Tandai Pengangkutan Selesai</h3>
              <button onClick={() => setSelesaiModal(null)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 20px' }}>{selesaiModal.nama_tps} — {selesaiModal.nomor_polisi}</p>
            <form onSubmit={submitSelesai} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>
                  Foto Kegiatan <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <KameraLangsung onCapture={f => setFotoFile(f)} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>
                  Catatan Penyelesaian <span style={{ color: '#9ca3af', fontWeight: '400' }}>(opsional)</span>
                </label>
                <textarea rows={3} value={catatan} onChange={e => setCatatan(e.target.value)} placeholder="Contoh: Sampah TPS sudah diangkut seluruhnya"
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #e5e7eb', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setSelesaiModal(null)} style={{ flex: 1, padding: '12px', border: '1px solid #e5e7eb', background: 'white', color: '#4b5563', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={submitting} style={{ flex: 2, padding: '12px', border: 'none', background: 'linear-gradient(135deg, #059669, #047857)', color: 'white', borderRadius: '10px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Menyimpan...' : 'Simpan & Tandai Selesai'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
