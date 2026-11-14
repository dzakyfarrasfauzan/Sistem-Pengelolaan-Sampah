import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Inbox, Wrench, ClipboardCheck, CalendarDays } from 'lucide-react';
import { API_URL } from '../../config';
import { KepalaBeranda, TombolTautan, StripAngka, KotakBeranda, BarisTugas, SemuaBeres, GarisWaktu } from '../../components/Beranda';

const sapaan = () => {
  const jam = new Date().getHours();
  return jam < 11 ? 'Selamat pagi' : jam < 15 ? 'Selamat siang' : jam < 18 ? 'Selamat sore' : 'Selamat malam';
};

const NAMA_PRIORITAS = { tinggi: 'Prioritas tinggi', sedang: 'Prioritas sedang', rendah: 'Prioritas rendah' };

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const muat = async () => {
      try {
        const res = await axios.get(`${API_URL}/admin/dashboard`, { withCredentials: true });
        if (res.data.success) setData(res.data);
      } catch (err) {
        if (err.response?.status === 401) navigate('/login');
      } finally { setLoading(false); }
    };
    muat();
  }, [navigate]);

  if (loading) return <div style={{ padding: '40px', color: '#5b6673' }}>Memuat data dashboard...</div>;

  const { stats = {}, jadwalTerbaru = [], laporanPerluJadwal = [], teguran = [], armadaRusak = [] } = data || {};
  const jumlahStatus = (s) => jadwalTerbaru.filter(j => j.status === s).length;
  const belumPeriksa = jadwalTerbaru.filter(j => j.status === 'menunggu' && !j.kondisi_berangkat);

  // Urutan tugas: teguran pengawas, laporan yang perlu dijadwalkan, pemeriksaan armada, armada rusak
  const tugas = [
    ...teguran.map(t => ({ kunci: `t${t.id}`, nada: 'merah', ikon: <AlertTriangle size={18} />, judul: `Teguran Bidang: ${t.kode_laporan}`, ket: t.teguran_pengawas, aksi: 'Jadwalkan', ke: '/admin/laporan-masyarakat' })),
    ...laporanPerluJadwal.filter(l => !teguran.some(t => t.id === l.id)).map(l => ({
      kunci: `l${l.id}`, nada: l.prioritas === 'tinggi' ? 'merah' : 'oranye', ikon: <Inbox size={18} />,
      judul: `${l.kode_laporan} belum dijadwalkan`,
      ket: `${NAMA_PRIORITAS[l.prioritas] || 'Prioritas belum ditentukan'} · ${l.alamat_lokasi || l.nama_pelapor}`,
      aksi: 'Jadwalkan', ke: '/admin/laporan-masyarakat',
    })),
    ...belumPeriksa.map(j => ({ kunci: `p${j.id}`, nada: 'biru', ikon: <ClipboardCheck size={18} />, judul: `${j.nomor_polisi} belum diperiksa`, ket: `Berangkat ${j.jam} · ${j.lokasi_tampil}`, aksi: 'Lihat', ke: '/admin/jadwal' })),
    ...armadaRusak.map(k => ({ kunci: `k${k.id}`, nada: 'oranye', ikon: <Wrench size={18} />, judul: `${k.nomor_polisi} kondisi ${k.kondisi}`, ket: k.jenis_kendaraan, aksi: 'Perbarui', ke: '/admin/kendaraan' })),
  ];

  const ringkas = tugas.length
    ? `Ada ${tugas.length} hal yang perlu ditindaklanjuti dan ${jadwalTerbaru.length} jadwal pengangkutan hari ini.`
    : `Tidak ada yang tertunda. Ada ${jadwalTerbaru.length} jadwal pengangkutan hari ini.`;

  return (
    <div>
      <KepalaBeranda label="Korwil Jampangkulon" sapaan={`${sapaan()}, Admin`} ringkas={ringkas}>
        <TombolTautan ke="/admin/jadwal" ikon={<CalendarDays size={16} />}>Buka Jadwal</TombolTautan>
        <TombolTautan ke="/admin/laporan-masyarakat" ikon={<Inbox size={16} />} utama>Laporan Masyarakat</TombolTautan>
      </KepalaBeranda>

      <StripAngka data={[
        { label: 'Laporan belum dijadwalkan', nilai: stats.laporanMasuk || 0, warna: '#c27b1f', ke: '/admin/laporan-masyarakat' },
        { label: 'Laporan sedang diproses', nilai: Math.max(0, (stats.laporanBelumDitangani || 0) - (stats.laporanMasuk || 0)), warna: '#3b6ea8', ke: '/admin/laporan-masyarakat' },
        { label: 'Jadwal hari ini', nilai: jadwalTerbaru.length, ket: `${jumlahStatus('selesai')} selesai · ${jumlahStatus('berjalan')} berjalan`, warna: '#1f6b47', ke: '/admin/jadwal' },
        { label: 'Armada siap', nilai: `${(stats.totalKendaraan || 0) - (stats.kendaraanPerluPerbaikan || 0)}/${stats.totalKendaraan || 0}`, warna: '#2f8a5b', ke: '/admin/kendaraan' },
      ]} />

      <div className="beranda-grid">
        <KotakBeranda judul="Perlu tindakan" jumlah={tugas.length}>
          {tugas.length === 0
            ? <SemuaBeres teks="Tidak ada laporan atau armada yang menunggu tindakan." />
            : tugas.map(({ kunci, ...t }) => <BarisTugas key={kunci} {...t} />)}
        </KotakBeranda>

        <KotakBeranda judul="Jadwal hari ini" aksi="Semua jadwal" keAksi="/admin/jadwal">
          <GarisWaktu jadwal={jadwalTerbaru} tampilPeriksa />
        </KotakBeranda>
      </div>
    </div>
  );
}
