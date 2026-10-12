import { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, X, AlertTriangle } from 'lucide-react';
import { API_URL } from '../../config';

export default function Jadwal() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Options for dropdowns
  const [tpsList, setTpsList] = useState([]);
  const [kendaraanList, setKendaraanList] = useState([]);
  const [petugasList, setPetugasList] = useState([]);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ id: null, tps_id: '', kendaraan_id: '', petugas_id: '', tanggal: '', jam: '', status: 'menunggu', catatan: '' });
  const [isEdit, setIsEdit] = useState(false);
  const [jadwalToDelete, setJadwalToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/jadwal`, { withCredentials: true });
      if (res.data.success) {
        setList(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [tpsRes, kendRes, petRes] = await Promise.all([
        axios.get(`${API_URL}/admin/tps`, { withCredentials: true }),
        axios.get(`${API_URL}/admin/kendaraan`, { withCredentials: true }),
        axios.get(`${API_URL}/admin/petugas`, { withCredentials: true })
      ]);
      if (tpsRes.data.success) setTpsList(tpsRes.data.data);
      if (kendRes.data.success) setKendaraanList(kendRes.data.data);
      if (petRes.data.success) setPetugasList(petRes.data.data);
    } catch (err) {
      console.error("Gagal memuat opsi form", err);
    }
  };

  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchData(), fetchOptions()]);
    };
    load();
  }, []);

  const handleOpenAdd = () => {
    setFormData({ id: null, tps_id: '', kendaraan_id: '', petugas_id: '', tanggal: '', jam: '', status: 'menunggu', catatan: '' });
    setIsEdit(false);
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setFormData({
      ...item,
      tps_id: item.tps_id || '',
      kendaraan_id: item.kendaraan_id || '',
      petugas_id: item.petugas_id || '',
    });
    setIsEdit(true);
    setShowModal(true);
  };

  const confirmDelete = async () => {
    if (!jadwalToDelete) return;
    setDeleting(true);
    try {
      await axios.delete(`${API_URL}/admin/jadwal/${jadwalToDelete.id}`, { withCredentials: true });
      setJadwalToDelete(null);
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
        await axios.put(`${API_URL}/admin/jadwal/${formData.id}`, formData, { withCredentials: true });
      } else {
        await axios.post(`${API_URL}/admin/jadwal`, formData, { withCredentials: true });
      }
      setShowModal(false);
      fetchData();
    } catch {
      alert('Terjadi kesalahan saat menyimpan data jadwal');
    }
  };

  const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', boxSizing: 'border-box', marginBottom: '15px' };

  return (
    <div style={{ padding: '40px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, color: '#111827' }}>Penjadwalan Pengangkutan</h1>
        <button onClick={handleOpenAdd} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          <Plus size={18} /> Buat Jadwal Baru
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f9fafb', color: '#4b5563', fontSize: '0.9rem' }}>
              <th style={{ padding: '16px' }}>Waktu</th>
              <th style={{ padding: '16px' }}>Lokasi TPS</th>
              <th style={{ padding: '16px' }}>Armada</th>
              <th style={{ padding: '16px' }}>Petugas</th>
              <th style={{ padding: '16px' }}>Status</th>
              <th style={{ padding: '16px', textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center' }}>Memuat data...</td></tr>
            ) : list.map(item => (
              <tr key={item.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                <td style={{ padding: '16px' }}>
                  <div style={{ fontWeight: 'bold', color: '#111827' }}>{item.tanggal}</div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Pukul {item.jam}</div>
                </td>
                <td style={{ padding: '16px', fontWeight: '500', color: '#111827' }}>{item.nama_tps}</td>
                <td style={{ padding: '16px' }}>
                  <div style={{ color: '#111827' }}>{item.nomor_polisi}</div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{item.jenis_kendaraan}</div>
                </td>
                <td style={{ padding: '16px', color: '#4b5563' }}>{item.petugas_name}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', background: item.status === 'selesai' ? '#d1fae5' : item.status === 'berjalan' ? '#fef3c7' : '#e0e7ff', color: item.status === 'selesai' ? '#059669' : item.status === 'berjalan' ? '#d97706' : '#4f46e5' }}>
                    {item.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '16px', textAlign: 'center' }}>
                  <button onClick={() => handleOpenEdit(item)} style={{ background: '#f3f4f6', color: '#3b82f6', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', marginRight: '8px' }}><Edit2 size={16} /></button>
                  <button onClick={() => setJadwalToDelete(item)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{isEdit ? 'Edit Jadwal' : 'Buat Jadwal Baru'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>Tanggal</label>
                  <input type="date" required value={formData.tanggal} onChange={e => setFormData({...formData, tanggal: e.target.value})} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>Jam</label>
                  <input type="time" required value={formData.jam} onChange={e => setFormData({...formData, jam: e.target.value})} style={inputStyle} />
                </div>
              </div>
              
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>Pilih Lokasi TPS</label>
              <select required value={formData.tps_id} onChange={e => setFormData({...formData, tps_id: e.target.value})} style={inputStyle}>
                <option value="" disabled>-- Pilih TPS --</option>
                {tpsList.map(t => <option key={t.id} value={t.id}>{t.nama_tps} - {t.alamat}</option>)}
              </select>

              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>Pilih Kendaraan (Armada)</label>
              <select required value={formData.kendaraan_id} onChange={e => setFormData({...formData, kendaraan_id: e.target.value})} style={inputStyle}>
                <option value="" disabled>-- Pilih Kendaraan --</option>
                {kendaraanList.map(k => <option key={k.id} value={k.id}>{k.nomor_polisi} ({k.jenis_kendaraan})</option>)}
              </select>

              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>Pilih Petugas Lapangan</label>
              <select required value={formData.petugas_id} onChange={e => setFormData({...formData, petugas_id: e.target.value})} style={inputStyle}>
                <option value="" disabled>-- Pilih Petugas --</option>
                {petugasList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} style={inputStyle}>
                <option value="menunggu">Menunggu</option>
                <option value="berjalan">Berjalan</option>
                <option value="selesai">Selesai</option>
                <option value="batal">Batal</option>
              </select>

              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>Catatan Khusus (Opsional)</label>
              <textarea value={formData.catatan} onChange={e => setFormData({...formData, catatan: e.target.value})} style={{...inputStyle, resize: 'vertical', height: '60px'}} />

              <button type="submit" style={{ width: '100%', padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
                Simpan Jadwal
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {jadwalToDelete && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '360px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertTriangle size={28} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: '800' }}>Hapus Jadwal?</h3>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '24px', lineHeight: '1.5' }}>
              Apakah Anda yakin ingin menghapus jadwal pengangkutan untuk TPS <strong>{jadwalToDelete.nama_tps}</strong> pada tanggal <strong>{jadwalToDelete.tanggal}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setJadwalToDelete(null)} style={{ flex: 1, padding: '10px', border: '1px solid #e5e7eb', background: 'white', color: '#4b5563', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
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
