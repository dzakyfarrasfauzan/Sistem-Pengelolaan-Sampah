import { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckCircle2, X, Send, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_URL } from '../../config';
import PilihFoto from '../../components/PilihFoto';

export default function Laporan() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState(null); // laporan yang sedang ditangani
  const [formAction, setFormAction] = useState({ status: 'diproses', catatan_tindak_lanjut: '' });
  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState(null);
  const [fotoFile, setFotoFile] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/sopir/laporan`, { withCredentials: true });
      if (res.data.success) {
        setList(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      await fetchData();
    };
    load();
  }, []);

  const handleOpenAction = (laporan) => {
    setActionModal(laporan);
    setFormAction({ status: 'diproses', catatan_tindak_lanjut: '' });
    setFotoFile(null);
  };

  const handleSubmitAction = async (e) => {
    e.preventDefault();
    if (formAction.status === 'selesai' && !fotoFile && !actionModal.foto_tindak_lanjut) {
      alert('Foto kegiatan penanganan wajib diunggah saat laporan ditandai selesai');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('status', formAction.status);
      fd.append('catatan_tindak_lanjut', formAction.catatan_tindak_lanjut);
      if (fotoFile) fd.append('foto', fotoFile);
      await axios.put(
        `${API_URL}/sopir/laporan/${actionModal.id}`,
        fd,
        { withCredentials: true }
      );
      setSuccessId(actionModal.id);
      setActionModal(null);
      fetchData();
      setTimeout(() => setSuccessId(null), 3000);
    } catch (err) {
      alert('Gagal memperbarui laporan: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityColor = (prioritas) => {
    switch (prioritas) {
      case 'tinggi': return { bg: '#fee2e2', text: '#dc2626', border: '#fecaca' };
      case 'sedang': return { bg: '#fef3c7', text: '#d97706', border: '#fde68a' };
      default:       return { bg: '#e6eef5', text: '#17533a', border: '#c7d8e6' };
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'diproses': return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
      default:         return { bg: '#f3f4f6', text: '#5b6673', border: '#d8dde3' };
    }
  };

  if (loading) return <div style={{ padding: '40px' }}>Memuat data laporan warga...</div>;

  return (
    <div style={{ padding: '40px', fontFamily: 'inherit' }}>
      <h1 style={{ margin: '0 0 8px', color: '#1f2933' }}>Laporan Masyarakat</h1>
      <p style={{ color: '#5b6673', margin: '0 0 30px' }}>
        Laporan masyarakat yang dijadwalkan admin kepada Anda, diurutkan berdasarkan prioritas. Pengangkutannya dikerjakan lewat menu Jadwal.
      </p>

      {/* Success toast */}
      {successId && (
        <div style={{
          background: '#e7f1eb', color: '#1f6b47', border: '1px solid #b9d8c6',
          padding: '12px 20px', borderRadius: '6px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600'
        }}>
          <CheckCircle2 size={18} /> Status laporan berhasil diperbarui!
        </div>
      )}

      {list.length === 0 ? (
        <div style={{ background: 'white', padding: '40px', textAlign: 'center', borderRadius: '6px', color: '#5b6673' }}>
          <CheckCircle2 size={40} color="#1f6b47" style={{ marginBottom: '12px' }} />
          <div>Belum ada laporan yang ditugaskan kepada Anda.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {list.map(l => {
            const pColor = getPriorityColor(l.prioritas);
            const sColor = getStatusColor(l.status);
            return (
              <div key={l.id} style={{
                background: 'white', border: `1px solid ${l.prioritas === 'tinggi' ? '#fecaca' : '#d8dde3'}`,
                borderRadius: '6px', padding: '24px', boxShadow: '0 1px 2px rgba(16,24,40,0.06)',
                display: 'flex', flexDirection: 'column', gap: '14px',
                borderLeft: `4px solid ${pColor.text}`
              }}>
                {/* Header badges */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700',
                    background: pColor.bg, color: pColor.text, border: `1px solid ${pColor.border}`
                  }}>
                    PRIORITAS {(l.prioritas || 'belum ditentukan').toUpperCase()}
                  </span>
                  <span style={{
                    padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600',
                    background: sColor.bg, color: sColor.text, border: `1px solid ${sColor.border}`
                  }}>
                    {l.status === 'diproses' ? 'Sedang Diproses' : 'Baru Masuk'}
                  </span>
                </div>

                {/* Kode & Tanggal */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#8a939d' }}>
                  <span style={{ fontWeight: '700', color: '#374151' }}>{l.kode_laporan}</span>
                  <span>{new Date(l.created_at).toLocaleDateString('id-ID')}</span>
                </div>

                {/* Foto Bukti */}
                {l.foto ? (
                  <a href={`${API_URL}/uploads/${l.foto}`} target="_blank" rel="noopener noreferrer" title="Klik untuk lihat foto penuh">
                    <img
                      src={`${API_URL}/uploads/${l.foto}`}
                      alt="Foto bukti sampah"
                      style={{
                        width: '100%', height: '160px', objectFit: 'cover',
                        borderRadius: '6px', display: 'block',
                        border: '1px solid #d8dde3', cursor: 'zoom-in',
                        transition: 'opacity 0.2s',
                      }}
                      onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
                      onMouseOut={e => e.currentTarget.style.opacity = '1'}
                    />
                  </a>
                ) : (
                  <div style={{
                    height: '100px', borderRadius: '6px', background: '#f3f4f6',
                    border: '1.5px dashed #d1d5db',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    color: '#8a939d', gap: '6px', fontSize: '0.8rem'
                  }}>
                    <ImageIcon size={24} />
                    Tidak ada foto bukti
                  </div>
                )}

                {/* Alamat */}
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#1f2933', marginBottom: '4px' }}>
                    {l.alamat_lokasi || 'Lokasi tidak diketahui'}
                  </div>
                  <p style={{ margin: 0, color: '#4b5563', fontSize: '0.9rem', lineHeight: '1.5' }}>"{l.deskripsi}"</p>
                  {l.latitude && l.longitude && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${l.latitude},${l.longitude}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        marginTop: '8px', fontSize: '0.78rem', fontWeight: '700',
                        color: 'white', background: '#2563eb',
                        padding: '5px 12px', borderRadius: '4px', textDecoration: 'none',
                        transition: 'opacity 0.2s',
                      }}
                      onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
                      onMouseOut={e => e.currentTarget.style.opacity = '1'}
                    >
                      Buka di Google Maps
                    </a>
                  )}
                </div>

                {/* Pelapor */}
                <div style={{ background: '#f7f8f9', padding: '12px', borderRadius: '4px', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: '700', color: '#374151' }}>{l.nama_pelapor}</div>
                  <div style={{ color: '#5b6673', marginTop: '2px' }}>{l.nomor_telepon}</div>
                </div>

                {/* Catatan tindak lanjut sebelumnya */}
                {l.catatan_tindak_lanjut && (
                  <div style={{ fontSize: '0.83rem', color: '#4b5563', fontStyle: 'italic', background: '#f7f8f9', padding: '8px 12px', borderRadius: '4px' }}>
                    "{l.catatan_tindak_lanjut}"
                  </div>
                )}

                {/* Foto kegiatan penanganan */}
                {l.foto_tindak_lanjut && (
                  <a href={`${API_URL}/uploads/${l.foto_tindak_lanjut}`} target="_blank" rel="noopener noreferrer"
                     style={{ fontSize: '0.83rem', color: '#2563eb', fontWeight: '600', textDecoration: 'none' }}>
                    Lihat foto kegiatan penanganan
                  </a>
                )}

                {/* Laporan yang sudah dijadwalkan dikerjakan lewat menu Jadwal */}
                {l.jadwal_id ? (
                  <Link to="/sopir/jadwal" style={{
                    display: 'block', textAlign: 'center', padding: '11px', borderRadius: '6px', textDecoration: 'none',
                    background: '#e7f1eb', color: '#17533a', fontWeight: '700', fontSize: '0.9rem', border: '1px solid #b9d8c6'
                  }}>
                    Dijadwalkan {l.jadwal_tanggal} pukul {l.jadwal_jam} — kerjakan di menu Jadwal
                  </Link>
                ) : (
                <button
                  onClick={() => handleOpenAction(l)}
                  style={{
                    width: '100%', padding: '11px', borderRadius: '6px', border: 'none',
                    background: '#2563eb',
                    color: 'white', fontWeight: '700', cursor: 'pointer',
                    fontSize: '0.9rem', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
                  onMouseOut={e => e.currentTarget.style.opacity = '1'}
                >
                  <Send size={15} /> Perbarui Status Penanganan
                </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Aksi Sopir */}
      {actionModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'white', border: '1px solid #e1e5e9', borderRadius: '10px', padding: '36px', width: '100%', maxWidth: '460px',
            boxShadow: '0 1px 2px rgba(16,24,40,0.06)', margin: '16px',
          }}>
            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#1f2933' }}>
                Update Penanganan Laporan
              </h3>
              <button onClick={() => setActionModal(null)} style={{ background: 'none', border: 'none', color: '#8a939d', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ color: '#5b6673', fontSize: '0.85rem', margin: '0 0 24px' }}>
              Kode: <strong>{actionModal.kode_laporan}</strong> — {actionModal.alamat_lokasi}
            </p>

            <form onSubmit={handleSubmitAction} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Status */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>
                  Status Penanganan
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[
                    { value: 'diproses', label: 'Sedang Diproses', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
                    { value: 'selesai',  label: 'Selesai Ditangani', color: '#1f6b47', bg: '#e7f1eb', border: '#b9d8c6' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormAction(p => ({ ...p, status: opt.value }))}
                      style={{
                        padding: '14px 10px', borderRadius: '6px', fontWeight: '700', fontSize: '0.85rem',
                        cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                        border: `2px solid ${formAction.status === opt.value ? opt.color : '#d8dde3'}`,
                        background: formAction.status === opt.value ? opt.bg : 'white',
                        color: formAction.status === opt.value ? opt.color : '#5b6673',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Catatan */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>
                  Catatan Tindak Lanjut <span style={{ color: '#8a939d', fontWeight: '400' }}>(opsional)</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Contoh: Sampah sudah diangkut, lokasi bersih. Koordinasi dengan RT setempat..."
                  value={formAction.catatan_tindak_lanjut}
                  onChange={e => setFormAction(p => ({ ...p, catatan_tindak_lanjut: e.target.value }))}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '6px', border: '1.5px solid #d8dde3',
                    outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit',
                    fontSize: '0.9rem', lineHeight: '1.6', color: '#374151',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#2563eb'}
                  onBlur={e => e.target.style.borderColor = '#d8dde3'}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>
                  Foto Kegiatan {formAction.status === 'selesai'
                    ? <span style={{ color: '#dc2626' }}>*</span>
                    : <span style={{ color: '#8a939d', fontWeight: '400' }}>(opsional)</span>}
                </label>
                <PilihFoto onChange={f => setFotoFile(f)} />
              </div>

              {/* Tombol Submit */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setActionModal(null)} style={{
                  flex: 1, padding: '12px', border: '1px solid #d8dde3', background: 'white',
                  color: '#4b5563', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit'
                }}>
                  Batal
                </button>
                <button type="submit" disabled={submitting} style={{
                  flex: 2, padding: '12px', border: 'none',
                  background: formAction.status === 'selesai'
                    ? '#1f6b47'
                    : '#2563eb',
                  color: 'white', borderRadius: '6px', fontWeight: '700',
                  cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  opacity: submitting ? 0.7 : 1,
                }}>
                  {submitting ? 'Menyimpan...' : <><Send size={15} /> Simpan Update</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
