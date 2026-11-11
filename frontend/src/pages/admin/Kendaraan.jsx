import { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, X, AlertTriangle } from 'lucide-react';
import { API_URL } from '../../config';

export default function Kendaraan() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ id: null, nomor_polisi: '', jenis_kendaraan: '', kapasitas_angkut: '', kondisi: 'baik', status_penggunaan: 'tersedia' });
  const [isEdit, setIsEdit] = useState(false);
  const [kendaraanToDelete, setKendaraanToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/kendaraan`, { withCredentials: true });
      if (res.data.success) {
        setList(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      await fetchData();
    };
    load();
  }, []);

  const handleOpenAdd = () => {
    setFormData({ id: null, nomor_polisi: '', jenis_kendaraan: '', kapasitas_angkut: '', kondisi: 'baik', status_penggunaan: 'tersedia' });
    setIsEdit(false);
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setFormData(item);
    setIsEdit(true);
    setShowModal(true);
  };

  const confirmDelete = async () => {
    if (!kendaraanToDelete) return;
    setDeleting(true);
    try {
      await axios.delete(`${API_URL}/admin/kendaraan/${kendaraanToDelete.id}`, { withCredentials: true });
      setKendaraanToDelete(null);
      fetchData();
    } catch {
      alert('Gagal menghapus data');
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await axios.put(`${API_URL}/admin/kendaraan/${formData.id}`, formData, { withCredentials: true });
      } else {
        await axios.post(`${API_URL}/admin/kendaraan`, formData, { withCredentials: true });
      }
      setShowModal(false);
      fetchData();
    } catch {
      alert('Terjadi kesalahan saat menyimpan data');
    }
  };

  const inputStyle = { width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box', marginBottom: '15px' };

  return (
    <div style={{ padding: '40px', fontFamily: 'inherit' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, color: '#1f2933' }}>Kelola Data Kendaraan</h1>
        <button onClick={handleOpenAdd} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#1f6b47', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          <Plus size={18} /> Tambah Kendaraan
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: '6px', boxShadow: '0 1px 2px rgba(16,24,40,0.06)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f7f8f9', color: '#4b5563', fontSize: '0.9rem' }}>
              <th style={{ padding: '16px' }}>Nomor Polisi</th>
              <th style={{ padding: '16px' }}>Jenis Kendaraan</th>
              <th style={{ padding: '16px' }}>Kapasitas</th>
              <th style={{ padding: '16px' }}>Kondisi</th>
              <th style={{ padding: '16px' }}>Status</th>
              <th style={{ padding: '16px', textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center' }}>Memuat data...</td></tr>
            ) : list.map(item => (
              <tr key={item.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                <td style={{ padding: '16px', fontWeight: 'bold', color: '#1f2933' }}>{item.nomor_polisi}</td>
                <td style={{ padding: '16px', color: '#4b5563' }}>{item.jenis_kendaraan}</td>
                <td style={{ padding: '16px' }}>{item.kapasitas_angkut}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', background: item.kondisi === 'baik' ? '#e7f1eb' : '#fee2e2', color: item.kondisi === 'baik' ? '#1f6b47' : '#dc2626' }}>
                    {item.kondisi.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', background: item.status_penggunaan === 'tersedia' ? '#dbeafe' : '#fef3c7', color: item.status_penggunaan === 'tersedia' ? '#2563eb' : '#d97706' }}>
                    {item.status_penggunaan.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '16px', textAlign: 'center' }}>
                  <button onClick={() => handleOpenEdit(item)} style={{ background: '#f3f4f6', color: '#3b82f6', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', marginRight: '8px' }}><Edit2 size={16} /></button>
                  <button onClick={() => setKendaraanToDelete(item)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '6px', width: '100%', maxWidth: '400px', boxShadow: '0 1px 2px rgba(16,24,40,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{isEdit ? 'Edit Kendaraan' : 'Tambah Kendaraan'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5b6673' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>Nomor Polisi</label>
              <input required value={formData.nomor_polisi} onChange={e => setFormData({...formData, nomor_polisi: e.target.value})} style={inputStyle} placeholder="B 1234 CD" />
              
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>Jenis Kendaraan</label>
              <input required value={formData.jenis_kendaraan} onChange={e => setFormData({...formData, jenis_kendaraan: e.target.value})} style={inputStyle} placeholder="Truk Dump" />
              
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>Kapasitas Angkut</label>
              <input value={formData.kapasitas_angkut} onChange={e => setFormData({...formData, kapasitas_angkut: e.target.value})} style={inputStyle} placeholder="5 Ton" />
              
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>Kondisi</label>
                  <select value={formData.kondisi} onChange={e => setFormData({...formData, kondisi: e.target.value})} style={inputStyle}>
                    <option value="baik">Baik</option>
                    <option value="rusak ringan">Rusak Ringan</option>
                    <option value="rusak berat">Rusak Berat</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>Status</label>
                  <select value={formData.status_penggunaan} onChange={e => setFormData({...formData, status_penggunaan: e.target.value})} style={inputStyle}>
                    <option value="tersedia">Tersedia</option>
                    <option value="digunakan">Digunakan</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <button type="submit" style={{ width: '100%', padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
                Simpan Data
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {kendaraanToDelete && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '6px', width: '100%', maxWidth: '360px', boxShadow: '0 1px 2px rgba(16,24,40,0.06)', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertTriangle size={28} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: '700' }}>Hapus Kendaraan?</h3>
            <p style={{ color: '#5b6673', fontSize: '0.85rem', marginBottom: '24px', lineHeight: '1.5' }}>
              Apakah Anda yakin ingin menghapus Kendaraan <strong>{kendaraanToDelete.nomor_polisi}</strong> ({kendaraanToDelete.jenis_kendaraan})? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setKendaraanToDelete(null)} style={{ flex: 1, padding: '10px', border: '1px solid #d8dde3', background: 'white', color: '#4b5563', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
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
