import { useEffect, useState } from 'react';
import axios from 'axios';
import { ClipboardCheck } from 'lucide-react';
import { API_URL } from '../../config';

const warnaKondisi = (k) => k === 'baik' ? ['#e7f1eb', '#1f6b47'] : k === 'rusak ringan' ? ['#fef3c7', '#d97706'] : ['#fee2e2', '#dc2626'];

// Riwayat pemeriksaan kesiapan armada yang dikirim sopir
export default function PemeriksaanKendaraan() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('semua');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API_URL}/admin/pemeriksaan-kendaraan`, { withCredentials: true });
        if (res.data.success) setList(res.data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const tampil = filter === 'semua' ? list : list.filter(p => filter === 'bermasalah' ? p.kondisi !== 'baik' : p.kondisi === 'baik');
  const th = { padding: '16px' };

  return (
    <div style={{ padding: '40px', fontFamily: 'inherit' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ margin: 0, color: '#1f2933', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ClipboardCheck size={28} color="#1f6b47" /> Pemeriksaan Armada
        </h1>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #d1d5db' }}>
          <option value="semua">Semua kondisi</option>
          <option value="bermasalah">Perlu perbaikan</option>
          <option value="baik">Kondisi baik</option>
        </select>
      </div>
      <p style={{ color: '#5b6673', margin: '0 0 24px' }}>Hasil pemeriksaan kendaraan oleh sopir sebelum berangkat dan sesudah pulang dari TPA. Kondisi kendaraan pada menu Kendaraan diperbarui otomatis dari pemeriksaan terakhir.</p>

      <div style={{ background: 'white', borderRadius: '6px', boxShadow: '0 1px 2px rgba(16,24,40,0.06)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f7f8f9', color: '#4b5563', fontSize: '0.9rem' }}>
              <th style={th}>Waktu Pemeriksaan</th>
              <th style={th}>Kendaraan</th>
              <th style={th}>Sopir</th>
              <th style={th}>Jadwal</th>
              <th style={th}>Jenis</th>
              <th style={th}>Kondisi</th>
              <th style={th}>Catatan</th>
              <th style={th}>Foto</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ padding: '20px', textAlign: 'center' }}>Memuat data...</td></tr>
            ) : tampil.length === 0 ? (
              <tr><td colSpan="8" style={{ padding: '20px', textAlign: 'center', color: '#8a939d' }}>Belum ada data pemeriksaan.</td></tr>
            ) : tampil.map(p => {
              const [bg, fg] = warnaKondisi(p.kondisi);
              return (
                <tr key={p.id} style={{ borderTop: '1px solid #f3f4f6', fontSize: '0.9rem' }}>
                  <td style={th}>{p.created_at}</td>
                  <td style={th}><div style={{ fontWeight: 600 }}>{p.nomor_polisi}</div><div style={{ fontSize: '0.8rem', color: '#5b6673' }}>{p.jenis_kendaraan}</div></td>
                  <td style={th}>{p.sopir_name || '-'}</td>
                  <td style={th}><div>{p.lokasi_tampil || '-'}</div><div style={{ fontSize: '0.8rem', color: '#5b6673' }}>{p.tanggal} {p.jam}</div></td>
                  <td style={{ ...th, textTransform: 'capitalize' }}>{p.jenis}</td>
                  <td style={th}><span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', background: bg, color: fg }}>{p.kondisi.toUpperCase()}</span></td>
                  <td style={{ ...th, color: '#4b5563', maxWidth: '220px' }}>{p.catatan || '-'}</td>
                  <td style={th}>
                    <a href={`${API_URL}/uploads/${p.foto}`} target="_blank" rel="noopener noreferrer">
                      <img src={`${API_URL}/uploads/${p.foto}`} alt="Foto kendaraan" style={{ width: '64px', height: '48px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #d8dde3' }} />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
