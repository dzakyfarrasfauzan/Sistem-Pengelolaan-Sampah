import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../../config';

const WARNA = { menunggu: ['#e0e7ff', '#4f46e5'], berjalan: ['#fef3c7', '#d97706'], selesai: ['#d1fae5', '#059669'], batal: ['#f3f4f6', '#6b7280'] };

// Jadwal pengangkutan untuk pengawas bidang (hanya dilihat)
export default function PengawasJadwal() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API_URL}/pengawas/jadwal`, { withCredentials: true });
        if (res.data.success) setList(res.data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div style={{ padding: '40px', fontFamily: 'Inter, sans-serif' }}>
      <h1 style={{ margin: '0 0 20px', color: '#111827' }}>Jadwal Pengangkutan</h1>
      <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
          <thead>
            <tr style={{ background: '#f9fafb', color: '#4b5563', fontSize: '0.9rem' }}>
              <th style={{ padding: '14px' }}>Waktu</th><th style={{ padding: '14px' }}>Jalur / Lokasi</th><th style={{ padding: '14px' }}>Armada</th>
              <th style={{ padding: '14px' }}>Sopir &amp; Kru</th><th style={{ padding: '14px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center' }}>Memuat data...</td></tr>
            ) : list.map(j => {
              const [bg, fg] = WARNA[j.status] || WARNA.menunggu;
              return (
                <tr key={j.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px' }}><div style={{ fontWeight: 700 }}>{j.tanggal}</div><div style={{ fontSize: '0.82rem', color: '#6b7280' }}>Pukul {j.jam}</div></td>
                  <td style={{ padding: '14px' }}><div style={{ fontWeight: 600 }}>{j.lokasi_tampil}</div><div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{j.jenis === 'rutin' ? 'Jadwal rutin' : `Tambahan${j.pemohon ? ` • ${j.pemohon}` : ''}`}{j.desa ? ` • ${j.desa}` : ''}</div></td>
                  <td style={{ padding: '14px' }}>{j.nomor_polisi}</td>
                  <td style={{ padding: '14px' }}><div style={{ fontWeight: 600 }}>{j.sopir_name || '-'}</div><div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Kru: {j.kru_names || '-'}</div></td>
                  <td style={{ padding: '14px' }}><span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, background: bg, color: fg }}>{j.status.toUpperCase()}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
