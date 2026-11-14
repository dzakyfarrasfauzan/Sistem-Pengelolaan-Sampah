import { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, X, AlertTriangle } from 'lucide-react';
import { KotakCari, Lencana, RingkasanAngka } from '../../components/Ui';
import { API_URL } from '../../config';

export default function TPS() {
  const [tpsList, setTpsList] = useState([]);
  const [cari, setCari] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ id: null, nama_tps: '', alamat: '', kapasitas: '', status: 'aktif' });
  const [isEdit, setIsEdit] = useState(false);
  const [tpsToDelete, setTpsToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTPS = async () => {
    try {
      setErrorMsg('');
      const res = await axios.get(`${API_URL}/admin/tps`, { withCredentials: true });
      if (res.data.success) {
        setTpsList(res.data.data);
      } else {
        setErrorMsg('Data tidak ditemukan atau akses ditolak');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || err.message || 'Gagal memuat data dari server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      await fetchTPS();
    };
    load();
  }, []);

  const handleOpenAdd = () => {
    setFormData({ id: null, nama_tps: '', alamat: '', kapasitas: '', status: 'aktif' });
    setIsEdit(false);
    setShowModal(true);
  };

  const handleOpenEdit = (tps) => {
    setFormData(tps);
    setIsEdit(true);
    setShowModal(true);
  };

  const confirmDelete = async () => {
    console.log("confirmDelete clicked! tpsToDelete:", tpsToDelete);
    if (!tpsToDelete) {
      console.log("tpsToDelete is falsy, returning early");
      return;
    }
    setDeleting(true);
    try {
      console.log("Sending DELETE request for ID:", tpsToDelete.id);
      const res = await axios.delete(`${API_URL}/admin/tps/${tpsToDelete.id}`, { withCredentials: true });
      console.log("DELETE response:", res.data);
      setTpsToDelete(null);
      fetchTPS();
    } catch (err) {
      console.error("DELETE request failed:", err);
      alert('Gagal menghapus data');
    } finally {
      console.log("Finishing confirmDelete");
      setDeleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await axios.put(`${API_URL}/admin/tps/${formData.id}`, formData, { withCredentials: true });
      } else {
        await axios.post(`${API_URL}/admin/tps`, formData, { withCredentials: true });
      }
      setShowModal(false);
      fetchTPS();
    } catch {
      alert('Terjadi kesalahan saat menyimpan data');
    }
  };

  const inputStyle = { width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box', marginBottom: '15px' };

  return (
    <div style={{ padding: '40px', fontFamily: 'inherit' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '18px', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, color: '#1f2933' }}>Data TPS</h1>
          <p style={{ margin: '4px 0 0', color: '#5b6673', fontSize: '0.92rem' }}>Tempat penampungan sementara yang dilewati jalur layanan Korwil.</p>
        </div>
        <button onClick={handleOpenAdd} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#1f6b47', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          <Plus size={18} /> Tambah TPS
        </button>
      </div>

      {errorMsg && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '15px', borderRadius: '4px', marginBottom: '20px', fontWeight: 'bold' }}>
          Error: {errorMsg}
        </div>
      )}

      <RingkasanAngka data={[
        { label: 'Total TPS/TPA', nilai: tpsList.length },
        { label: 'Aktif', nilai: tpsList.filter(t => t.status === 'aktif').length, warna: '#2f8a5b' },
        { label: 'Nonaktif', nilai: tpsList.filter(t => t.status !== 'aktif').length, warna: '#8a939d' },
      ]} />
      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <KotakCari nilai={cari} onUbah={setCari} petunjuk="Cari nama TPS atau alamat..." />
      </div>
      <div style={{ background: 'white', border: '1px solid #e1e5e9', borderRadius: '10px', boxShadow: '0 1px 2px rgba(16,24,40,0.06)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f7f8f9', color: '#4b5563', fontSize: '0.9rem' }}>
              <th style={{ padding: '16px' }}>Nama TPS</th>
              <th style={{ padding: '16px' }}>Alamat</th>
              <th style={{ padding: '16px' }}>Kapasitas</th>
              <th style={{ padding: '16px' }}>Status</th>
              <th style={{ padding: '16px', textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center' }}>Memuat data...</td></tr>
            ) : tpsList.filter(t => `${t.nama_tps} ${t.alamat}`.toLowerCase().includes(cari.toLowerCase())).map(tps => (
              <tr key={tps.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                <td style={{ padding: '16px', fontWeight: '500', color: '#1f2933' }}>{tps.nama_tps}</td>
                <td style={{ padding: '16px', color: '#5b6673' }}>{tps.alamat}</td>
                <td style={{ padding: '16px' }}>{tps.kapasitas}</td>
                <td style={{ padding: '16px' }}>
                  <Lencana nilai={tps.status} />
                </td>
                <td style={{ padding: '16px', textAlign: 'center' }}>
                  <button onClick={() => handleOpenEdit(tps)} style={{ background: '#f3f4f6', color: '#3b82f6', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', marginRight: '8px' }}><Edit2 size={16} /></button>
                  <button onClick={() => setTpsToDelete(tps)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', padding: '30px', border: '1px solid #e1e5e9', borderRadius: '10px', width: '100%', maxWidth: '400px', boxShadow: '0 1px 2px rgba(16,24,40,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{isEdit ? 'Edit TPS' : 'Tambah TPS Baru'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5b6673' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>Nama TPS</label>
              <input required value={formData.nama_tps} onChange={e => setFormData({...formData, nama_tps: e.target.value})} style={inputStyle} />
              
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>Alamat</label>
              <textarea required value={formData.alamat} onChange={e => setFormData({...formData, alamat: e.target.value})} style={{...inputStyle, resize: 'vertical'}} />
              
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>Kapasitas (Contoh: 10 Ton)</label>
              <input value={formData.kapasitas} onChange={e => setFormData({...formData, kapasitas: e.target.value})} style={inputStyle} />
              
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} style={inputStyle}>
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
              </select>

              <button type="submit" style={{ width: '100%', padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
                Simpan Data
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {tpsToDelete && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '30px', border: '1px solid #e1e5e9', borderRadius: '10px', width: '100%', maxWidth: '360px', boxShadow: '0 1px 2px rgba(16,24,40,0.06)', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertTriangle size={28} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: '700' }}>Hapus TPS?</h3>
            <p style={{ color: '#5b6673', fontSize: '0.85rem', marginBottom: '24px', lineHeight: '1.5' }}>
              Apakah Anda yakin ingin menghapus TPS <strong>{tpsToDelete.nama_tps}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setTpsToDelete(null)} style={{ flex: 1, padding: '10px', border: '1px solid #d8dde3', background: 'white', color: '#4b5563', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                Batal
              </button>
              <button onClick={confirmDelete} disabled={deleting} style={{ flex: 1, padding: '10px', border: 'none', background: '#dc2626', color: 'white', borderRadius: '4px', fontWeight: '700', cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
