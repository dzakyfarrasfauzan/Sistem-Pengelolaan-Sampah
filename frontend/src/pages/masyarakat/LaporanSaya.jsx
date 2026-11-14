import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Plus, MapPin, CalendarDays } from 'lucide-react';
import { API_URL } from '../../config';
import KepalaSitus from '../../components/KepalaSitus';
import { Pesan } from '../../components/AkunForm';
import { gaya } from '../../components/akunGaya';

const STATUS = {
  masuk: { label: 'Masuk', ket: 'Menunggu ditinjau admin Korwil', warna: '#5b6673', latar: '#eef0f2' },
  diproses: { label: 'Diproses', ket: 'Pengangkutan sudah dijadwalkan', warna: '#8a4b0f', latar: '#fbf1e6' },
  selesai: { label: 'Selesai', ket: 'Sampah sudah diangkut', warna: '#17533a', latar: '#e7f1eb' },
};

const tgl = (v) => v ? new Date(v.includes('T') || v.length <= 10 ? v : v.replace(' ', 'T') + 'Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

// Penanda tahapan: Masuk -> Diproses -> Selesai
function Tahapan({ status }) {
  const urutan = ['masuk', 'diproses', 'selesai'];
  const posisi = urutan.indexOf(status);
  return (
    <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0 14px' }}>
      {urutan.map((t, i) => {
        const lewat = i <= posisi;
        return (
          <div key={t} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : '0 0 auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: lewat ? '#1f6b47' : 'white', border: `2px solid ${lewat ? '#1f6b47' : '#c4cad1'}`, color: 'white', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{lewat ? '✓' : ''}</span>
              <span style={{ fontSize: '0.74rem', color: lewat ? '#17533a' : '#8a939d', fontWeight: lewat ? 600 : 400 }}>{STATUS[t].label}</span>
            </div>
            {i < 2 && <div style={{ flex: 1, height: '3px', background: i < posisi ? '#1f6b47' : '#e1e5e9', margin: '0 6px 18px', borderRadius: '2px' }} />}
          </div>
        );
      })}
    </div>
  );
}

// Penilaian bintang untuk laporan yang sudah selesai
function Penilaian({ laporan, onTersimpan }) {
  const [nilai, setNilai] = useState(0);
  const [ulasan, setUlasan] = useState('');
  const [galat, setGalat] = useState('');
  const simpan = async () => {
    if (!nilai) return setGalat('Pilih bintang 1 sampai 5');
    try {
      await axios.post(`${API_URL}/api/public/penilaian`, { kode_laporan: laporan.kode_laporan, rating: nilai, ulasan }, { withCredentials: true });
      onTersimpan(nilai, ulasan);
    } catch (err) { setGalat(err.response?.data?.message || 'Gagal menyimpan penilaian'); }
  };
  return (
    <div style={{ borderTop: '1px solid #eceff2', marginTop: '12px', paddingTop: '12px' }}>
      <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>Beri penilaian pelayanan</div>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => setNilai(n)} aria-label={`${n} bintang`}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: n <= nilai ? '#d97706' : '#c4cad1', padding: 0 }}>★</button>
        ))}
      </div>
      <textarea rows={2} placeholder="Ulasan (opsional)" value={ulasan} onChange={e => setUlasan(e.target.value)} style={{ ...gaya.input, resize: 'vertical', marginBottom: '8px' }} />
      {galat && <div style={{ color: '#9b1c1c', fontSize: '0.84rem', marginBottom: '8px' }}>{galat}</div>}
      <button type="button" onClick={simpan} style={{ ...gaya.tombol, width: 'auto', padding: '8px 16px' }}>Kirim Penilaian</button>
    </div>
  );
}

// Halaman akun masyarakat: data akun dan daftar laporan miliknya
export default function LaporanSaya() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [akun, setAkun] = useState(null);
  const [laporan, setLaporan] = useState([]);
  const [memuat, setMemuat] = useState(true);
  const [profil, setProfil] = useState(null);   // form ubah profil
  const [galat, setGalat] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    const muat = async () => {
      try {
        const a = await axios.get(`${API_URL}/masyarakat/saya`, { withCredentials: true });
        if (!a.data.akun) { navigate('/masuk?lanjut=/laporan-saya', { replace: true }); return; }
        setAkun(a.data.akun);
        if (!a.data.akun.no_wa || params.get('lengkapi')) setProfil({ nama: a.data.akun.nama, no_wa: a.data.akun.no_wa || '' });
        const l = await axios.get(`${API_URL}/masyarakat/laporan`, { withCredentials: true });
        setLaporan(l.data.data || []);
      } catch (err) { setGalat(err.response?.data?.message || 'Gagal memuat data'); }
      finally { setMemuat(false); }
    };
    muat();
  }, [navigate, params]);

  const simpanProfil = async (e) => {
    e.preventDefault();
    setGalat('');
    try {
      const r = await axios.put(`${API_URL}/masyarakat/profil`, profil, { withCredentials: true });
      setAkun(r.data.akun); setProfil(null); setInfo('Profil tersimpan.');
    } catch (err) { setGalat(err.response?.data?.message || 'Gagal menyimpan profil'); }
  };

  const kotak = { background: 'white', border: '1px solid #e1e5e9', borderRadius: '12px', padding: '18px 20px' };
  const hitung = (st) => laporan.filter(l => l.status === st).length;

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', display: 'flex', flexDirection: 'column' }}>
      <KepalaSitus />
      <main style={{ flex: 1, maxWidth: '860px', width: '100%', margin: '0 auto', padding: '28px 16px 48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '18px' }}>
          <div>
            <h1 style={{ fontSize: '1.35rem' }}>Laporan Saya</h1>
            <p style={{ color: '#5b6673', fontSize: '0.9rem' }}>Riwayat dan status laporan yang Anda kirim.</p>
          </div>
          <Link to="/laporan" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: '#1f6b47', color: 'white', borderRadius: '4px', fontWeight: 600 }}>
            <Plus size={16} /> Buat Laporan
          </Link>
        </div>

        <Pesan>{galat}</Pesan>
        {info && <Pesan jenis="info">{info}</Pesan>}

        {akun && (
          <section style={{ ...kotak, marginBottom: '18px' }}>
            {profil ? (
              <form onSubmit={simpanProfil}>
                {!akun.no_wa && <Pesan jenis="info">Lengkapi nomor WhatsApp Anda agar petugas dapat menghubungi Anda bila diperlukan.</Pesan>}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 16px' }}>
                  <div>
                    <label style={gaya.label} htmlFor="nama">Nama lengkap</label>
                    <input id="nama" required value={profil.nama} onChange={e => setProfil({ ...profil, nama: e.target.value })} style={gaya.input} />
                  </div>
                  <div>
                    <label style={gaya.label} htmlFor="wa">Nomor WhatsApp</label>
                    <input id="wa" type="tel" required placeholder="08xxxxxxxxxx" value={profil.no_wa} onChange={e => setProfil({ ...profil, no_wa: e.target.value })} style={gaya.input} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" style={{ ...gaya.tombol, width: 'auto', padding: '8px 16px' }}>Simpan</button>
                  {akun.no_wa && <button type="button" onClick={() => setProfil(null)} style={{ padding: '8px 16px', background: 'white', border: '1px solid #b9c2cb', borderRadius: '4px', cursor: 'pointer' }}>Batal</button>}
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ fontSize: '0.92rem', lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 600 }}>{akun.nama}</div>
                  <div style={{ color: '#5b6673' }}>{akun.email}{akun.pakai_google ? ' · terhubung dengan Google' : ''}</div>
                  <div style={{ color: '#5b6673' }}>WhatsApp: {akun.no_wa || '-'}</div>
                </div>
                <button type="button" onClick={() => setProfil({ nama: akun.nama, no_wa: akun.no_wa || '' })} style={{ padding: '7px 14px', background: 'white', border: '1px solid #b9c2cb', borderRadius: '4px', cursor: 'pointer' }}>Ubah Profil</button>
              </div>
            )}
          </section>
        )}

        {!memuat && laporan.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '18px' }}>
            {[['Semua laporan', laporan.length, '#1f2933'], ['Masuk', hitung('masuk'), STATUS.masuk.warna], ['Diproses', hitung('diproses'), STATUS.diproses.warna], ['Selesai', hitung('selesai'), STATUS.selesai.warna]].map(([n, v, w]) => (
              <div key={n} style={{ ...kotak, padding: '12px 16px' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: w }}>{v}</div>
                <div style={{ fontSize: '0.82rem', color: '#5b6673' }}>{n}</div>
              </div>
            ))}
          </div>
        )}

        {memuat ? <div style={{ ...kotak, color: '#5b6673' }}>Memuat laporan...</div>
          : laporan.length === 0 ? (
            <div style={{ ...kotak, color: '#5b6673', textAlign: 'center', padding: '32px' }}>
              Anda belum pernah mengirim laporan. <Link to="/laporan" style={gaya.tautan}>Buat laporan pertama</Link>.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {laporan.map(l => {
                const s = STATUS[l.status] || STATUS.masuk;
                return (
                  <article key={l.kode_laporan} style={kotak}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{l.kode_laporan}</div>
                        <div style={{ color: '#5b6673', fontSize: '0.82rem' }}>Dikirim {tgl(l.created_at)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, color: s.warna, background: s.latar }}>{s.label}</span>
                        <div style={{ color: '#5b6673', fontSize: '0.78rem', marginTop: '2px' }}>{s.ket}</div>
                      </div>
                    </div>

                    <Tahapan status={l.status} />
                    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                      {l.foto && <img src={`${API_URL}/uploads/${l.foto}`} alt="Foto laporan" style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #d8dde3' }} />}
                      <div style={{ flex: 1, minWidth: '200px', fontSize: '0.9rem', lineHeight: 1.6 }}>
                        <div>{l.deskripsi}</div>
                        {(l.alamat_lokasi || l.patokan) && (
                          <div style={{ color: '#5b6673', display: 'flex', gap: '6px', marginTop: '4px' }}>
                            <MapPin size={15} style={{ flexShrink: 0, marginTop: '4px' }} /> {l.alamat_lokasi}{l.patokan ? ` (patokan: ${l.patokan})` : ''}
                          </div>
                        )}
                        {l.jadwal_tanggal && l.status !== 'selesai' && (
                          <div style={{ color: '#8a4b0f', display: 'flex', gap: '6px', marginTop: '4px', fontWeight: 600 }}>
                            <CalendarDays size={15} style={{ flexShrink: 0, marginTop: '4px' }} /> Dijadwalkan diangkut {tgl(l.jadwal_tanggal)}{l.jadwal_jam ? `, pukul ${l.jadwal_jam}` : ''}
                          </div>
                        )}
                      </div>
                    </div>

                    {l.status === 'selesai' && (
                      <div style={{ borderTop: '1px solid #eceff2', marginTop: '12px', paddingTop: '12px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                        {l.foto_tindak_lanjut && <img src={`${API_URL}/uploads/${l.foto_tindak_lanjut}`} alt="Foto hasil pengangkutan" style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #d8dde3' }} />}
                        <div style={{ fontSize: '0.88rem', color: '#3a4550' }}>
                          <div style={{ fontWeight: 600 }}>Selesai {tgl(l.selesai_at)}</div>
                          {l.catatan_tindak_lanjut && <div>Catatan petugas: {l.catatan_tindak_lanjut}</div>}
                          {l.rating && <div style={{ marginTop: '4px' }}><span style={{ color: '#d97706' }}>{'★'.repeat(l.rating)}{'☆'.repeat(5 - l.rating)}</span>{l.ulasan ? ` — ${l.ulasan}` : ''}</div>}
                        </div>
                      </div>
                    )}
                    {l.status === 'selesai' && !l.rating && (
                      <Penilaian laporan={l} onTersimpan={(rating, ulasan) => setLaporan(ls => ls.map(x => x.kode_laporan === l.kode_laporan ? { ...x, rating, ulasan } : x))} />
                    )}
                  </article>
                );
              })}
            </div>
          )}
      </main>
    </div>
  );
}
