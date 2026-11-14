import { useEffect, useState } from 'react';
import axios from 'axios';
import { X, AlertTriangle, Star } from 'lucide-react';
import { API_URL } from '../../config';
import { formatUmur } from '../../utils/format';

const STATUS = {
  masuk: ['#f3f4f6', '#4b5563', 'Masuk'],
  diproses: ['#eff6ff', '#2563eb', 'Diproses'],
  selesai: ['#e7f1eb', '#1f6b47', 'Selesai'],
};
const waktu = (t) => (t ? new Date(t.replace(' ', 'T') + 'Z').toLocaleString('id-ID') : '-');

// Pemantauan laporan masyarakat oleh pengawas bidang (hanya melihat dan menegur)
export default function PengawasLaporan() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('semua');
  const [dipilih, setDipilih] = useState(null);
  const [teguran, setTeguran] = useState('');
  const [menyimpan, setMenyimpan] = useState(false);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/pengawas/laporan`, { withCredentials: true });
      if (res.data.success) setList(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => { await fetchData(); };
    load();
  }, []);

  const buka = (l) => { setDipilih(l); setTeguran(l.teguran_pengawas || ''); };

  const kirimTeguran = async (isi) => {
    setMenyimpan(true);
    try {
      const res = await axios.put(`${API_URL}/pengawas/laporan/${dipilih.id}/teguran`, { teguran: isi }, { withCredentials: true });
      alert(res.data.message);
      setDipilih(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan teguran');
    } finally {
      setMenyimpan(false);
    }
  };

  const tampil = list.filter(l =>
    filter === 'semua' ? true : filter === 'terlambat' ? l.terlambat === 1 : l.status === filter);

  if (loading) return <div style={{ padding: '40px' }}>Memuat data...</div>;

  return (
    <div style={{ padding: '40px', fontFamily: 'inherit' }}>
      <h1 style={{ margin: '0 0 6px', color: '#1f2933' }}>Pemantauan Laporan Masyarakat</h1>
      <p style={{ margin: '0 0 20px', color: '#5b6673' }}>Laporan yang belum selesai lebih dari 2 hari ditandai terlambat. Beri teguran agar admin Korwil segera menindaklanjuti.</p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {[['semua', 'Semua'], ['terlambat', 'Terlambat'], ['masuk', 'Masuk'], ['diproses', 'Diproses'], ['selesai', 'Selesai']].map(([v, t]) => (
          <button key={v} onClick={() => setFilter(v)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', cursor: 'pointer', fontWeight: '600', background: filter === v ? (v === 'terlambat' ? '#dc2626' : '#1f2933') : 'white', color: filter === v ? 'white' : '#374151' }}>
            {t} ({list.filter(l => v === 'semua' ? true : v === 'terlambat' ? l.terlambat === 1 : l.status === v).length})
          </button>
        ))}
      </div>

      <div style={{ background: 'white', border: '1px solid #e1e5e9', borderRadius: '10px', boxShadow: '0 1px 2px rgba(16,24,40,0.06)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '820px' }}>
          <thead>
            <tr style={{ background: '#f7f8f9', color: '#4b5563', fontSize: '0.88rem' }}>
              <th style={{ padding: '14px' }}>Kode & Waktu Masuk</th>
              <th style={{ padding: '14px' }}>Lokasi</th>
              <th style={{ padding: '14px' }}>Prioritas</th>
              <th style={{ padding: '14px' }}>Status</th>
              <th style={{ padding: '14px' }}>Ditangani Oleh</th>
              <th style={{ padding: '14px' }}>Lama</th>
              <th style={{ padding: '14px' }}>Penilaian</th>
              <th style={{ padding: '14px' }}></th>
            </tr>
          </thead>
          <tbody>
            {tampil.length === 0 ? (
              <tr><td colSpan="8" style={{ padding: '20px', textAlign: 'center', color: '#8a939d' }}>Tidak ada laporan</td></tr>
            ) : tampil.map(l => {
              const [bg, fg, label] = STATUS[l.status] || STATUS.masuk;
              return (
                <tr key={l.id} style={{ borderTop: '1px solid #f3f4f6', background: l.terlambat ? '#fef2f2' : 'white' }}>
                  <td style={{ padding: '14px' }}>
                    <div style={{ fontWeight: 700, color: '#1f2933' }}>{l.kode_laporan}</div>
                    <div style={{ fontSize: '0.78rem', color: '#5b6673' }}>{waktu(l.created_at)}</div>
                  </td>
                  <td style={{ padding: '14px', fontSize: '0.85rem', color: '#374151', maxWidth: '220px' }}>{l.alamat_lokasi || '-'}</td>
                  <td style={{ padding: '14px', fontSize: '0.85rem', textTransform: 'capitalize' }}>{l.prioritas || <span style={{ color: '#8a939d' }}>Belum</span>}</td>
                  <td style={{ padding: '14px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, background: bg, color: fg }}>{label}</span>
                    {l.terlambat === 1 && <div style={{ marginTop: '6px', fontSize: '0.72rem', fontWeight: 700, color: '#dc2626' }}>TERLAMBAT</div>}
                  </td>
                  <td style={{ padding: '14px', fontSize: '0.85rem' }}>{l.nama_petugas || <span style={{ color: '#8a939d' }}>Belum dijadwalkan</span>}</td>
                  <td style={{ padding: '14px', fontSize: '0.85rem' }}>{formatUmur(l.umur_jam)}</td>
                  <td style={{ padding: '14px', color: '#d97706' }}>{l.rating ? '★'.repeat(l.rating) + '☆'.repeat(5 - l.rating) : <span style={{ color: '#8a939d', fontSize: '0.8rem' }}>-</span>}</td>
                  <td style={{ padding: '14px' }}>
                    <button onClick={() => buka(l)} style={{ padding: '6px 12px', background: l.terlambat ? '#dc2626' : '#f3f4f6', color: l.terlambat ? 'white' : '#374151', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>
                      Detail
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {dipilih && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', border: '1px solid #e1e5e9', borderRadius: '10px', padding: '26px', width: '100%', maxWidth: '520px', margin: '16px', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>{dipilih.kode_laporan}</h3>
              <button onClick={() => setDipilih(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a939d' }}><X size={20} /></button>
            </div>
            {dipilih.foto && <img src={`${API_URL}/uploads/${dipilih.foto}`} alt="Foto laporan" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '6px', marginBottom: '12px' }} />}
            <div style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.7 }}>
              <div><strong>Deskripsi:</strong> {dipilih.deskripsi}</div>
              <div><strong>Lokasi:</strong> {dipilih.alamat_lokasi || '-'}</div>
              <div><strong>Masuk:</strong> {waktu(dipilih.created_at)}</div>
              <div><strong>Status:</strong> {dipilih.status} ({formatUmur(dipilih.umur_jam)})</div>
              <div><strong>Ditangani oleh:</strong> {dipilih.nama_petugas || 'Belum dijadwalkan'}</div>
              {dipilih.catatan_tindak_lanjut && <div><strong>Tindak lanjut:</strong> {dipilih.catatan_tindak_lanjut}</div>}
            </div>
            {dipilih.foto_tindak_lanjut && <img src={`${API_URL}/uploads/${dipilih.foto_tindak_lanjut}`} alt="Foto penanganan" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '6px', marginTop: '12px' }} />}
            {dipilih.rating && (
              <div style={{ marginTop: '12px', padding: '12px', background: '#fffbeb', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#92400e' }}><Star size={16} /> Penilaian pelapor: {dipilih.rating} / 5</div>
                {dipilih.ulasan && <div style={{ fontSize: '0.85rem', marginTop: '4px', fontStyle: 'italic' }}>"{dipilih.ulasan}"</div>}
              </div>
            )}

            {dipilih.status !== 'selesai' && (
              <div style={{ marginTop: '18px', borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#991b1b', marginBottom: '8px' }}>
                  <AlertTriangle size={16} /> Teguran untuk Admin Korwil
                </label>
                <textarea rows={3} value={teguran} onChange={e => setTeguran(e.target.value)} placeholder="Contoh: Laporan sudah 3 hari belum ditangani, mohon segera ditindaklanjuti."
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1.5px solid #fecaca', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  {dipilih.teguran_pengawas && (
                    <button disabled={menyimpan} onClick={() => kirimTeguran('')} style={{ flex: 1, padding: '10px', border: '1px solid #d8dde3', background: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Hapus Teguran</button>
                  )}
                  <button disabled={menyimpan || !teguran.trim()} onClick={() => kirimTeguran(teguran)} style={{ flex: 2, padding: '10px', border: 'none', background: '#dc2626', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, opacity: !teguran.trim() ? 0.6 : 1 }}>
                    {menyimpan ? 'Menyimpan...' : 'Kirim Teguran'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
