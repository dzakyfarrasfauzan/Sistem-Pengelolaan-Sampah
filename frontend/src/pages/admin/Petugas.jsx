import { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, X, AlertTriangle } from 'lucide-react';
import { API_URL } from '../../config';

export default function Petugas() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ id: null, name: '', username: '', password: '', phone: '', address: '', status: 'aktif' });
  const [isEdit, setIsEdit] = useState(false);
  const [petugasToDelete, setPetugasToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/petugas`, { withCredentials: true });
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
    setFormData({ id: null, name: '', username: '', password: '', phone: '', address: '', status: 'aktif' });
    setIsEdit(false);
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setFormData({ ...item, password: '' }); // clear password, only send if changed
    setIsEdit(true);
    setShowModal(true);
  };

  const confirmDelete = async () => {
    if (!petugasToDelete) return;
    setDeleting(true);
    try {
      await axios.delete(`${API_URL}/admin/petugas/${petugasToDelete.id}`, { withCredentials: true });
      setPetugasToDelete(null);
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
        await axios.put(`${API_URL}/admin/petugas/${formData.id}`, formData, { withCredentials: true });
      } else {
        await axios.post(`${API_URL}/admin/petugas`, formData, { withCredentials: true });
      }
      setShowModal(false);
      fetchData();
    } catch {
      alert('Terjadi kesalahan saat menyimpan data. Pastikan username belum digunakan.');
    }
  };

  const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', boxSizing: 'border-box', marginBottom: '15px' };

  return (
    <div style={{ padding: '40px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, color: '#111827' }}>Kelola Akun Petugas</h1>
        <button onClick={handleOpenAdd} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          <Plus size={18} /> Tambah Petugas
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f9fafb', color: '#4b5563', fontSize: '0.9rem' }}>
              <th style={{ padding: '16px' }}>Nama Petugas</th>
              <th style={{ padding: '16px' }}>Username</th>
              <th style={{ padding: '16px' }}>Kontak</th>
              <th style={{ padding: '16px' }}>Status</th>
              <th style={{ padding: '16px', textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center' }}>Memuat data...</td></tr>
            ) : list.map(item => (
              <tr key={item.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                <td style={{ padding: '16px', fontWeight: 'bold', color: '#111827' }}>{item.name}</td>
                <td style={{ padding: '16px', color: '#4b5563' }}>{item.username}</td>
                <td style={{ padding: '16px' }}>{item.phone}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', background: item.status === 'aktif' ? '#d1fae5' : '#fee2e2', color: item.status === 'aktif' ? '#059669' : '#dc2626' }}>
                    {item.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '16px', textAlign: 'center' }}>
                  <button onClick={() => handleOpenEdit(item)} style={{ background: '#f3f4f6', color: '#3b82f6', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', marginRight: '8px' }}><Edit2 size={16} /></button>
                  <button onClick={() => setPetugasToDelete(item)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{isEdit ? 'Edit Petugas' : 'Tambah Petugas Baru'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>Nama Lengkap</label>
              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={inputStyle} />
              
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>Username (Untuk Login)</label>
              <input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} style={inputStyle} disabled={isEdit} />
              
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>{isEdit ? 'Password Baru (Kosongkan jika tidak diganti)' : 'Password'}</label>
              <input type="password" required={!isEdit} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} style={inputStyle} />
              
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>Nomor HP</label>
              <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={inputStyle} />
              
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>Alamat Domisili</label>
              <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={{...inputStyle, resize: 'vertical'}} />
              
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>Status Akun</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} style={inputStyle}>
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
              </select>

              <button type="submit" style={{ width: '100%', padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
                Simpan Data
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {petugasToDelete && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '360px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertTriangle size={28} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: '800' }}>Hapus Akun Petugas?</h3>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '24px', lineHeight: '1.5' }}>
              Apakah Anda yakin ingin menghapus petugas <strong>{petugasToDelete.name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setPetugasToDelete(null)} style={{ flex: 1, padding: '10px', border: '1px solid #e5e7eb', background: 'white', color: '#4b5563', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                Batal
              </button>
              <button onClick={confirmDelete} disabled={deleting} style={{ flex: 1, padding: '10px', border: 'none', background: '#dc2626', color: 'white', borderRadius: '8px', fontWeight: '700', cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
