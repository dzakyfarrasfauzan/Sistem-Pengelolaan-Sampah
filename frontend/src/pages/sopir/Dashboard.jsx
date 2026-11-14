import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Truck, AlertTriangle, ClipboardCheck, CheckCircle2, MessageSquareWarning, Clock, MapPin, Users, CalendarDays } from 'lucide-react';
import { API_URL } from '../../config';
import { Kartu, KartuAngka, Lencana, JudulHalaman } from '../../components/Ui';

const tglPanjang = (t) => new Date(`${t}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
const hariIni = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

export default function SopirDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API_URL}/sopir/dashboard`, { withCredentials: true });
        if (res.data.success) setData(res.data);
      } catch (err) {
        if (err.response?.status === 401) navigate('/login');
        setErrorMsg(err.response?.data?.message || 'Gagal memuat data. Silakan login kembali.');
      } finally { setLoading(false); }
    };
    load();
  }, [navigate]);

  if (loading) return <div style={{ padding: '40px', color: '#5b6673' }}>Memuat data...</div>;
  const { stats = {}, jadwalMendatang = [] } = data || {};
  const berikut = jadwalMendatang.find(j => j.status !== 'selesai');
  const lainnya = jadwalMendatang.filter(j => j !== berikut);

  return (
    <div>
      <JudulHalaman judul="Tugas Saya" keterangan="Jadwal pengangkutan dan pemeriksaan armada yang ditugaskan kepada Anda." />
      {errorMsg && <div style={{ background: '#fbe9e9', color: '#9b1c1c', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontWeight: 600 }}>{errorMsg}</div>}

      {/* Tugas berikutnya */}
      {berikut ? (
        <section style={{ background: '#14472e', color: 'white', borderRadius: '12px', padding: '20px 22px', marginBottom: '18px', display: 'flex', gap: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <div style={{ fontSize: '0.8rem', color: '#a9c9b6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tugas berikutnya · {berikut.tanggal === hariIni() ? 'Hari ini' : tglPanjang(berikut.tanggal)}
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, margin: '4px 0 10px' }}>{berikut.lokasi_tampil}</div>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.88rem', color: '#dcebe2' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Clock size={15} /> Berangkat {berikut.jam}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Truck size={15} /> {berikut.nomor_polisi} {berikut.jenis_kendaraan ? `(${berikut.jenis_kendaraan})` : ''}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Users size={15} /> {berikut.kru_names || 'Tanpa kru'}</span>
              {berikut.tps_names && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><MapPin size={15} /> {berikut.tps_names}</span>}
            </div>
          </div>
          <button onClick={() => navigate('/sopir/jadwal')} style={{ padding: '12px 20px', background: '#e9b949', color: '#3d2c00', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>
            {berikut.kondisi_berangkat ? 'Lanjutkan Tugas' : 'Periksa Armada Sekarang'}
          </button>
        </section>
      ) : (
        <section style={{ background: 'white', border: '1px solid #e1e5e9', borderRadius: '12px', padding: '22px', marginBottom: '18px', color: '#5b6673' }}>
          Tidak ada tugas pengangkutan dalam 7 hari ke depan.
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '18px' }}>
        <KartuAngka judul="Belum diperiksa" nilai={stats.belumDiperiksa || 0} keterangan="armada sebelum berangkat" ikon={<AlertTriangle size={22} />} warna="#8a4b0f" latar="#fdf1e3" ke="/sopir/jadwal" />
        <KartuAngka judul="Pengangkutan selesai" nilai={stats.jadwalSelesai || 0} ikon={<CheckCircle2 size={22} />} />
        <KartuAngka judul="Pemeriksaan dikirim" nilai={stats.totalPemeriksaan || 0} ikon={<ClipboardCheck size={22} />} warna="#1d4f73" latar="#e6eef7" />
        <KartuAngka judul="Laporan ditugaskan" nilai={stats.laporanDitugaskan || 0} ikon={<MessageSquareWarning size={22} />} warna="#9b1c1c" latar="#fbe9e9" ke="/sopir/laporan" />
      </div>

      <Kartu judul="Jadwal 7 hari ke depan" ikon={<CalendarDays size={18} />} aksi="Buka jadwal" keAksi="/sopir/jadwal">
        {lainnya.length === 0 ? <div style={{ color: '#8a939d', fontSize: '0.9rem' }}>Tidak ada jadwal lain.</div> : lainnya.map(j => (
          <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '11px 0', borderTop: '1px solid #f1f3f5' }}>
            <div style={{ width: '54px', textAlign: 'center', flexShrink: 0, background: '#f5f7f6', borderRadius: '8px', padding: '6px 0' }}>
              <div style={{ fontSize: '0.7rem', color: '#5b6673', textTransform: 'uppercase' }}>{new Date(`${j.tanggal}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'short' })}</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{Number(j.tanggal.slice(8))}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{j.lokasi_tampil}</div>
              <div style={{ color: '#5b6673', fontSize: '0.84rem' }}>Pukul {j.jam} · {j.nomor_polisi} · Kru: {j.kru_names || '-'}</div>
            </div>
            <Lencana nilai={j.kondisi_berangkat ? 'diperiksa' : j.status} />
          </div>
        ))}
      </Kartu>
    </div>
  );
}
