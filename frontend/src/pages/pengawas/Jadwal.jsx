import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../../config';

const WARNA = { menunggu: ['#e7f1eb', '#1f6b47'], berjalan: ['#fef3c7', '#d97706'], selesai: ['#e7f1eb', '#1f6b47'], batal: ['#f3f4f6', '#5b6673'] };

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
    <div style={{ padding: '40px', fontFamily: 'inherit' }}>
      <h1 style={{ margin: '0 0 20px', color: '#1f2933' }}>Jadwal Pengangkutan</h1>
      <div style={{ background: 'white', border: '1px solid #e1e5e9', borderRadius: '10px', boxShadow: '0 1px 2px rgba(16,24,40,0.06)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
          <thead>
            <tr style={{ background: '#f7f8f9', color: '#4b5563', fontSize: '0.9rem' }}>
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
                  <td style={{ padding: '14px' }}><div style={{ fontWeight: 700 }}>{j.tanggal}</div><div style={{ fontSize: '0.82rem', color: '#5b6673' }}>Pukul {j.jam}</div></td>
                  <td style={{ padding: '14px' }}><div style={{ fontWeight: 600 }}>{j.lokasi_tampil}</div><div style={{ fontSize: '0.78rem', color: '#5b6673' }}>{j.jenis === 'rutin' ? 'Jadwal rutin' : `Tambahan${j.kode_laporan ? ` • laporan ${j.kode_laporan}` : ''}${j.pemohon ? ` • ${j.pemohon}` : ''}`}{j.desa ? ` • ${j.desa}` : ''}</div></td>
                  <td style={{ padding: '14px' }}>{j.nomor_polisi}</td>
                  <td style={{ padding: '14px' }}><div style={{ fontWeight: 600 }}>{j.sopir_name || '-'}</div><div style={{ fontSize: '0.8rem', color: '#5b6673' }}>Kru: {j.kru_names || '-'}</div></td>
                  <td style={{ padding: '14px' }}><span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, background: bg, color: fg }}>{j.status.toUpperCase()}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
