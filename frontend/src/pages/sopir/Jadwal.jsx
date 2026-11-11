import { useEffect, useState } from 'react';
import axios from 'axios';
import { Truck, Clock, X, Camera, ClipboardCheck, Users, Play, CheckCircle } from 'lucide-react';
import { API_URL } from '../../config';
import PilihFoto from '../../components/PilihFoto';

const KONDISI = [
  { value: 'baik', label: 'Baik', desc: 'Kendaraan siap digunakan', warna: '#059669', bg: '#d1fae5' },
  { value: 'rusak ringan', label: 'Rusak Ringan', desc: 'Masih bisa jalan, perlu perbaikan', warna: '#d97706', bg: '#fef3c7' },
  { value: 'rusak berat', label: 'Rusak Berat', desc: 'Tidak layak jalan', warna: '#dc2626', bg: '#fee2e2' },
];
const infoKondisi = (k) => KONDISI.find(x => x.value === k);

const STATUS_WARNA = {
  menunggu: ['#e0e7ff', '#4f46e5'], berjalan: ['#fef3c7', '#d97706'], selesai: ['#d1fae5', '#059669'], batal: ['#f3f4f6', '#6b7280'],
};

function LangkahPemeriksaan({ judul, kondisiHasil, catatanHasil, foto, bisa, alasan, onPeriksa }) {
  const info = infoKondisi(kondisiHasil);
  return (
    <div style={{ flex: 1, minWidth: '220px', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '14px' }}>
      <div style={{ fontWeight: 700, color: '#374151', marginBottom: '8px', fontSize: '0.9rem' }}>{judul}</div>
      {info ? (
        <>
          <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', background: info.bg, color: info.warna }}>{info.label.toUpperCase()}</span>
          {catatanHasil && <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: '8px' }}>{catatanHasil}</div>}
          {foto && (
            <a href={`${API_URL}/uploads/${foto}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '8px', fontSize: '0.82rem', color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}>
              <Camera size={14} /> Lihat foto
            </a>
          )}
        </>
      ) : bisa ? (
        <button onClick={onPeriksa} style={{ width: '100%', padding: '10px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <ClipboardCheck size={16} /> Periksa Kendaraan
        </button>
      ) : (
        <div style={{ fontSize: '0.82rem', color: '#9ca3af' }}>{alasan}</div>
      )}
    </div>
  );
}

// Langkah pelaksanaan pengangkutan: mulai, lalu selesai dengan foto kegiatan
function LangkahPengangkutan({ j, onMulai, onSelesai }) {
  const siap = j.kondisi_berangkat && j.kondisi_berangkat !== 'rusak berat';
  return (
    <div style={{ flex: 1, minWidth: '220px', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '14px' }}>
      <div style={{ fontWeight: 700, color: '#374151', marginBottom: '8px', fontSize: '0.9rem' }}>2. Pelaksanaan Pengangkutan</div>
      {j.status === 'menunggu' && (siap ? (
        <button onClick={onMulai} style={{ width: '100%', padding: '10px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <Play size={16} /> Mulai Pengangkutan
        </button>
      ) : (
        <div style={{ fontSize: '0.82rem', color: j.kondisi_berangkat === 'rusak berat' ? '#dc2626' : '#9ca3af' }}>
          {j.kondisi_berangkat === 'rusak berat' ? 'Armada rusak berat, menunggu admin mengganti armada' : 'Periksa armada sebelum berangkat dulu'}
        </div>
      ))}
      {j.status === 'berjalan' && (
        <button onClick={onSelesai} style={{ width: '100%', padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <CheckCircle size={16} /> Selesaikan & Kirim Foto
        </button>
      )}
      {j.status === 'selesai' && (
        <>
          <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', background: '#d1fae5', color: '#059669' }}>SELESAI</span>
          {j.foto_kegiatan && (
            <a href={`${API_URL}/uploads/${j.foto_kegiatan}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', fontSize: '0.82rem', color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}>
              <Camera size={14} /> Lihat foto kegiatan
            </a>
          )}
        </>
      )}
      {j.status === 'batal' && <div style={{ fontSize: '0.82rem', color: '#9ca3af' }}>Jadwal dibatalkan</div>}
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
    <div style={{ padding: '40px', fontFamily: 'Inter, sans-serif' }}>
      <h1 style={{ margin: '0 0 8px', color: '#111827' }}>Jadwal Pengangkutan</h1>
      <p style={{ color: '#6b7280', margin: '0 0 30px' }}>Periksa armada sebelum berangkat, laksanakan pengangkutan bersama kru, lalu periksa kembali armada sesudah pulang dari TPA. Foto boleh diambil dari galeri.</p>

      {list.length === 0 ? (
        <div style={{ background: 'white', padding: '40px', textAlign: 'center', borderRadius: '16px', color: '#6b7280' }}>
          Belum ada jadwal pengangkutan untuk Anda.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {list.map(j => {
            const [bg, fg] = STATUS_WARNA[j.status] || STATUS_WARNA.menunggu;
            return (
              <div key={j.id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', background: bg, color: fg }}>{j.status.toUpperCase()}</span>
                  <span style={{ fontWeight: 'bold', color: '#374151', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={16} /> {new Date(j.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} • Pukul {j.jam}
                  </span>
                </div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.3rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {j.lokasi_tampil}
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', background: j.jenis === 'rutin' ? '#e0f2fe' : '#fae8ff', color: j.jenis === 'rutin' ? '#0369a1' : '#a21caf' }}>
                    {j.jenis === 'rutin' ? 'RUTIN' : 'TAMBAHAN'}
                  </span>
                </h3>
                {j.alamat_pelayanan && <div style={{ color: '#374151', fontSize: '0.92rem' }}>Titik: {j.alamat_pelayanan}</div>}
                {(j.desa || j.kecamatan) && <div style={{ color: '#6b7280', fontSize: '0.88rem' }}>{[j.desa, j.kecamatan].filter(Boolean).join(' • ')}</div>}
                {j.tps_names && <div style={{ color: '#6b7280', fontSize: '0.88rem' }}>TPS: {j.tps_names}</div>}
                {j.pemohon && <div style={{ color: '#a21caf', fontSize: '0.88rem' }}>Permohonan dari: {j.pemohon}</div>}
                <div style={{ color: '#6b7280', fontSize: '0.85rem', margin: '4px 0 12px' }}>
                  Ritase: {j.ritase || 1}x{j.jarak_km ? ` • ±${j.jarak_km} km` : ''}{j.durasi_jam ? ` • ±${j.durasi_jam} jam` : ''}
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#4b5563', background: '#f3f4f6', padding: '8px 12px', borderRadius: '8px' }}>
                    <Truck size={16} color="#0ea5e9" /> {j.nomor_polisi} - {j.jenis_kendaraan}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#4b5563', background: '#f3f4f6', padding: '8px 12px', borderRadius: '8px' }}>
                    <Users size={16} color="#0ea5e9" /> Kru: {j.kru_names || '-'}
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '28px', width: '100%', maxWidth: '480px', margin: '16px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#111827', textTransform: 'capitalize' }}>Pemeriksaan {modal.jenis}</h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 18px' }}>{modal.jadwal.nomor_polisi} — {modal.jadwal.lokasi_tampil}</p>
            <form onSubmit={kirim} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>Kondisi Kendaraan <span style={{ color: '#dc2626' }}>*</span></label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {KONDISI.map(k => (
                    <label key={k.value} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', border: `1.5px solid ${kondisi === k.value ? k.warna : '#e5e7eb'}`, background: kondisi === k.value ? k.bg : 'white' }}>
                      <input type="radio" name="kondisi" value={k.value} checked={kondisi === k.value} onChange={() => setKondisi(k.value)} />
                      <span><strong style={{ color: k.warna }}>{k.label}</strong><span style={{ display: 'block', fontSize: '0.8rem', color: '#6b7280' }}>{k.desc}</span></span>
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
                  Catatan {kondisi === 'baik' ? <span style={{ color: '#9ca3af', fontWeight: '400' }}>(opsional)</span> : <span style={{ color: '#dc2626' }}>*</span>}
                </label>
                <textarea rows={3} value={catatan} onChange={e => setCatatan(e.target.value)} placeholder={kondisi === 'baik' ? 'Contoh: Oli, rem, lampu, dan ban dalam kondisi baik' : 'Jelaskan bagian yang rusak, contoh: rem blong, ban bocor'}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #e5e7eb', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }} />
              </div>
              {kondisi === 'rusak berat' && (
                <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 12px', borderRadius: '10px', fontSize: '0.82rem' }}>
                  Kendaraan akan ditandai <strong>maintenance</strong> dan {modal.jenis === 'sebelum berangkat' ? 'pengangkutan tidak dapat dimulai sampai admin mengganti armada.' : 'tidak dapat dijadwalkan sampai diperbaiki.'}
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setModal(null)} style={{ flex: 1, padding: '12px', border: '1px solid #e5e7eb', background: 'white', color: '#4b5563', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={submitting} style={{ flex: 2, padding: '12px', border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: 'white', borderRadius: '10px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Menyimpan...' : 'Simpan Hasil Pemeriksaan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalSelesai && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '28px', width: '100%', maxWidth: '480px', margin: '16px', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#111827' }}>Selesaikan Pengangkutan</h3>
              <button onClick={() => setModalSelesai(null)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 18px' }}>{modalSelesai.nomor_polisi} — {modalSelesai.lokasi_tampil}</p>
            <form onSubmit={kirimSelesai} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>Foto Pelaksanaan Pengangkutan <span style={{ color: '#dc2626' }}>*</span></label>
                <PilihFoto onChange={f => setFotoFile(f)} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>Catatan <span style={{ color: '#9ca3af', fontWeight: '400' }}>(opsional)</span></label>
                <textarea rows={3} value={catatan} onChange={e => setCatatan(e.target.value)} placeholder="Contoh: Sampah TPS terangkut semua dan dibuang ke TPA"
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #e5e7eb', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setModalSelesai(null)} style={{ flex: 1, padding: '12px', border: '1px solid #e5e7eb', background: 'white', color: '#4b5563', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={submitting} style={{ flex: 2, padding: '12px', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', borderRadius: '10px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
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
