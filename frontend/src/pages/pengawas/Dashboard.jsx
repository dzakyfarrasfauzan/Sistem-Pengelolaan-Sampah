import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Inbox, ListChecks, CalendarDays } from 'lucide-react';
import { API_URL } from '../../config';
import { formatUmur } from '../../utils/format';
import { KepalaBeranda, TombolTautan, StripAngka, KotakBeranda, BarisTugas, SemuaBeres, GarisWaktu } from '../../components/Beranda';

const sapaan = () => {
  const jam = new Date().getHours();
  return jam < 11 ? 'Selamat pagi' : jam < 15 ? 'Selamat siang' : jam < 18 ? 'Selamat sore' : 'Selamat malam';
};

// Dashboard pengawas bidang: apa yang perlu diperhatikan hari ini
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

  if (loading) return <div style={{ padding: '40px', color: '#5b6673' }}>Memuat data...</div>;
  const { stats = {}, peringatan = [], belumDiprioritaskan = [], jadwalHariIni = [] } = data || {};
  const batasHari = Math.round((stats.batasJam || 48) / 24);
  const persenSelesai = stats.totalLaporan ? Math.round(((stats.selesai || 0) / stats.totalLaporan) * 100) : 0;

  const tugas = [
    ...peringatan.map(l => ({
      kunci: `t${l.id}`, nada: 'merah', ikon: <AlertTriangle size={18} />,
      judul: `${l.kode_laporan} terlambat ${formatUmur(l.umur_jam)}`,
      ket: `${l.status === 'masuk' ? 'Belum dijadwalkan' : 'Sedang diproses'} · ${l.alamat_lokasi || 'lokasi tidak diketahui'}${l.teguran_pengawas ? ' · sudah ditegur' : ''}`,
      aksi: l.teguran_pengawas ? 'Lihat' : 'Beri teguran', ke: '/pengawas/laporan',
    })),
    ...belumDiprioritaskan.filter(l => !peringatan.some(p => p.id === l.id)).map(l => ({
      kunci: `b${l.id}`, nada: 'oranye', ikon: <Inbox size={18} />,
      judul: `${l.kode_laporan} belum diprioritaskan admin`,
      ket: `Masuk ${formatUmur(l.umur_jam)} lalu · ${l.alamat_lokasi || l.nama_pelapor}`,
      aksi: 'Lihat', ke: '/pengawas/laporan',
    })),
  ];

  const ringkas = peringatan.length
    ? `${peringatan.length} laporan sudah lebih dari ${batasHari} hari belum selesai.`
    : `Tidak ada laporan yang terlambat. Ada ${jadwalHariIni.length} jadwal pengangkutan hari ini.`;

  return (
    <div>
      <KepalaBeranda label="Pemantauan Bidang" sapaan={`${sapaan()}, Pengawas`} ringkas={ringkas}>
        <TombolTautan ke="/pengawas/jadwal" ikon={<CalendarDays size={16} />}>Jadwal Pengangkutan</TombolTautan>
        <TombolTautan ke="/pengawas/laporan" ikon={<ListChecks size={16} />} utama>Pantau Laporan</TombolTautan>
      </KepalaBeranda>

      <StripAngka data={[
        { label: 'Terlambat ditangani', nilai: stats.terlambat || 0, ket: `lebih dari ${batasHari} hari`, warna: '#c0392b', ke: '/pengawas/laporan' },
        { label: 'Belum diprioritaskan', nilai: stats.belumDiprioritaskan || 0, ket: 'menunggu admin', warna: '#c27b1f', ke: '/pengawas/laporan' },
        { label: 'Laporan selesai', nilai: stats.selesai || 0, ket: `${persenSelesai}% dari ${stats.totalLaporan || 0} laporan`, warna: '#2f8a5b', ke: '/pengawas/laporan' },
        { label: 'Kepuasan pelapor', nilai: stats.rataRating ? `${stats.rataRating}/5` : '–', ket: `${stats.jumlahPenilaian || 0} penilaian`, warna: '#e9b949' },
      ]} />

      <div className="beranda-grid">
        <KotakBeranda judul="Perlu perhatian" jumlah={tugas.length} aksi="Semua laporan" keAksi="/pengawas/laporan">
          {tugas.length === 0
            ? <SemuaBeres teks="Semua laporan ditangani tepat waktu." />
            : tugas.map(({ kunci, ...t }) => <BarisTugas key={kunci} {...t} />)}
        </KotakBeranda>

        <KotakBeranda judul="Pengangkutan hari ini" aksi="Semua jadwal" keAksi="/pengawas/jadwal">
          <GarisWaktu jadwal={jadwalHariIni} />
        </KotakBeranda>
      </div>
    </div>
  );
}
