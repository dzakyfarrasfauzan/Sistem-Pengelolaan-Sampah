import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FileText, AlertTriangle, Clock, CheckCircle, Star, Bell } from 'lucide-react';
import { API_URL } from '../../config';
import { formatUmur } from '../../utils/format';

const Kartu = ({ judul, nilai, icon, bg, fg, ket }) => (
  <div style={{ background: 'white', padding: '22px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '18px' }}>
    <div style={{ background: bg, padding: '14px', borderRadius: '12px', color: fg }}>{icon}</div>
    <div>
      <div style={{ color: '#6b7280', fontSize: '0.88rem' }}>{judul}</div>
      <div style={{ fontSize: '1.7rem', fontWeight: 'bold', color: '#111827' }}>{nilai}</div>
      {ket && <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{ket}</div>}
    </div>
  </div>
);

// Dashboard pengawas bidang: ringkasan penanganan laporan masyarakat di Korwil
export default function PengawasDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API_URL}/pengawas/dashboard`, { withCredentials: true });
        if (res.data.success) setData(res.data);
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  if (loading) return <div style={{ padding: '40px' }}>Memuat data...</div>;
  const { stats = {}, peringatan = [], perBulan = [] } = data || {};
  const batasHari = Math.round((stats.batasJam || 48) / 24);

  return (
    <div style={{ padding: '40px' }}>
      <h2 style={{ margin: '0 0 6px', color: '#111827', fontSize: '1.8rem' }}>Pemantauan Pelayanan Pengaduan</h2>
      <p style={{ margin: '0 0 28px', color: '#6b7280' }}>Laporan masyarakat yang masuk ke admin Korwil dan sejauh mana sudah ditindaklanjuti.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <Kartu judul="Total Laporan" nilai={stats.totalLaporan || 0} icon={<FileText size={22} />} bg="#ede9fe" fg="#7c3aed" />
        <Kartu judul="Belum Diprioritaskan" nilai={stats.belumDiprioritaskan || 0} icon={<Clock size={22} />} bg="#e0e7ff" fg="#4f46e5" />
        <Kartu judul="Sedang Diproses" nilai={stats.diproses || 0} icon={<Clock size={22} />} bg="#fef3c7" fg="#d97706" />
        <Kartu judul="Selesai" nilai={stats.selesai || 0} icon={<CheckCircle size={22} />} bg="#d1fae5" fg="#059669"
          ket={stats.rataJamPenanganan != null ? `Rata-rata ditangani ${formatUmur(stats.rataJamPenanganan)}` : null} />
        <Kartu judul="Terlambat Ditangani" nilai={stats.terlambat || 0} icon={<AlertTriangle size={22} />} bg="#fee2e2" fg="#dc2626" ket={`Lebih dari ${batasHari} hari`} />
        <Kartu judul="Kepuasan Pelapor" nilai={stats.rataRating ? `${stats.rataRating} / 5` : '-'} icon={<Star size={22} />} bg="#fef9c3" fg="#ca8a04" ket={`${stats.jumlahPenilaian || 0} penilaian`} />
      </div>

      <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={20} color="#dc2626" /> Peringatan: Laporan Belum Ditangani Lebih dari {batasHari} Hari
        </h3>
        {peringatan.length === 0 ? (
          <div style={{ color: '#059669', padding: '12px', background: '#f0fdf4', borderRadius: '10px' }}>Tidak ada laporan yang terlambat ditangani.</div>
        ) : peringatan.map(l => (
          <div key={l.id} style={{ padding: '14px 16px', border: '1px solid #fecaca', background: '#fef2f2', borderRadius: '12px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#7f1d1d' }}>{l.kode_laporan} — {l.alamat_lokasi || 'Lokasi tidak diketahui'}</div>
              <div style={{ fontSize: '0.85rem', color: '#991b1b', marginTop: '4px' }}>
                Status: {l.status} • Sudah {formatUmur(l.umur_jam)} • {l.nama_petugas ? `Ditugaskan ke ${l.nama_petugas}` : 'Belum ditugaskan'}
                {l.teguran_pengawas ? ' • Sudah ditegur' : ''}
              </div>
            </div>
            <button onClick={() => navigate('/pengawas/laporan')} style={{ padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
              {l.teguran_pengawas ? 'Lihat' : 'Beri Teguran'}
            </button>
          </div>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 16px', color: '#111827' }}>Rekap Laporan per Bulan</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f9fafb', color: '#4b5563', fontSize: '0.9rem' }}>
              <th style={{ padding: '12px' }}>Bulan</th><th style={{ padding: '12px' }}>Laporan Masuk</th><th style={{ padding: '12px' }}>Selesai</th><th style={{ padding: '12px' }}>Belum Selesai</th>
            </tr>
          </thead>
          <tbody>
            {perBulan.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: '12px', color: '#9ca3af' }}>Belum ada laporan</td></tr>
            ) : perBulan.map(b => (
              <tr key={b.bulan} style={{ borderTop: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px', fontWeight: 600 }}>{new Date(`${b.bulan}-01`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</td>
                <td style={{ padding: '12px' }}>{b.jumlah}</td>
                <td style={{ padding: '12px', color: '#059669' }}>{b.selesai}</td>
                <td style={{ padding: '12px', color: b.jumlah - b.selesai > 0 ? '#dc2626' : '#6b7280' }}>{b.jumlah - b.selesai}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
