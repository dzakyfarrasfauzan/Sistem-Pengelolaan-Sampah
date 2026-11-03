import { useState } from 'react';
import axios from 'axios';
import { ArrowLeft, Search, FileSearch, CheckCircle2, Clock, AlertCircle, Calendar, User, FileText, MapPin, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

export default function CekStatus() {
  const [search, setSearch] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  // Penilaian pelapor setelah laporan selesai ditangani
  const [nilai, setNilai] = useState(0);
  const [ulasan, setUlasan] = useState('');
  const [telepon, setTelepon] = useState('');
  const [mengirim, setMengirim] = useState(false);

  const kirimPenilaian = async () => {
    if (!nilai) { alert('Pilih jumlah bintang terlebih dahulu'); return; }
    if (!telepon.trim()) { alert('Masukkan nomor telepon yang dipakai saat melapor'); return; }
    setMengirim(true);
    try {
      const res = await axios.post(`${API_URL}/api/public/penilaian`, {
        kode_laporan: result.kode_laporan, nomor_telepon: telepon, rating: nilai, ulasan
      });
      alert(res.data.message);
      setResult({ ...result, rating: nilai, ulasan });
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengirim penilaian');
    } finally {
      setMengirim(false);
    }
  };
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search) return;
    setLoading(true);
    setError('');
    setResult(null);
    setSearched(true);

    try {
      const res = await axios.post(`${API_URL}/api/public/cek-status`, { search }, { withCredentials: true });
      if (res.data.success && res.data.data && res.data.data.length > 0) {
        setResult(res.data.data[0]);
      } else {
        setError('Data laporan tidak ditemukan. Pastikan Kode Laporan atau Nomor WhatsApp benar.');
      }
    } catch {
      setError('Terjadi kesalahan saat mencari data. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status) => {
    switch(status) {
      case 'selesai': return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0', icon: <CheckCircle2 size={16} />, label: 'SELESAI' };
      case 'diproses': return { bg: '#fffbeb', text: '#d97706', border: '#fde68a', icon: <Clock size={16} />, label: 'DIPROSES' };
      case 'dijadwalkan': return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', icon: <Calendar size={16} />, label: 'DIJADWALKAN' };
      default: return { bg: '#eef2ff', text: '#4f46e5', border: '#c7d2fe', icon: <FileText size={16} />, label: 'MASUK' };
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #f0fdf4 0%, #f9fafb 40%, #eef2ff 100%)',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      padding: '0',
    }}>
      {/* Top bar */}
      <div style={{ padding: '20px 24px', maxWidth: '700px', margin: '0 auto' }}>
        <button onClick={() => navigate('/')} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'none', border: 'none', color: '#6b7280',
          fontSize: '0.9rem', cursor: 'pointer', padding: '8px 0',
          fontWeight: '500', fontFamily: 'inherit',
          transition: 'color 0.2s',
        }}
          onMouseOver={e => e.currentTarget.style.color = '#111827'}
          onMouseOut={e => e.currentTarget.style.color = '#6b7280'}
        >
          <ArrowLeft size={18} /> Kembali
        </button>
      </div>

      <div style={{
        maxWidth: '700px', margin: '0 auto', padding: '0 24px 60px',
        animation: 'fadeInUp 0.5s ease-out',
      }}>
        {/* Header card */}
        <div style={{
          background: 'white',
          borderRadius: '24px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04), 0 10px 15px -3px rgba(0,0,0,0.05)',
          border: '1px solid rgba(229,231,235,0.6)',
          padding: '48px 40px',
          marginBottom: '24px',
        }}>
          {/* Icon */}
          <div style={{
            width: '64px', height: '64px', borderRadius: '18px',
            background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
            color: '#4f46e5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <FileSearch size={32} />
          </div>

          <h1 style={{
            textAlign: 'center', margin: '0 0 8px',
            fontSize: '1.8rem', color: '#111827', fontWeight: '800',
            letterSpacing: '-0.5px',
          }}>Cek Status Laporan</h1>
          <p style={{
            color: '#6b7280', margin: '0 0 36px',
            fontSize: '0.95rem', textAlign: 'center', lineHeight: '1.6',
          }}>
            Masukkan Kode Laporan atau Nomor WhatsApp untuk melacak status laporan Anda.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearch} style={{
            display: 'flex', gap: '12px',
          }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={18} style={{
                position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                color: '#9ca3af', pointerEvents: 'none',
              }} />
              <input
                type="text"
                placeholder="LP-17000000000 atau 0812..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '16px 16px 16px 48px',
                  borderRadius: '14px', border: '1.5px solid #e5e7eb',
                  outline: 'none', fontSize: '1rem', fontFamily: 'inherit',
                  background: '#f9fafb', boxSizing: 'border-box',
                  transition: 'all 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.background = 'white'; e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.08)'; }}
                onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#f9fafb'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <button type="submit" disabled={loading} style={{
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              color: 'white', border: 'none', borderRadius: '14px',
              padding: '0 28px', cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              fontWeight: '700', fontFamily: 'inherit', fontSize: '0.95rem',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              whiteSpace: 'nowrap',
            }}
              onMouseOver={e => { if(!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(79, 70, 229, 0.35)'; }}}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.25)'; }}
            >
              {loading ? <Loader2 size={18} style={{ animation: 'spin 0.6s linear infinite' }} /> : <Search size={18} />}
              {loading ? 'Mencari...' : 'Cari'}
            </button>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'white', borderRadius: '16px', padding: '24px',
            border: '1px solid #fecaca',
            display: 'flex', alignItems: 'flex-start', gap: '14px',
            animation: 'fadeInUp 0.3s ease-out',
            marginBottom: '24px',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: '#fef2f2', color: '#dc2626',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <AlertCircle size={20} />
            </div>
            <div>
              <div style={{ fontWeight: '600', color: '#dc2626', marginBottom: '4px' }}>Tidak Ditemukan</div>
              <div style={{ fontSize: '0.9rem', color: '#6b7280', lineHeight: '1.5' }}>{error}</div>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (() => {
          const statusInfo = getStatusInfo(result.status);
          return (
            <div style={{
              background: 'white', borderRadius: '20px',
              border: '1px solid rgba(229,231,235,0.6)',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04), 0 10px 15px -3px rgba(0,0,0,0.05)',
              overflow: 'hidden',
              animation: 'fadeInUp 0.4s ease-out',
            }}>
              {/* Status Header */}
              <div style={{
                padding: '24px 32px',
                background: statusInfo.bg,
                borderBottom: `1px solid ${statusInfo.border}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '4px', fontWeight: '500' }}>Kode Laporan</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#111827', letterSpacing: '-0.5px' }}>{result.kode_laporan}</div>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 16px', borderRadius: '100px',
                  background: 'white', border: `1.5px solid ${statusInfo.border}`,
                  color: statusInfo.text, fontWeight: '700', fontSize: '0.8rem',
                  letterSpacing: '0.5px',
                }}>
                  {statusInfo.icon} {statusInfo.label}
                </div>
              </div>

              {/* Detail Body */}
              <div style={{ padding: '28px 32px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '10px',
                      background: '#f3f4f6', color: '#6b7280',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <User size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: '500', marginBottom: '2px' }}>Nama Pelapor</div>
                      <div style={{ fontWeight: '600', color: '#374151', fontSize: '0.95rem' }}>{result.nama_pelapor}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '10px',
                      background: '#f3f4f6', color: '#6b7280',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Calendar size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: '500', marginBottom: '2px' }}>Tanggal Masuk</div>
                      <div style={{ fontWeight: '600', color: '#374151', fontSize: '0.95rem' }}>
                        {new Date(result.created_at).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ margin: '24px 0', borderTop: '1px solid #f3f4f6' }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: '#f3f4f6', color: '#6b7280',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <FileText size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: '500', marginBottom: '2px' }}>Deskripsi</div>
                    <div style={{ fontWeight: '500', color: '#374151', fontSize: '0.95rem', lineHeight: '1.6' }}>{result.deskripsi}</div>
                  </div>
                </div>

                {result.alamat_lokasi && (
                  <>
                    <div style={{ margin: '24px 0', borderTop: '1px solid #f3f4f6' }} />
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: '#ecfdf5', color: '#059669',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <MapPin size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: '500', marginBottom: '2px' }}>Lokasi</div>
                        <div style={{ fontWeight: '500', color: '#374151', fontSize: '0.95rem', lineHeight: '1.6' }}>{result.alamat_lokasi}</div>
                      </div>
                    </div>
                  </>
                )}

                {/* Kabar penanganan untuk pelapor */}
                {result.status === 'selesai' && (
                  <>
                    <div style={{ margin: '24px 0', borderTop: '1px solid #f3f4f6' }} />
                    <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '14px', padding: '18px' }}>
                      <div style={{ fontWeight: '700', color: '#047857', marginBottom: '6px' }}>Laporan Anda sudah ditangani</div>
                      {result.selesai_at && (
                        <div style={{ fontSize: '0.82rem', color: '#059669', marginBottom: '8px' }}>
                          Selesai pada {new Date(result.selesai_at.replace(' ', 'T') + 'Z').toLocaleString('id-ID')}
                        </div>
                      )}
                      {result.catatan_tindak_lanjut && <div style={{ fontSize: '0.9rem', color: '#374151', lineHeight: '1.6' }}>{result.catatan_tindak_lanjut}</div>}
                      {result.foto_tindak_lanjut && (
                        <img src={`${API_URL}/uploads/${result.foto_tindak_lanjut}`} alt="Foto hasil penanganan"
                          style={{ marginTop: '12px', width: '100%', maxHeight: '240px', objectFit: 'cover', borderRadius: '10px' }} />
                      )}
                    </div>

                    <div style={{ marginTop: '18px', border: '1px solid #fde68a', background: '#fffbeb', borderRadius: '14px', padding: '18px' }}>
                      <div style={{ fontWeight: '700', color: '#92400e', marginBottom: '8px' }}>Penilaian Pelayanan</div>
                      {result.rating ? (
                        <>
                          <div style={{ fontSize: '1.4rem', color: '#f59e0b' }}>{'★'.repeat(result.rating)}{'☆'.repeat(5 - result.rating)}</div>
                          {result.ulasan && <div style={{ fontSize: '0.9rem', color: '#374151', marginTop: '6px', fontStyle: 'italic' }}>"{result.ulasan}"</div>}
                          <div style={{ fontSize: '0.8rem', color: '#92400e', marginTop: '6px' }}>Terima kasih atas penilaian Anda.</div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: '0.88rem', color: '#78350f', marginBottom: '10px' }}>Seberapa puas Anda dengan penanganan laporan ini?</div>
                          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                            {[1, 2, 3, 4, 5].map(b => (
                              <button key={b} type="button" onClick={() => setNilai(b)} aria-label={`${b} bintang`}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '2rem', color: b <= nilai ? '#f59e0b' : '#d1d5db', padding: 0, lineHeight: 1 }}>★</button>
                            ))}
                          </div>
                          <textarea rows={2} value={ulasan} onChange={e => setUlasan(e.target.value)} placeholder="Saran atau komentar (opsional)"
                            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #fcd34d', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: '10px' }} />
                          <input value={telepon} onChange={e => setTelepon(e.target.value)} placeholder="Nomor telepon saat melapor (untuk verifikasi)"
                            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #fcd34d', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: '10px' }} />
                          <button type="button" onClick={kirimPenilaian} disabled={mengirim}
                            style={{ width: '100%', padding: '12px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>
                            {mengirim ? 'Mengirim...' : 'Kirim Penilaian'}
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* Empty state */}
        {searched && !loading && !result && !error && (
          <div style={{
            textAlign: 'center', padding: '48px 24px',
            color: '#9ca3af', fontSize: '0.95rem',
          }}>
            Tidak ada hasil yang ditemukan.
          </div>
        )}
      </div>
    </div>
  );
}
