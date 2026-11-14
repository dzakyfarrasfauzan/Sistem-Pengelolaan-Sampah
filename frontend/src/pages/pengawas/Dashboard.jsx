import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, CheckCircle2, Star, Bell, BarChart3, Inbox, ChevronRight } from 'lucide-react';
import { API_URL } from '../../config';
import { Kartu as KartuPanel, KartuAngka, JudulHalaman, Lencana } from '../../components/Ui';
import { GrafikBatang, BilahStatus } from '../../components/Grafik';
import { WARNA_SERI, labelBulan } from '../../components/grafikUtil';
import { formatUmur } from '../../utils/format';

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

  const masuk = Math.max(0, (stats.totalLaporan || 0) - (stats.diproses || 0) - (stats.selesai || 0));
  const persenSelesai = stats.totalLaporan ? Math.round(((stats.selesai || 0) / stats.totalLaporan) * 100) : 0;

  return (
    <div>
      <JudulHalaman judul="Pemantauan Pelayanan Pengaduan" keterangan="Laporan masyarakat yang masuk ke admin Korwil Jampangkulon dan sejauh mana sudah ditindaklanjuti." />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '18px' }}>
        <KartuAngka judul="Terlambat ditangani" nilai={stats.terlambat || 0} keterangan={`belum selesai lebih dari ${batasHari} hari`}
          ikon={<AlertTriangle size={22} />} warna="#9b1c1c" latar="#fbe9e9" ke="/pengawas/laporan" />
        <KartuAngka judul="Belum diprioritaskan" nilai={stats.belumDiprioritaskan || 0} keterangan="menunggu tindakan admin"
          ikon={<Inbox size={22} />} warna="#8a4b0f" latar="#fdf1e3" ke="/pengawas/laporan" />
        <KartuAngka judul="Laporan selesai" nilai={stats.selesai || 0}
          keterangan={stats.rataJamPenanganan != null ? `rata-rata ${formatUmur(stats.rataJamPenanganan)}` : `${persenSelesai}% dari semua laporan`}
          ikon={<CheckCircle2 size={22} />} />
        <KartuAngka judul="Kepuasan pelapor" nilai={stats.rataRating ? `${stats.rataRating} / 5` : '–'} keterangan={`${stats.jumlahPenilaian || 0} penilaian`}
          ikon={<Star size={22} />} warna="#8a6a00" latar="#fbf3d5" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '14px', marginBottom: '18px' }}>
        <KartuPanel judul="Laporan masuk dan selesai per bulan" ikon={<BarChart3 size={18} />}>
          {perBulan.length === 0 ? <div style={{ color: '#8a939d', fontSize: '0.9rem' }}>Belum ada laporan.</div> : (
            <GrafikBatang
              data={[...perBulan].reverse().map(b => ({ label: labelBulan(b.bulan), nilai: { masuk: b.jumlah, selesai: b.selesai } }))}
              seri={[{ kunci: 'masuk', nama: 'Masuk', warna: WARNA_SERI.masuk }, { kunci: 'selesai', nama: 'Selesai', warna: WARNA_SERI.selesai }]} />
          )}
        </KartuPanel>

        <KartuPanel judul={`Peringatan: lebih dari ${batasHari} hari`} ikon={<Bell size={18} />} aksi="Pemantauan laporan" keAksi="/pengawas/laporan">
          <BilahStatus bagian={[
            { nama: 'Selesai', nilai: stats.selesai || 0, warna: '#2f8a5b' },
            { nama: 'Diproses', nilai: stats.diproses || 0, warna: '#3b6ea8' },
            { nama: 'Masuk', nilai: masuk, warna: '#c4cad1' },
          ]} />
          <div style={{ marginTop: '12px', maxHeight: '210px', overflowY: 'auto' }}>
            {peringatan.length === 0 ? (
              <div style={{ color: '#17533a', padding: '12px', background: '#eef6f1', borderRadius: '8px', fontSize: '0.9rem' }}>Tidak ada laporan yang terlambat ditangani.</div>
            ) : peringatan.map(l => (
              <button key={l.id} type="button" onClick={() => navigate('/pengawas/laporan')} style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', border: 'none', borderTop: '1px solid #f1f3f5', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#c0392b', flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem' }}>{l.kode_laporan} · {l.alamat_lokasi || 'Lokasi tidak diketahui'}</span>
                  <span style={{ display: 'block', color: '#5b6673', fontSize: '0.8rem' }}>
                    <Clock size={12} style={{ verticalAlign: '-1px' }} /> {formatUmur(l.umur_jam)} · {l.nama_petugas ? `dijadwalkan ke ${l.nama_petugas}` : 'belum dijadwalkan'}{l.teguran_pengawas ? ' · sudah ditegur' : ''}
                  </span>
                </span>
                <Lencana nilai={l.status} />
                <ChevronRight size={16} color="#8a939d" />
              </button>
            ))}
          </div>
        </KartuPanel>
      </div>

      <KartuPanel judul="Rekap laporan per bulan" ikon={<BarChart3 size={18} />}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr>
              <th style={{ padding: '10px 12px' }}>Bulan</th><th style={{ padding: '10px 12px' }}>Laporan masuk</th><th style={{ padding: '10px 12px' }}>Selesai</th><th style={{ padding: '10px 12px' }}>Belum selesai</th><th style={{ padding: '10px 12px' }}>Penyelesaian</th>
            </tr>
          </thead>
          <tbody>
            {perBulan.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '12px', color: '#8a939d' }}>Belum ada laporan</td></tr>
            ) : perBulan.map(b => {
              const persen = b.jumlah ? Math.round((b.selesai / b.jumlah) * 100) : 0;
              return (
                <tr key={b.bulan} style={{ borderTop: '1px solid #f1f3f5' }}>
                  <td style={{ padding: '12px', fontWeight: 600 }}>{new Date(`${b.bulan}-01`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</td>
                  <td style={{ padding: '12px' }}>{b.jumlah}</td>
                  <td style={{ padding: '12px' }}>{b.selesai}</td>
                  <td style={{ padding: '12px', color: b.jumlah - b.selesai > 0 ? '#9b1c1c' : '#5b6673', fontWeight: b.jumlah - b.selesai > 0 ? 600 : 400 }}>{b.jumlah - b.selesai}</td>
                  <td style={{ padding: '12px', minWidth: '140px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '6px', background: '#eceff2', borderRadius: '3px', overflow: 'hidden' }}><div style={{ width: `${persen}%`, height: '100%', background: '#2f8a5b' }} /></div>
                      <span style={{ fontSize: '0.8rem', color: '#3a4550', width: '36px' }}>{persen}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </KartuPanel>
    </div>
  );
}
