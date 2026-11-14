import { useEffect, useState } from 'react';
import axios from 'axios';
import { Lencana, RingkasanAngka, KotakCari, TabFilter } from '../../components/Ui';
import { API_URL } from '../../config';


// Jadwal pengangkutan untuk pengawas bidang (hanya dilihat)
export default function PengawasJadwal() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rentang, setRentang] = useState('hari ini');
  const [cari, setCari] = useState('');
  const [hariIni] = useState(() => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10));

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

  const cocok = (j) => rentang === 'semua' ? true : rentang === 'hari ini' ? j.tanggal === hariIni : rentang === 'mendatang' ? j.tanggal > hariIni : j.tanggal < hariIni;
  const tampil = list.filter(j => cocok(j) && `${j.lokasi_tampil} ${j.nomor_polisi} ${j.sopir_name} ${j.kru_names || ''}`.toLowerCase().includes(cari.toLowerCase()));
  const hariIniList = list.filter(j => j.tanggal === hariIni);

  return (
    <div style={{ padding: '40px', fontFamily: 'inherit' }}>
      <h1 style={{ margin: '0 0 4px', color: '#1f2933' }}>Jadwal Pengangkutan</h1>
      <p style={{ margin: '0 0 18px', color: '#5b6673', fontSize: '0.92rem' }}>Pantau pelaksanaan jadwal pengangkutan Korwil Jampangkulon (hanya dilihat).</p>
      <RingkasanAngka data={[
        { label: 'Jadwal hari ini', nilai: hariIniList.length },
        { label: 'Selesai hari ini', nilai: hariIniList.filter(j => j.status === 'selesai').length, warna: '#2f8a5b' },
        { label: 'Sedang berjalan', nilai: hariIniList.filter(j => j.status === 'berjalan').length, warna: '#3b6ea8' },
        { label: 'Belum berangkat', nilai: hariIniList.filter(j => j.status === 'menunggu').length, warna: '#c98a1a' },
      ]} />
      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <TabFilter aktif={rentang} onPilih={setRentang} pilihan={[['hari ini', 'Hari ini'], ['mendatang', 'Mendatang'], ['riwayat', 'Riwayat'], ['semua', 'Semua']].map(([v, t]) => ({ nilai: v, label: t }))} />
        <KotakCari nilai={cari} onUbah={setCari} petunjuk="Cari jalur, armada, sopir..." />
      </div>
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
            ) : tampil.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#8a939d' }}>Tidak ada jadwal.</td></tr>
            ) : tampil.map(j => {
              return (
                <tr key={j.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px' }}><div style={{ fontWeight: 700 }}>{new Date(`${j.tanggal}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div><div style={{ fontSize: '0.82rem', color: '#5b6673' }}>Pukul {j.jam}</div></td>
                  <td style={{ padding: '14px' }}><div style={{ fontWeight: 600 }}>{j.lokasi_tampil}</div><div style={{ fontSize: '0.78rem', color: '#5b6673' }}>{j.jenis === 'rutin' ? 'Jadwal rutin' : `Tambahan${j.kode_laporan ? ` • laporan ${j.kode_laporan}` : ''}${j.pemohon ? ` • ${j.pemohon}` : ''}`}{j.desa ? ` • ${j.desa}` : ''}</div></td>
                  <td style={{ padding: '14px' }}>{j.nomor_polisi}</td>
                  <td style={{ padding: '14px' }}><div style={{ fontWeight: 600 }}>{j.sopir_name || '-'}</div><div style={{ fontSize: '0.8rem', color: '#5b6673' }}>Kru: {j.kru_names || '-'}</div></td>
                  <td style={{ padding: '14px' }}><Lencana nilai={j.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
