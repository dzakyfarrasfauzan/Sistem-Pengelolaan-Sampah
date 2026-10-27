import { useEffect, useState } from 'react';
import axios from 'axios';
import { Truck, Clock, X, Camera, ClipboardCheck, User } from 'lucide-react';
import { API_URL } from '../../config';
import KameraLangsung from '../../components/KameraLangsung';

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

// Halaman sopir: pemeriksaan kesiapan armada sebelum berangkat & sesudah pulang dari TPA
export default function SopirJadwal() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { jadwal, jenis }
  const [kondisi, setKondisi] = useState('baik');
  const [catatan, setCatatan] = useState('');
  const [fotoFile, setFotoFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
    if (!fotoFile) { alert('Foto kondisi kendaraan wajib diambil'); return; }
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

  if (loading) return <div style={{ padding: '40px' }}>Memuat jadwal...</div>;

  return (
    <div style={{ padding: '40px', fontFamily: 'Inter, sans-serif' }}>
      <h1 style={{ margin: '0 0 8px', color: '#111827' }}>Pemeriksaan Armada</h1>
      <p style={{ color: '#6b7280', margin: '0 0 30px' }}>Periksa kesiapan kendaraan sebelum berangkat dan sesudah pulang dari TPA, lalu foto kondisinya langsung dari kamera.</p>

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
                <h3 style={{ margin: '0 0 4px', fontSize: '1.3rem', color: '#111827' }}>{j.nama_tps}</h3>
                <div style={{ color: '#6b7280', marginBottom: '12px' }}>{j.alamat}</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#4b5563', background: '#f3f4f6', padding: '8px 12px', borderRadius: '8px' }}>
                    <Truck size={16} color="#0ea5e9" /> {j.nomor_polisi} - {j.jenis_kendaraan}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#4b5563', background: '#f3f4f6', padding: '8px 12px', borderRadius: '8px' }}>
                    <User size={16} color="#0ea5e9" /> Petugas: {j.petugas_name || '-'}
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
                  <LangkahPemeriksaan
                    judul="2. Sesudah Pulang dari TPA"
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
            <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 18px' }}>{modal.jadwal.nomor_polisi} — {modal.jadwal.nama_tps}</p>
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
                <KameraLangsung onCapture={f => setFotoFile(f)} />
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
                  Kendaraan akan ditandai <strong>maintenance</strong> dan {modal.jenis === 'sebelum berangkat' ? 'petugas tidak dapat memulai pengangkutan dengan armada ini.' : 'tidak dapat dijadwalkan sampai diperbaiki.'}
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
    </div>
  );
}
