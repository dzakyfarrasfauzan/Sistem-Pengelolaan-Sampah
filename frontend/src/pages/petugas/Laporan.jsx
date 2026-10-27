import { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckCircle2, X, Send, UserCheck, Image as ImageIcon } from 'lucide-react';
import { API_URL } from '../../config';
import KameraLangsung from '../../components/KameraLangsung';

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
      const res = await axios.get(`${API_URL}/petugas/laporan`, { withCredentials: true });
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
        `${API_URL}/petugas/laporan/${actionModal.id}`,
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
      default:       return { bg: '#e0f2fe', text: '#0284c7', border: '#bae6fd' };
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'diproses': return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
      default:         return { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' };
    }
  };

  if (loading) return <div style={{ padding: '40px' }}>Memuat data laporan warga...</div>;

  return (
    <div style={{ padding: '40px', fontFamily: 'Inter, sans-serif' }}>
      <h1 style={{ margin: '0 0 8px', color: '#111827' }}>Laporan Masyarakat</h1>
      <p style={{ color: '#6b7280', margin: '0 0 30px' }}>
        Laporan masyarakat yang ditugaskan admin kepada Anda, diurutkan berdasarkan prioritas. Update status saat Anda menangani.
      </p>

      {/* Success toast */}
      {successId && (
        <div style={{
          background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0',
          padding: '12px 20px', borderRadius: '12px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <CheckCircle2 size={18} /> Status laporan berhasil diperbarui!
        </div>
      )}

      {list.length === 0 ? (
        <div style={{ background: 'white', padding: '40px', textAlign: 'center', borderRadius: '16px', color: '#6b7280' }}>
          <CheckCircle2 size={40} color="#10b981" style={{ marginBottom: '12px' }} />
          <div>Belum ada laporan yang ditugaskan kepada Anda.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {list.map(l => {
            const pColor = getPriorityColor(l.prioritas);
            const sColor = getStatusColor(l.status);
            return (
              <div key={l.id} style={{
                background: 'white', border: `1px solid ${l.prioritas === 'tinggi' ? '#fecaca' : '#e5e7eb'}`,
                borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                display: 'flex', flexDirection: 'column', gap: '14px',
                borderLeft: `4px solid ${pColor.text}`
              }}>
                {/* Header badges */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700',
                    background: pColor.bg, color: pColor.text, border: `1px solid ${pColor.border}`
                  }}>
                    🔴 PRIORITAS {(l.prioritas || 'belum ditentukan').toUpperCase()}
                  </span>
                  <span style={{
                    padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600',
                    background: sColor.bg, color: sColor.text, border: `1px solid ${sColor.border}`
                  }}>
                    {l.status === 'diproses' ? 'Sedang Diproses' : 'Baru Masuk'}
                  </span>
                </div>

                {/* Kode & Tanggal */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#9ca3af' }}>
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
                        borderRadius: '10px', display: 'block',
                        border: '1px solid #e5e7eb', cursor: 'zoom-in',
                        transition: 'opacity 0.2s',
                      }}
                      onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
                      onMouseOut={e => e.currentTarget.style.opacity = '1'}
                    />
                  </a>
                ) : (
                  <div style={{
                    height: '100px', borderRadius: '10px', background: '#f3f4f6',
                    border: '1.5px dashed #d1d5db',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    color: '#9ca3af', gap: '6px', fontSize: '0.8rem'
                  }}>
                    <ImageIcon size={24} />
                    Tidak ada foto bukti
                  </div>
                )}

                {/* Alamat */}
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#111827', marginBottom: '4px' }}>
                    📍 {l.alamat_lokasi || 'Lokasi tidak diketahui'}
                  </div>
                  <p style={{ margin: 0, color: '#4b5563', fontSize: '0.9rem', lineHeight: '1.5' }}>"{l.deskripsi}"</p>
                  {l.latitude && l.longitude && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${l.latitude},${l.longitude}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        marginTop: '8px', fontSize: '0.78rem', fontWeight: '700',
                        color: 'white', background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                        padding: '5px 12px', borderRadius: '8px', textDecoration: 'none',
                        transition: 'opacity 0.2s',
                      }}
                      onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
                      onMouseOut={e => e.currentTarget.style.opacity = '1'}
                    >
                      🗺️ Buka di Google Maps
                    </a>
                  )}
                </div>

                {/* Pelapor */}
                <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: '700', color: '#374151' }}>👤 {l.nama_pelapor}</div>
                  <div style={{ color: '#6b7280', marginTop: '2px' }}>📞 {l.nomor_telepon}</div>
                </div>

                {/* Sudah ditangani oleh siapa */}
                {l.ditangani_oleh && (
                  <div style={{
                    background: '#eff6ff', padding: '10px 14px', borderRadius: '8px',
                    fontSize: '0.82rem', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '8px',
                    border: '1px solid #bfdbfe'
                  }}>
                    <UserCheck size={14} />
                    <span>Ditangani oleh: <strong>{l.nama_petugas}</strong></span>
                  </div>
                )}

                {/* Catatan tindak lanjut sebelumnya */}
                {l.catatan_tindak_lanjut && (
                  <div style={{ fontSize: '0.83rem', color: '#4b5563', fontStyle: 'italic', background: '#f9fafb', padding: '8px 12px', borderRadius: '8px' }}>
                    💬 "{l.catatan_tindak_lanjut}"
                  </div>
                )}

                {/* Foto kegiatan penanganan */}
                {l.foto_tindak_lanjut && (
                  <a href={`${API_URL}/uploads/${l.foto_tindak_lanjut}`} target="_blank" rel="noopener noreferrer"
                     style={{ fontSize: '0.83rem', color: '#2563eb', fontWeight: '600', textDecoration: 'none' }}>
                    📷 Lihat foto kegiatan penanganan
                  </a>
                )}

                {/* Tombol Aksi */}
                <button
                  onClick={() => handleOpenAction(l)}
                  style={{
                    width: '100%', padding: '11px', borderRadius: '10px', border: 'none',
                    background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
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
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Aksi Petugas */}
      {actionModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'white', borderRadius: '24px', padding: '36px', width: '100%', maxWidth: '460px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.18)', margin: '16px',
          }}>
            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#111827' }}>
                Update Penanganan Laporan
              </h3>
              <button onClick={() => setActionModal(null)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 24px' }}>
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
                    { value: 'diproses', label: '🔄 Sedang Diproses', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
                    { value: 'selesai',  label: '✅ Selesai Ditangani', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormAction(p => ({ ...p, status: opt.value }))}
                      style={{
                        padding: '14px 10px', borderRadius: '12px', fontWeight: '700', fontSize: '0.85rem',
                        cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                        border: `2px solid ${formAction.status === opt.value ? opt.color : '#e5e7eb'}`,
                        background: formAction.status === opt.value ? opt.bg : 'white',
                        color: formAction.status === opt.value ? opt.color : '#6b7280',
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
                  Catatan Tindak Lanjut <span style={{ color: '#9ca3af', fontWeight: '400' }}>(opsional)</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Contoh: Sampah sudah diangkut, lokasi bersih. Koordinasi dengan RT setempat..."
                  value={formAction.catatan_tindak_lanjut}
                  onChange={e => setFormAction(p => ({ ...p, catatan_tindak_lanjut: e.target.value }))}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #e5e7eb',
                    outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit',
                    fontSize: '0.9rem', lineHeight: '1.6', color: '#374151',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#2563eb'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>
                  Foto Kegiatan {formAction.status === 'selesai'
                    ? <span style={{ color: '#dc2626' }}>*</span>
                    : <span style={{ color: '#9ca3af', fontWeight: '400' }}>(opsional)</span>}
                </label>
                <KameraLangsung onCapture={f => setFotoFile(f)} />
              </div>

              {/* Tombol Submit */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setActionModal(null)} style={{
                  flex: 1, padding: '12px', border: '1px solid #e5e7eb', background: 'white',
                  color: '#4b5563', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit'
                }}>
                  Batal
                </button>
                <button type="submit" disabled={submitting} style={{
                  flex: 2, padding: '12px', border: 'none',
                  background: formAction.status === 'selesai'
                    ? 'linear-gradient(135deg, #059669, #047857)'
                    : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: 'white', borderRadius: '10px', fontWeight: '700',
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
