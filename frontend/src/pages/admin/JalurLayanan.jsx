import { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { KotakCari, Lencana, RingkasanAngka } from '../../components/Ui';
import { API_URL } from '../../config';

// Jalur layanan: rute pengangkutan yang melewati beberapa titik, desa, dan TPS
const KOSONG = { id: null, nama_jalur: '', alamat_pelayanan: '', desa: '', kecamatan: '', jarak_km: '', estimasi_tonase: '', status: 'aktif', tps_ids: [] };

export default function JalurLayanan() {
  const [list, setList] = useState([]);
  const [tpsList, setTpsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [cari, setCari] = useState('');

  const muat = async () => {
    try {
      const [jRes, tRes] = await Promise.all([
        axios.get(`${API_URL}/admin/jalur`, { withCredentials: true }),
        axios.get(`${API_URL}/admin/tps`, { withCredentials: true }),
      ]);
      if (jRes.data.success) setList(jRes.data.data);
      if (tRes.data.success) setTpsList(tRes.data.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };
  useEffect(() => {
    const load = async () => { await muat(); };
    load();
  }, []);

  const bukaEdit = (j) => setForm({
    ...KOSONG, ...j,
    jarak_km: j.jarak_km ?? '', estimasi_tonase: j.estimasi_tonase ?? '',
    alamat_pelayanan: j.alamat_pelayanan || '', desa: j.desa || '', kecamatan: j.kecamatan || '',
    tps_ids: j.tps_ids ? String(j.tps_ids).split(',').map(Number) : [],
  });

  const toggleTps = (id) => setForm(f => ({ ...f, tps_ids: f.tps_ids.includes(id) ? f.tps_ids.filter(x => x !== id) : [...f.tps_ids, id] }));

  const simpan = async (e) => {
    e.preventDefault();
    try {
      if (form.id) await axios.put(`${API_URL}/admin/jalur/${form.id}`, form, { withCredentials: true });
      else await axios.post(`${API_URL}/admin/jalur`, form, { withCredentials: true });
      setForm(null); muat();
    } catch (err) { alert(err.response?.data?.message || 'Gagal menyimpan jalur'); }
  };

  const hapus = async (j) => {
    if (!window.confirm(`Hapus ${j.nama_jalur}?`)) return;
    try { await axios.delete(`${API_URL}/admin/jalur/${j.id}`, { withCredentials: true }); muat(); }
    catch (err) { alert(err.response?.data?.message || 'Gagal menghapus jalur'); }
  };

  const input = { width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box', marginBottom: '14px', fontFamily: 'inherit' };
  const label = { display: 'block', marginBottom: '5px', fontWeight: 500, fontSize: '0.9rem' };
  const th = { padding: '14px 16px' };

  return (
    <div style={{ padding: '40px', fontFamily: 'inherit' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '12px', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, color: '#1f2933' }}>Jalur Layanan</h1>
        <button onClick={() => setForm({ ...KOSONG })} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#1f6b47', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          <Plus size={18} /> Tambah Jalur
        </button>
      </div>
      <p style={{ color: '#5b6673', margin: '0 0 18px', fontSize: '0.92rem' }}>Rute pengangkutan yang dilalui satu armada dalam sehari, beserta titik, desa, dan TPS yang dilayani.</p>
      <RingkasanAngka data={[
        { label: 'Total jalur', nilai: list.length },
        { label: 'Aktif', nilai: list.filter(j => j.status === 'aktif').length, warna: '#2f8a5b' },
        { label: 'Jadwal rutin / minggu', nilai: list.reduce((a, j) => a + (j.jumlah_rutin || 0), 0), warna: '#3b6ea8' },
      ]} />
      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <KotakCari nilai={cari} onUbah={setCari} petunjuk="Cari jalur, desa, atau kecamatan..." />
      </div>

      <div style={{ background: 'white', border: '1px solid #e1e5e9', borderRadius: '10px', boxShadow: '0 1px 2px rgba(16,24,40,0.06)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '820px' }}>
          <thead>
            <tr style={{ background: '#f7f8f9', color: '#4b5563', fontSize: '0.9rem' }}>
              <th style={th}>Jalur</th><th style={th}>Desa / Kecamatan</th><th style={th}>TPS Dilewati</th>
              <th style={th}>Jarak • Tonase</th><th style={th}>Status</th><th style={{ ...th, textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center' }}>Memuat data...</td></tr>
              : list.length === 0 ? <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#5b6673' }}>Belum ada jalur layanan</td></tr>
              : list.filter(j => `${j.nama_jalur} ${j.desa || ''} ${j.kecamatan || ''} ${j.alamat_pelayanan || ''}`.toLowerCase().includes(cari.toLowerCase())).map(j => (
                <tr key={j.id} style={{ borderTop: '1px solid #f3f4f6', verticalAlign: 'top' }}>
                  <td style={th}>
                    <div style={{ fontWeight: 700, color: '#1f2933' }}>{j.nama_jalur}</div>
                    <div style={{ fontSize: '0.82rem', color: '#5b6673', maxWidth: '280px' }}>{j.alamat_pelayanan || '-'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#1d4f73', marginTop: '4px' }}>{j.jumlah_rutin} jadwal rutin</div>
                  </td>
                  <td style={{ ...th, fontSize: '0.85rem', color: '#374151', maxWidth: '240px' }}>
                    <div>{j.desa || '-'}</div><div style={{ color: '#5b6673' }}>{j.kecamatan || ''}</div>
                  </td>
                  <td style={{ ...th, fontSize: '0.85rem', color: '#374151', maxWidth: '220px' }}>{j.tps_names || '-'}</td>
                  <td style={{ ...th, fontSize: '0.85rem', color: '#374151', whiteSpace: 'nowrap' }}>
                    {j.jarak_km ? `${j.jarak_km} km` : '-'} • {j.estimasi_tonase ? `${j.estimasi_tonase} ton` : '-'}
                  </td>
                  <td style={th}>
                    <Lencana nilai={j.status} />
                  </td>
                  <td style={{ ...th, textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <button onClick={() => bukaEdit(j)} style={{ background: '#f3f4f6', color: '#3b82f6', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', marginRight: '8px' }}><Edit2 size={16} /></button>
                    <button onClick={() => hapus(j)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {form && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', padding: '28px', border: '1px solid #e1e5e9', borderRadius: '10px', width: '100%', maxWidth: '560px', margin: '16px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{form.id ? 'Edit Jalur Layanan' : 'Tambah Jalur Layanan'}</h2>
              <button onClick={() => setForm(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5b6673' }}><X size={20} /></button>
            </div>
            <form onSubmit={simpan}>
              <label style={label}>Nama Jalur</label>
              <input required placeholder="contoh: Jalur Ujunggenteng" value={form.nama_jalur} onChange={e => setForm({ ...form, nama_jalur: e.target.value })} style={input} />
              <label style={label}>Alamat Pelayanan (jalan / titik yang dilewati)</label>
              <textarea rows={2} placeholder="contoh: Jalur Pantai Cibuaya, Pantai Ujunggenteng" value={form.alamat_pelayanan} onChange={e => setForm({ ...form, alamat_pelayanan: e.target.value })} style={{ ...input, resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={label}>Desa</label>
                  <input placeholder="Desa Ciracap, Desa Ujunggenteng" value={form.desa} onChange={e => setForm({ ...form, desa: e.target.value })} style={input} />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={label}>Kecamatan</label>
                  <input placeholder="Kec. Ciracap" value={form.kecamatan} onChange={e => setForm({ ...form, kecamatan: e.target.value })} style={input} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={label}>Jarak (km)</label>
                  <input type="number" min="0" step="any" value={form.jarak_km} onChange={e => setForm({ ...form, jarak_km: e.target.value })} style={input} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={label}>Estimasi Tonase</label>
                  <input type="number" min="0" step="any" value={form.estimasi_tonase} onChange={e => setForm({ ...form, estimasi_tonase: e.target.value })} style={input} />
                </div>
              </div>
              <label style={label}>TPS yang Dilewati ({form.tps_ids.length} dipilih)</label>
              <div style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px 12px', marginBottom: '14px', maxHeight: '160px', overflowY: 'auto' }}>
                {tpsList.length === 0 && <div style={{ fontSize: '0.85rem', color: '#8a939d' }}>Belum ada data TPS</div>}
                {tpsList.map(t => (
                  <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.tps_ids.includes(t.id)} onChange={() => toggleTps(t.id)} />
                    {t.nama_tps} <span style={{ color: '#8a939d', fontSize: '0.8rem' }}>— {t.alamat}</span>
                  </label>
                ))}
              </div>
              <label style={label}>Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={input}>
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
              </select>
              <button type="submit" style={{ width: '100%', padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Simpan Jalur</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
