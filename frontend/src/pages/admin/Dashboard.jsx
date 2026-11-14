import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Inbox, Wrench, CalendarDays, Truck, Users, Clock, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { API_URL } from '../../config';
import { Lencana } from '../../components/Ui';
import { KotakBeranda, BarisTugas, SemuaBeres } from '../../components/Beranda';

const sapaan = () => {
  const jam = new Date().getHours();
  return jam < 11 ? 'Selamat pagi' : jam < 15 ? 'Selamat siang' : jam < 18 ? 'Selamat sore' : 'Selamat malam';
};
const tanggalPanjang = () => new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const WARNA_GARIS = { selesai: '#2f8a5b', berjalan: '#3b6ea8', menunggu: '#c4cad1' };

/** Tanda sudah/belum untuk pemeriksaan armada */
function TandaPeriksa({ label, kondisi }) {
  const sudah = !!kondisi;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: sudah ? '#17533a' : '#8a939d' }}>
      {sudah ? <CheckCircle2 size={14} /> : <Circle size={14} />} {label}
    </span>
  );
}

/** Kartu satu armada pada jadwal hari ini */
function KartuArmada({ j }) {
  return (
    <Link to="/admin/jadwal" className="kartu-armada" style={{ display: 'block', background: 'white', border: '1px solid #e1e5e9', borderTop: `4px solid ${WARNA_GARIS[j.status] || '#c4cad1'}`, borderRadius: '12px', padding: '14px 16px', color: '#1f2933' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontWeight: 700, fontSize: '1rem' }}>
          <Truck size={17} color="#1f6b47" /> {j.nomor_polisi}
        </span>
        <Lencana nilai={j.status} />
      </div>
      <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {j.lokasi_tampil} {j.laporan_id && <Lencana nilai="tambahan" />}
      </div>
      <div style={{ fontSize: '0.8rem', color: '#6b7580', marginTop: '4px', display: 'grid', gap: '2px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Clock size={13} /> Berangkat {j.jam} · {j.sopir_name}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><Users size={13} /> {j.kru_names || 'Tanpa kru'}</span>
      </div>
      <div style={{ display: 'flex', gap: '14px', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #e6e9ec' }}>
        <TandaPeriksa label="Cek berangkat" kondisi={j.kondisi_berangkat} />
        <TandaPeriksa label="Cek pulang" kondisi={j.kondisi_pulang} />
      </div>
    </Link>
  );
}

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
  const diproses = Math.max(0, (stats.laporanBelumDitangani || 0) - (stats.laporanMasuk || 0));
  const armadaSiap = (stats.totalKendaraan || 0) - (stats.kendaraanPerluPerbaikan || 0);

  const laporanTugas = [
    ...teguran.map(t => ({ kunci: `t${t.id}`, nada: 'merah', ikon: <AlertTriangle size={18} />, judul: `Teguran Bidang: ${t.kode_laporan}`, ket: t.teguran_pengawas, aksi: 'Jadwalkan', ke: '/admin/laporan-masyarakat' })),
    ...laporanPerluJadwal.filter(l => !teguran.some(t => t.id === l.id)).map(l => ({
      kunci: `l${l.id}`, nada: l.prioritas === 'tinggi' ? 'merah' : 'oranye', ikon: <Inbox size={18} />,
      judul: `${l.kode_laporan} · ${l.nama_pelapor}`,
      ket: l.alamat_lokasi || 'Lokasi belum diisi',
      aksi: 'Jadwalkan', ke: '/admin/laporan-masyarakat',
    })),
  ];

  const angka = [
    { nilai: stats.laporanMasuk || 0, label: 'Laporan baru', ke: '/admin/laporan-masyarakat' },
    { nilai: diproses, label: 'Laporan diproses', ke: '/admin/laporan-masyarakat' },
    { nilai: `${jumlahStatus('selesai')}/${jadwalTerbaru.length}`, label: 'Jadwal selesai hari ini', ke: '/admin/jadwal' },
    { nilai: `${armadaSiap}/${stats.totalKendaraan || 0}`, label: 'Armada siap jalan', ke: '/admin/kendaraan' },
  ];

  return (
    <div>
      {/* Pita sapaan */}
      <div className="pita-sapaan" style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #1f6b47 0%, #14472e 100%)', color: 'white', borderRadius: '16px', padding: '24px 26px', marginBottom: '20px' }}>
        <span style={{ position: 'absolute', right: '-60px', top: '-80px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <span style={{ position: 'absolute', right: '120px', bottom: '-110px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(233,185,73,0.12)' }} />
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.82rem', color: '#bcd9c8' }}>Korwil Jampangkulon · {tanggalPanjang()}</div>
            <h1 style={{ color: 'white', fontSize: '1.65rem', marginTop: '2px' }}>{sapaan()}, Admin</h1>
            <p style={{ color: '#d6e8dd', fontSize: '0.95rem', marginTop: '2px' }}>
              {jadwalTerbaru.length} armada dijadwalkan hari ini dan {stats.laporanMasuk || 0} laporan masyarakat menunggu dijadwalkan.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Link to="/admin/jadwal" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.35)', color: 'white', fontWeight: 600, fontSize: '0.88rem' }}>
              <CalendarDays size={16} /> Jadwal
            </Link>
            <Link to="/admin/laporan-masyarakat" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 15px', borderRadius: '8px', background: '#e9b949', color: '#3d2c00', fontWeight: 700, fontSize: '0.88rem' }}>
              <Inbox size={16} /> Jadwalkan Laporan
            </Link>
          </div>
        </div>
        <div className="pita-angka" style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '20px' }}>
          {angka.map(a => (
            <Link key={a.label} to={a.ke} className="pita-sel" style={{ display: 'block', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '12px', padding: '12px 14px', color: 'white' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, lineHeight: 1.2 }}>{a.nilai}</div>
              <div style={{ fontSize: '0.8rem', color: '#cfe4d7' }}>{a.label}</div>
            </Link>
          ))}
        </div>
      </div>

      <div className="beranda-grid">
        {/* Armada hari ini */}
        <section style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1.05rem' }}>Armada hari ini</h3>
            <Link to="/admin/jadwal" style={{ fontSize: '0.84rem', color: '#1f6b47', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Semua jadwal <ArrowRight size={14} /></Link>
          </div>
          {jadwalTerbaru.length === 0 ? (
            <div style={{ background: 'white', border: '1px dashed #d8dde3', borderRadius: '12px', padding: '28px', textAlign: 'center', color: '#8a939d', fontSize: '0.9rem' }}>Tidak ada jadwal pengangkutan hari ini.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
              {jadwalTerbaru.map(j => <KartuArmada key={j.id} j={j} />)}
            </div>
          )}
        </section>

        {/* Laporan menunggu dan armada rusak */}
        <div style={{ display: 'grid', gap: '16px', minWidth: 0 }}>
          <KotakBeranda judul="Laporan menunggu" jumlah={laporanTugas.length} aksi="Semua laporan" keAksi="/admin/laporan-masyarakat">
            {laporanTugas.length === 0
              ? <SemuaBeres teks="Semua laporan masyarakat sudah dijadwalkan." />
              : laporanTugas.map(({ kunci, ...t }) => <BarisTugas key={kunci} {...t} />)}
          </KotakBeranda>

          {armadaRusak.length > 0 && (
            <KotakBeranda judul="Armada perlu perbaikan" jumlah={armadaRusak.length} aksi="Kendaraan" keAksi="/admin/kendaraan">
              {armadaRusak.map(k => (
                <BarisTugas key={k.id} nada={k.kondisi === 'rusak berat' ? 'merah' : 'oranye'} ikon={<Wrench size={18} />}
                  judul={k.nomor_polisi} ket={`${k.jenis_kendaraan} · ${k.kondisi}`} aksi="Perbarui" ke="/admin/kendaraan" />
              ))}
            </KotakBeranda>
          )}
        </div>
      </div>
    </div>
  );
}
