import { useEffect, useState } from 'react';
import axios from 'axios';
import { Truck, Clock, X, Camera, ClipboardCheck, Users, Play, CheckCircle } from 'lucide-react';
import { API_URL } from '../../config';
import PilihFoto from '../../components/PilihFoto';

const KONDISI = [
  { value: 'baik', label: 'Baik', desc: 'Kendaraan siap digunakan', warna: '#1f6b47', bg: '#e7f1eb' },
  { value: 'rusak ringan', label: 'Rusak Ringan', desc: 'Masih bisa jalan, perlu perbaikan', warna: '#d97706', bg: '#fef3c7' },
  { value: 'rusak berat', label: 'Rusak Berat', desc: 'Tidak layak jalan', warna: '#dc2626', bg: '#fee2e2' },
];
const infoKondisi = (k) => KONDISI.find(x => x.value === k);

const STATUS_WARNA = {
  menunggu: ['#e7f1eb', '#1f6b47'], berjalan: ['#fef3c7', '#d97706'], selesai: ['#e7f1eb', '#1f6b47'], batal: ['#f3f4f6', '#5b6673'],
};

function LangkahPemeriksaan({ judul, kondisiHasil, catatanHasil, foto, bisa, alasan, onPeriksa }) {
  const info = infoKondisi(kondisiHasil);
  return (
    <div style={{ flex: 1, minWidth: '220px', border: '1px solid #d8dde3', borderRadius: '6px', padding: '14px' }}>
      <div style={{ fontWeight: 700, color: '#374151', marginBottom: '8px', fontSize: '0.9rem' }}>{judul}</div>
      {info ? (
        <>
          <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', background: info.bg, color: info.warna }}>{info.label.toUpperCase()}</span>
          {catatanHasil && <div style={{ fontSize: '0.82rem', color: '#5b6673', marginTop: '8px' }}>{catatanHasil}</div>}
          {foto && (
            <a href={`${API_URL}/uploads/${foto}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '8px', fontSize: '0.82rem', color: '#17533a', fontWeight: 600, textDecoration: 'none' }}>
              <Camera size={14} /> Lihat foto
            </a>
          )}
        </>
      ) : bisa ? (
        <button onClick={onPeriksa} style={{ width: '100%', padding: '10px', background: '#1f6b47', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <ClipboardCheck size={16} /> Periksa Kendaraan
        </button>
      ) : (
        <div style={{ fontSize: '0.82rem', color: '#8a939d' }}>{alasan}</div>
      )}
    </div>
  );
}

// Langkah pelaksanaan pengangkutan: mulai, lalu selesai dengan foto kegiatan
function LangkahPengangkutan({ j, onMulai, onSelesai }) {
  const siap = j.kondisi_berangkat && j.kondisi_berangkat !== 'rusak berat';
  return (
    <div style={{ flex: 1, minWidth: '220px', border: '1px solid #d8dde3', borderRadius: '6px', padding: '14px' }}>
      <div style={{ fontWeight: 700, color: '#374151', marginBottom: '8px', fontSize: '0.9rem' }}>2. Pelaksanaan Pengangkutan</div>
      {j.status === 'menunggu' && (siap ? (
        <button onClick={onMulai} style={{ width: '100%', padding: '10px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <Play size={16} /> Mulai Pengangkutan
        </button>
      ) : (
        <div style={{ fontSize: '0.82rem', color: j.kondisi_berangkat === 'rusak berat' ? '#dc2626' : '#8a939d' }}>
          {j.kondisi_berangkat === 'rusak berat' ? 'Armada rusak berat, menunggu admin mengganti armada' : 'Periksa armada sebelum berangkat dulu'}
        </div>
      ))}
      {j.status === 'berjalan' && (
        <button onClick={onSelesai} style={{ width: '100%', padding: '10px', background: '#1f6b47', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <CheckCircle size={16} /> Selesaikan & Kirim Foto
        </button>
      )}
      {j.status === 'selesai' && (
        <>
          <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', background: '#e7f1eb', color: '#1f6b47' }}>SELESAI</span>
          {j.foto_kegiatan && (
            <a href={`${API_URL}/uploads/${j.foto_kegiatan}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', fontSize: '0.82rem', color: '#17533a', fontWeight: 600, textDecoration: 'none' }}>
              <Camera size={14} /> Lihat foto kegiatan
            </a>
          )}
        </>
      )}
      {j.status === 'batal' && <div style={{ fontSize: '0.82rem', color: '#8a939d' }}>Jadwal dibatalkan</div>}
    </div>
  );
}

// Halaman sopir: pemeriksaan armada, pelaksanaan pengangkutan, dan foto kegiatan
export default function SopirJadwal() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { jadwal, jenis }
  const [kondisi, setKondisi] = useState('baik');
  const [catatan, setCatatan] = useState('');
  const [fotoFile, setFotoFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalSelesai, setModalSelesai] = useState(null);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/sopir/jadwal`, { withCredentials: true });
      if (res.data.success) setList(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => { await fetchData(); };
    load();
  }, []);

  const bukaModal = (jadwal, jenis) => {
    setModal({ jadwal, jenis });
    setKondisi('baik');
    setCatatan('');
    setFotoFile(null);
  };

  const kirim = async (e) => {
    e.preventDefault();
    if (!fotoFile) { alert('Foto kondisi kendaraan wajib dilampirkan'); return; }
    if (kondisi !== 'baik' && !catatan.trim()) { alert('Jelaskan kerusakan kendaraan pada catatan'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('jenis', modal.jenis);
      fd.append('kondisi', kondisi);
      fd.append('catatan', catatan);
      fd.append('foto', fotoFile);
      await axios.post(`${API_URL}/sopir/jadwal/${modal.jadwal.id}/pemeriksaan`, fd, { withCredentials: true });
      setModal(null);
      fetchData();
    } catch (err) {
      alert('Gagal menyimpan pemeriksaan: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const mulai = async (j) => {
    if (!window.confirm(`Mulai pengangkutan di ${j.lokasi_tampil}?`)) return;
    try {
      const fd = new FormData();
      fd.append('status', 'berjalan');
      await axios.put(`${API_URL}/sopir/jadwal/${j.id}/status`, fd, { withCredentials: true });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memulai pengangkutan');
    }
  };

  const bukaSelesai = (j) => {
    setModalSelesai(j);
    setCatatan('');
    setFotoFile(null);
  };

  const kirimSelesai = async (e) => {
    e.preventDefault();
    if (!fotoFile) { alert('Foto pelaksanaan pengangkutan wajib dilampirkan'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('status', 'selesai');
      fd.append('catatan', catatan);
      fd.append('foto', fotoFile);
      const res = await axios.put(`${API_URL}/sopir/jadwal/${modalSelesai.id}/status`, fd, { withCredentials: true });
      setModalSelesai(null);
      if (res.data.message) alert(res.data.message);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyelesaikan pengangkutan');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: '40px' }}>Memuat jadwal...</div>;

  return (
    <div style={{ padding: '40px', fontFamily: 'inherit' }}>
      <h1 style={{ margin: '0 0 8px', color: '#1f2933' }}>Jadwal Pengangkutan</h1>
      <p style={{ color: '#5b6673', margin: '0 0 30px' }}>Periksa armada sebelum berangkat, laksanakan pengangkutan bersama kru, lalu periksa kembali armada sesudah pulang dari TPA. Foto boleh diambil dari galeri.</p>

      {list.length === 0 ? (
        <div style={{ background: 'white', padding: '40px', textAlign: 'center', borderRadius: '6px', color: '#5b6673' }}>
          Belum ada jadwal pengangkutan untuk Anda.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {list.map(j => {
            const [bg, fg] = STATUS_WARNA[j.status] || STATUS_WARNA.menunggu;
            return (
              <div key={j.id} style={{ background: 'white', border: '1px solid #d8dde3', borderRadius: '6px', padding: '24px', boxShadow: '0 1px 2px rgba(16,24,40,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', background: bg, color: fg }}>{j.status.toUpperCase()}</span>
                  <span style={{ fontWeight: 'bold', color: '#374151', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={16} /> {new Date(j.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} • Pukul {j.jam}
                  </span>
                </div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.3rem', color: '#1f2933', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {j.lokasi_tampil}
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: j.jenis === 'rutin' ? '#e6eef5' : '#fbf1e6', color: j.jenis === 'rutin' ? '#1d4f73' : '#8a4b0f' }}>
                    {j.jenis === 'rutin' ? 'RUTIN' : 'TAMBAHAN'}
                  </span>
                </h3>
                {j.alamat_pelayanan && <div style={{ color: '#374151', fontSize: '0.92rem' }}>Titik: {j.alamat_pelayanan}</div>}
                {(j.desa || j.kecamatan) && <div style={{ color: '#5b6673', fontSize: '0.88rem' }}>{[j.desa, j.kecamatan].filter(Boolean).join(' • ')}</div>}
                {j.tps_names && <div style={{ color: '#5b6673', fontSize: '0.88rem' }}>TPS: {j.tps_names}</div>}
                {j.kode_laporan && (
                  <div style={{ background: '#fdf8f2', border: '1px solid #ecd5bb', borderRadius: '6px', padding: '10px 12px', margin: '6px 0', fontSize: '0.88rem', color: '#5c3209' }}>
                    <div style={{ fontWeight: 700 }}>Laporan {j.kode_laporan}{j.prioritas_laporan ? ` • prioritas ${j.prioritas_laporan}` : ''}</div>
                    {j.pemohon && <div>Pelapor: {j.pemohon}</div>}
                    {j.deskripsi_laporan && <div style={{ color: '#7a4512' }}>{j.deskripsi_laporan}</div>}
                    {j.patokan_laporan && <div>Patokan: {j.patokan_laporan}</div>}
                    {j.lat_laporan && j.lng_laporan && (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${j.lat_laporan},${j.lng_laporan}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>Buka lokasi di Google Maps</a>
                    )}
                    <div style={{ fontSize: '0.78rem', color: '#8a4b0f', marginTop: '4px' }}>Saat pengangkutan selesai, laporan ini ikut selesai dan pelapor dapat memberi penilaian.</div>
                  </div>
                )}
                {!j.kode_laporan && j.pemohon && <div style={{ color: '#8a4b0f', fontSize: '0.88rem' }}>Permohonan dari: {j.pemohon}</div>}
                <div style={{ color: '#5b6673', fontSize: '0.85rem', margin: '4px 0 12px' }}>
                  {[j.jenis === 'rutin' ? `Ritase: ${j.ritase || 1}x` : '', j.jarak_km ? `Jarak ±${j.jarak_km} km` : ''].filter(Boolean).join(' • ')}
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#4b5563', background: '#f3f4f6', padding: '8px 12px', borderRadius: '4px' }}>
                    <Truck size={16} color="#1f6b47" /> {j.nomor_polisi} - {j.jenis_kendaraan}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#4b5563', background: '#f3f4f6', padding: '8px 12px', borderRadius: '4px' }}>
                    <Users size={16} color="#1f6b47" /> Kru: {j.kru_names || '-'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <LangkahPemeriksaan
                    judul="1. Sebelum Berangkat"
                    kondisiHasil={j.kondisi_berangkat} catatanHasil={j.catatan_berangkat} foto={j.foto_berangkat}
                    bisa={j.status === 'menunggu'}
                    alasan="Jadwal sudah berjalan tanpa pemeriksaan"
                    onPeriksa={() => bukaModal(j, 'sebelum berangkat')}
                  />
                  <LangkahPengangkutan j={j} onMulai={() => mulai(j)} onSelesai={() => bukaSelesai(j)} />
                  <LangkahPemeriksaan
                    judul="3. Sesudah Pulang dari TPA"
                    kondisiHasil={j.kondisi_pulang} catatanHasil={j.catatan_pulang} foto={j.foto_pulang}
                    bisa={j.status === 'selesai' && !!j.kondisi_berangkat}
                    alasan={!j.kondisi_berangkat ? 'Lakukan pemeriksaan sebelum berangkat dulu' : 'Tersedia setelah pengangkutan selesai'}
                    onPeriksa={() => bukaModal(j, 'sesudah pulang')}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '6px', padding: '28px', width: '100%', maxWidth: '480px', margin: '16px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 1px 2px rgba(16,24,40,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#1f2933', textTransform: 'capitalize' }}>Pemeriksaan {modal.jenis}</h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: '#8a939d', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <p style={{ color: '#5b6673', fontSize: '0.85rem', margin: '0 0 18px' }}>{modal.jadwal.nomor_polisi} — {modal.jadwal.lokasi_tampil}</p>
            <form onSubmit={kirim} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>Kondisi Kendaraan <span style={{ color: '#dc2626' }}>*</span></label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {KONDISI.map(k => (
                    <label key={k.value} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '6px', cursor: 'pointer', border: `1.5px solid ${kondisi === k.value ? k.warna : '#d8dde3'}`, background: kondisi === k.value ? k.bg : 'white' }}>
                      <input type="radio" name="kondisi" value={k.value} checked={kondisi === k.value} onChange={() => setKondisi(k.value)} />
                      <span><strong style={{ color: k.warna }}>{k.label}</strong><span style={{ display: 'block', fontSize: '0.8rem', color: '#5b6673' }}>{k.desc}</span></span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>Foto Kondisi Kendaraan <span style={{ color: '#dc2626' }}>*</span></label>
                <PilihFoto onChange={f => setFotoFile(f)} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>
                  Catatan {kondisi === 'baik' ? <span style={{ color: '#8a939d', fontWeight: '400' }}>(opsional)</span> : <span style={{ color: '#dc2626' }}>*</span>}
                </label>
                <textarea rows={3} value={catatan} onChange={e => setCatatan(e.target.value)} placeholder={kondisi === 'baik' ? 'Contoh: Oli, rem, lampu, dan ban dalam kondisi baik' : 'Jelaskan bagian yang rusak, contoh: rem blong, ban bocor'}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1.5px solid #d8dde3', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }} />
              </div>
              {kondisi === 'rusak berat' && (
                <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 12px', borderRadius: '6px', fontSize: '0.82rem' }}>
                  Kendaraan akan ditandai <strong>maintenance</strong> dan {modal.jenis === 'sebelum berangkat' ? 'pengangkutan tidak dapat dimulai sampai admin mengganti armada.' : 'tidak dapat dijadwalkan sampai diperbaiki.'}
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setModal(null)} style={{ flex: 1, padding: '12px', border: '1px solid #d8dde3', background: 'white', color: '#4b5563', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={submitting} style={{ flex: 2, padding: '12px', border: 'none', background: '#1f6b47', color: 'white', borderRadius: '6px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Menyimpan...' : 'Simpan Hasil Pemeriksaan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalSelesai && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '6px', padding: '28px', width: '100%', maxWidth: '480px', margin: '16px', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#1f2933' }}>Selesaikan Pengangkutan</h3>
              <button onClick={() => setModalSelesai(null)} style={{ background: 'none', border: 'none', color: '#8a939d', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <p style={{ color: '#5b6673', fontSize: '0.85rem', margin: '0 0 18px' }}>{modalSelesai.nomor_polisi} — {modalSelesai.lokasi_tampil}</p>
            <form onSubmit={kirimSelesai} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>Foto Pelaksanaan Pengangkutan <span style={{ color: '#dc2626' }}>*</span></label>
                <PilihFoto onChange={f => setFotoFile(f)} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>Catatan <span style={{ color: '#8a939d', fontWeight: '400' }}>(opsional)</span></label>
                <textarea rows={3} value={catatan} onChange={e => setCatatan(e.target.value)} placeholder="Contoh: Sampah TPS terangkut semua dan dibuang ke TPA"
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1.5px solid #d8dde3', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setModalSelesai(null)} style={{ flex: 1, padding: '12px', border: '1px solid #d8dde3', background: 'white', color: '#4b5563', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={submitting} style={{ flex: 2, padding: '12px', border: 'none', background: '#1f6b47', color: 'white', borderRadius: '6px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Menyimpan...' : 'Kirim & Selesaikan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
