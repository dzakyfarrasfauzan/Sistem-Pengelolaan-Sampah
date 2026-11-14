import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Truck, Users, AlertTriangle, CheckCircle2, Inbox, Wrench, CalendarDays, Route as IkonJalur, UserCog, BarChart3, MessageSquareWarning, Clock } from 'lucide-react';
import { API_URL } from '../../config';
import { Kartu, KartuAngka, Lencana, JudulHalaman } from '../../components/Ui';
import { GrafikBatang, BilahStatus } from '../../components/Grafik';
import { WARNA_SERI, labelBulan } from '../../components/grafikUtil';

const sapaan = () => {
  const jam = new Date().getHours();
  return jam < 11 ? 'Selamat pagi' : jam < 15 ? 'Selamat siang' : jam < 18 ? 'Selamat sore' : 'Selamat malam';
};

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

  const { stats = {}, laporanTerbaru = [], jadwalTerbaru = [], perBulan = [], statusJadwalHariIni = [] } = data || {};
  const jumlahStatus = (s) => statusJadwalHariIni.find(x => x.status === s)?.jumlah || 0;

  return (
    <div>
      <JudulHalaman judul={`${sapaan()}, Admin`} keterangan="Ringkasan pelayanan pengangkutan sampah Korwil Jampangkulon hari ini.">
        <Link to="/admin/laporan-masyarakat" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '8px', background: '#1f6b47', color: 'white', fontWeight: 600, fontSize: '0.88rem' }}>
          <Inbox size={16} /> Jadwalkan Laporan
        </Link>
        <Link to="/admin/jadwal" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '8px', background: 'white', border: '1px solid #d8dde3', color: '#1f2933', fontWeight: 600, fontSize: '0.88rem' }}>
          <CalendarDays size={16} /> Jadwal Hari Ini
        </Link>
      </JudulHalaman>

      {stats.teguranPengawas > 0 && (
        <div style={{ background: '#fbe9e9', border: '1px solid #f0c7c7', color: '#9b1c1c', padding: '12px 16px', borderRadius: '10px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, fontSize: '0.92rem' }}>
          <AlertTriangle size={18} /> Ada {stats.teguranPengawas} teguran dari Bidang untuk laporan yang belum selesai.
          <Link to="/admin/laporan-masyarakat" style={{ marginLeft: 'auto', textDecoration: 'underline' }}>Lihat laporan</Link>
        </div>
      )}

      {/* Angka utama */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '18px' }}>
        <KartuAngka judul="Laporan perlu ditangani" nilai={stats.laporanBelumDitangani || 0} keterangan={`${stats.laporanMasuk || 0} belum dijadwalkan`}
          ikon={<Inbox size={22} />} warna="#8a4b0f" latar="#fdf1e3" ke="/admin/laporan-masyarakat" />
        <KartuAngka judul="Jadwal hari ini" nilai={stats.jadwalHariIni || 0} keterangan={`${jumlahStatus('selesai')} selesai, ${jumlahStatus('berjalan')} berjalan`}
          ikon={<CalendarDays size={22} />} warna="#1d4f73" latar="#e6eef7" ke="/admin/jadwal" />
        <KartuAngka judul="Laporan selesai" nilai={stats.laporanSelesai || 0} keterangan="sejak sistem dipakai"
          ikon={<CheckCircle2 size={22} />} />
        <KartuAngka judul="Armada perlu perbaikan" nilai={stats.kendaraanPerluPerbaikan || 0} keterangan={`dari ${stats.totalKendaraan || 0} armada`}
          ikon={<Wrench size={22} />} warna="#9b1c1c" latar="#fbe9e9" ke="/admin/kendaraan" />
      </div>

      {/* Grafik dan jadwal hari ini */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '14px', marginBottom: '18px' }}>
        <Kartu judul="Laporan masyarakat 6 bulan terakhir" ikon={<BarChart3 size={18} />}>
          <GrafikBatang
            data={perBulan.map(b => ({ label: labelBulan(b.bulan), nilai: { masuk: b.masuk, selesai: b.selesai } }))}
            seri={[{ kunci: 'masuk', nama: 'Masuk', warna: WARNA_SERI.masuk }, { kunci: 'selesai', nama: 'Selesai', warna: WARNA_SERI.selesai }]} />
        </Kartu>

        <Kartu judul="Pengangkutan hari ini" ikon={<Truck size={18} />} aksi="Semua jadwal" keAksi="/admin/jadwal">
          <BilahStatus bagian={[
            { nama: 'Selesai', nilai: jumlahStatus('selesai'), warna: '#2f8a5b' },
            { nama: 'Berjalan', nilai: jumlahStatus('berjalan'), warna: '#3b6ea8' },
            { nama: 'Menunggu', nilai: jumlahStatus('menunggu'), warna: '#c4cad1' },
          ]} />
          <div style={{ marginTop: '12px', maxHeight: '196px', overflowY: 'auto' }}>
            {jadwalTerbaru.length === 0 && <div style={{ color: '#8a939d', fontSize: '0.88rem', padding: '12px 0' }}>Tidak ada jadwal hari ini.</div>}
            {jadwalTerbaru.map(j => (
              <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderTop: '1px solid #f1f3f5', fontSize: '0.86rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#5b6673', width: '58px', flexShrink: 0 }}><Clock size={13} /> {j.jam}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.lokasi_tampil}</div>
                  <div style={{ color: '#8a939d', fontSize: '0.78rem' }}>{j.nomor_polisi} · {j.sopir_name}</div>
                </div>
                <Lencana nilai={j.status} />
              </div>
            ))}
          </div>
        </Kartu>
      </div>

      {/* Laporan terbaru dan data operasional */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'flex-start' }}>
        <Kartu judul="Laporan terbaru" ikon={<MessageSquareWarning size={18} />} aksi="Semua laporan" keAksi="/admin/laporan-masyarakat" gaya={{ flex: '2 1 480px', minWidth: 0 }}>
          {laporanTerbaru.length === 0 ? <div style={{ color: '#8a939d', fontSize: '0.88rem' }}>Belum ada laporan.</div> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', minWidth: '480px' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#5b6673', fontSize: '0.8rem' }}>
                    <th style={{ padding: '6px 8px 8px 0' }}>Kode</th><th style={{ padding: '6px 8px 8px' }}>Pelapor</th>
                    <th style={{ padding: '6px 8px 8px' }}>Lokasi</th><th style={{ padding: '6px 8px 8px' }}>Prioritas</th><th style={{ padding: '6px 0 8px 8px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {laporanTerbaru.map(l => (
                    <tr key={l.id} style={{ borderTop: '1px solid #f1f3f5' }}>
                      <td style={{ padding: '10px 8px 10px 0', fontWeight: 600, whiteSpace: 'nowrap' }}>{l.kode_laporan}</td>
                      <td style={{ padding: '10px 8px' }}>{l.nama_pelapor}</td>
                      <td style={{ padding: '10px 8px', color: '#5b6673', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.alamat_lokasi || '-'}</td>
                      <td style={{ padding: '10px 8px' }}><Lencana nilai={l.prioritas} kosong="Belum" /></td>
                      <td style={{ padding: '10px 0 10px 8px' }}><Lencana nilai={l.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Kartu>

        <Kartu judul="Data operasional" ikon={<Users size={18} />} gaya={{ flex: '1 1 260px' }}>
          {[
            ['Jalur layanan aktif', stats.totalJalur, IkonJalur, '/admin/jalur'],
            ['TPS', stats.totalTps, Trash2, '/admin/tps'],
            ['Armada', stats.totalKendaraan, Truck, '/admin/kendaraan'],
            ['Sopir aktif', stats.totalSopir, UserCog, '/admin/petugas'],
            ['Kru aktif', stats.totalKru, Users, '/admin/petugas'],
          ].map(([nama, nilai, Ikon, ke]) => (
            <Link key={nama} to={ke} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderTop: '1px solid #f1f3f5', fontSize: '0.9rem', color: '#1f2933' }}>
              <Ikon size={17} color="#5b6673" /> <span style={{ flex: 1 }}>{nama}</span> <strong>{nilai || 0}</strong>
            </Link>
          ))}
        </Kartu>
      </div>
    </div>
  );
}
