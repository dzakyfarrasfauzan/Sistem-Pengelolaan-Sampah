import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, X, AlertTriangle, ChevronLeft, ChevronRight, Repeat, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_URL } from '../../config';

const HARI = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const STATUS_WARNA = { menunggu: ['#e0e7ff', '#4f46e5'], berjalan: ['#fef3c7', '#d97706'], selesai: ['#d1fae5', '#059669'], batal: ['#f3f4f6', '#6b7280'] };

// Tanggal hari ini menurut WIB
const hariIni = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
const geserTanggal = (tgl, n) => { const d = new Date(`${tgl}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const namaHari = (tgl) => { const d = new Date(`${tgl}T00:00:00Z`).getUTCDay(); return HARI[d === 0 ? 7 : d]; };
const formatTanggal = (tgl) => new Date(`${tgl}T00:00:00Z`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const keDaftarKru = (v) => (v ? String(v).split(',').map(Number) : []);

export default function Jadwal() {
  const [tab, setTab] = useState('harian');
  const [harian, setHarian] = useState([]);
  const [rutin, setRutin] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tanggal, setTanggal] = useState(hariIni());

  const [jalurList, setJalurList] = useState([]);
  const [kendaraanList, setKendaraanList] = useState([]);
  const [sopirList, setSopirList] = useState([]);
  const [kruList, setKruList] = useState([]);

  const [form, setForm] = useState(null);      // { mode: 'rutin' | 'harian', ...data }
  const [bentrok, setBentrok] = useState(null); // daftar bentrok dari server
  const [hapus, setHapus] = useState(null);     // { jenis: 'rutin' | 'harian', item }

  const muatJadwal = async () => {
    try {
      const [hRes, rRes] = await Promise.all([
        axios.get(`${API_URL}/admin/jadwal`, { params: { dari: geserTanggal(tanggal, -7), sampai: geserTanggal(tanggal, 14) }, withCredentials: true }),
        axios.get(`${API_URL}/admin/jadwal-rutin`, { withCredentials: true }),
      ]);
      if (hRes.data.success) setHarian(hRes.data.data);
      if (rRes.data.success) setRutin(rRes.data.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const muatOpsi = async () => {
    try {
      const [jl, kd, pt] = await Promise.all([
        axios.get(`${API_URL}/admin/jalur`, { withCredentials: true }),
        axios.get(`${API_URL}/admin/kendaraan`, { withCredentials: true }),
        axios.get(`${API_URL}/admin/petugas`, { withCredentials: true }),
      ]);
      if (jl.data.success) setJalurList(jl.data.data);
      if (kd.data.success) setKendaraanList(kd.data.data);
      if (pt.data.success) {
        const aktif = pt.data.data.filter(x => x.status === 'aktif');
        setSopirList(aktif.filter(x => x.peran === 'sopir'));
        setKruList(aktif.filter(x => x.peran === 'kru'));
      }
    } catch (err) { console.error('Gagal memuat opsi form', err); }
  };

  useEffect(() => {
    const load = async () => { await muatOpsi(); };
    load();
  }, []);
  useEffect(() => {
    const load = async () => { await muatJadwal(); };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tanggal]);

  const jadwalTanggal = useMemo(() => harian.filter(j => j.tanggal === tanggal).sort((a, b) => a.jam.localeCompare(b.jam)), [harian, tanggal]);
  const rutinPerHari = useMemo(() => [1, 2, 3, 4, 5, 6, 7].map(h => ({ hari: h, list: rutin.filter(r => r.hari === h) })).filter(x => x.list.length), [rutin]);
  const jalurAktif = jalurList.filter(j => j.status === 'aktif');

  // ---------- buka form ----------
  const bukaRutinBaru = () => setForm({ mode: 'rutin', id: null, hari: 1, jam: '06:00', jalur_id: '', kendaraan_id: '', sopir_id: '', kru_ids: [], ritase: 1, status: 'aktif', catatan: '' });
  const bukaRutinEdit = (r) => setForm({ mode: 'rutin', ...r, catatan: r.catatan || '', kru_ids: keDaftarKru(r.kru_ids) });
  const bukaHarianEdit = (j) => setForm({
    mode: 'harian', ...j, jalur_id: j.jalur_id || '', lokasi: j.lokasi || '', pemohon: j.pemohon || '', catatan: j.catatan || '',
    kendaraan_awal: j.kendaraan_id, kru_ids: keDaftarKru(j.kru_ids),
  });

  const toggleKru = (id) => setForm(f => ({ ...f, kru_ids: f.kru_ids.includes(id) ? f.kru_ids.filter(k => k !== id) : [...f.kru_ids, id] }));

  // ---------- simpan (dengan pemeriksaan bentrok) ----------
  const kirim = async (paksa = false) => {
    const data = { ...form, paksa };
    try {
      let res;
      if (form.mode === 'rutin') {
        res = form.id ? await axios.put(`${API_URL}/admin/jadwal-rutin/${form.id}`, data, { withCredentials: true })
                      : await axios.post(`${API_URL}/admin/jadwal-rutin`, data, { withCredentials: true });
      } else {
        res = await axios.put(`${API_URL}/admin/jadwal/${form.id}`, data, { withCredentials: true });
      }
      setBentrok(null); setForm(null);
      if (res.data.message) alert(res.data.message);
      muatJadwal();
    } catch (err) {
      if (err.response?.status === 409 && err.response.data.bentrok) setBentrok(err.response.data.bentrok);
      else alert(err.response?.data?.message || 'Terjadi kesalahan saat menyimpan jadwal');
    }
  };
  const submit = (e) => { e.preventDefault(); kirim(false); };

  const konfirmasiHapus = async () => {
    try {
      const url = hapus.jenis === 'rutin' ? `${API_URL}/admin/jadwal-rutin/${hapus.item.id}` : `${API_URL}/admin/jadwal/${hapus.item.id}`;
      const res = await axios.delete(url, { withCredentials: true });
      if (res.data.message) alert(res.data.message);
      setHapus(null); muatJadwal();
    } catch (err) { alert(err.response?.data?.message || 'Gagal menghapus'); }
  };

  // ---------- gaya ----------
  const input = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', boxSizing: 'border-box', marginBottom: '14px', fontFamily: 'inherit' };
  const label = { display: 'block', marginBottom: '5px', fontWeight: 500, fontSize: '0.9rem' };
  const th = { padding: '14px 16px' };
  const tabBtn = (aktif) => ({ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', background: aktif ? '#111827' : 'white', color: aktif ? 'white' : '#4b5563', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' });
  const tombolHijau = { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'inherit' };

  return (
    <div style={{ padding: '40px', fontFamily: 'Inter, sans-serif' }}>
      <h1 style={{ margin: '0 0 6px', color: '#111827' }}>Penjadwalan Pengangkutan</h1>
      <p style={{ color: '#6b7280', margin: '0 0 20px' }}>
        Jadwal rutin mingguan diisi sekali; sistem membuat jadwal harian otomatis untuk 7 hari ke depan.
        Jadwal tambahan dibuat dari menu Laporan Masyarakat (tombol Jadwalkan) dan diperiksa bentroknya.
      </p>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button style={tabBtn(tab === 'harian')} onClick={() => setTab('harian')}><CalendarDays size={18} /> Jadwal Harian</button>
        <button style={tabBtn(tab === 'rutin')} onClick={() => setTab('rutin')}><Repeat size={18} /> Jadwal Rutin Mingguan</button>
      </div>

      {tab === 'harian' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={() => setTanggal(geserTanggal(tanggal, -1))} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}><ChevronLeft size={18} /></button>
              <input type="date" value={tanggal} onChange={e => e.target.value && setTanggal(e.target.value)} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #e5e7eb', fontFamily: 'inherit' }} />
              <button onClick={() => setTanggal(geserTanggal(tanggal, 1))} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}><ChevronRight size={18} /></button>
              <span style={{ fontWeight: 700, color: '#111827', marginLeft: '6px' }}>{namaHari(tanggal)}, {formatTanggal(tanggal)}</span>
              {tanggal !== hariIni() && <button onClick={() => setTanggal(hariIni())} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 600 }}>Hari ini</button>}
            </div>
            <Link to="/admin/laporan-masyarakat" style={{ ...tombolHijau, textDecoration: 'none' }}><Plus size={18} /> Jadwal Tambahan dari Laporan</Link>
          </div>

          <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '960px' }}>
              <thead>
                <tr style={{ background: '#f9fafb', color: '#4b5563', fontSize: '0.9rem' }}>
                  <th style={th}>Jam</th><th style={th}>Jalur / Lokasi</th><th style={th}>Armada</th><th style={th}>Sopir &amp; Kru</th>
                  <th style={th}>Pemeriksaan Armada</th><th style={th}>Status</th><th style={{ ...th, textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan="7" style={{ padding: '20px', textAlign: 'center' }}>Memuat data...</td></tr>
                  : jadwalTanggal.length === 0 ? <tr><td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>Tidak ada jadwal pada tanggal ini</td></tr>
                  : jadwalTanggal.map(j => {
                    const [bg, fg] = STATUS_WARNA[j.status] || STATUS_WARNA.menunggu;
                    return (
                      <tr key={j.id} style={{ borderTop: '1px solid #f3f4f6', verticalAlign: 'top', opacity: j.status === 'batal' ? 0.55 : 1 }}>
                        <td style={th}>
                          <div style={{ fontWeight: 700, color: '#111827' }}>{j.jam}</div>
                          <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>±{j.durasi_jam || 8} jam • {j.ritase || 1} rit</div>
                        </td>
                        <td style={th}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, color: '#111827' }}>{j.lokasi_tampil}</span>
                            <JenisBadge jenis={j.jenis} />
                          </div>
                          {j.kode_laporan && <div style={{ fontSize: '0.8rem', color: '#a21caf', fontWeight: 600 }}>Laporan {j.kode_laporan}{j.prioritas_laporan ? ` • prioritas ${j.prioritas_laporan}` : ''}</div>}
                          {j.pemohon && <div style={{ fontSize: '0.8rem', color: '#a21caf' }}>Pelapor: {j.pemohon}</div>}
                          {j.desa && <div style={{ fontSize: '0.8rem', color: '#6b7280', maxWidth: '280px' }}>{j.desa}</div>}
                          {j.tps_names && <div style={{ fontSize: '0.8rem', color: '#6b7280', maxWidth: '280px' }}>TPS: {j.tps_names}</div>}
                        </td>
                        <td style={th}>
                          <div style={{ color: '#111827' }}>{j.nomor_polisi}</div>
                          <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>{j.jenis_kendaraan}</div>
                        </td>
                        <td style={th}>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{j.sopir_name || '-'}</div>
                          <div style={{ fontSize: '0.8rem', color: '#6b7280', maxWidth: '220px' }}>Kru: {j.kru_names || '-'}</div>
                        </td>
                        <td style={{ ...th, fontSize: '0.8rem' }}>
                          <KondisiBadge label="Berangkat" kondisi={j.kondisi_berangkat} foto={j.foto_berangkat} />
                          <KondisiBadge label="Pulang" kondisi={j.kondisi_pulang} foto={j.foto_pulang} />
                        </td>
                        <td style={th}>
                          <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', background: bg, color: fg }}>{j.status.toUpperCase()}</span>
                          {j.foto_kegiatan && (
                            <a href={`${API_URL}/uploads/${j.foto_kegiatan}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: '6px', fontSize: '0.78rem', color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>📷 Foto kegiatan</a>
                          )}
                        </td>
                        <td style={{ ...th, textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <button onClick={() => bukaHarianEdit(j)} title="Ubah" style={{ background: '#f3f4f6', color: '#3b82f6', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', marginRight: '8px' }}><Edit2 size={16} /></button>
                          {j.status !== 'batal' && (
                            <button onClick={() => setHapus({ jenis: 'harian', item: j })} title={j.jenis === 'rutin' ? 'Batalkan' : 'Hapus'} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={16} /></button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'rutin' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button onClick={bukaRutinBaru} style={tombolHijau}><Plus size={18} /> Tambah Jadwal Rutin</button>
          </div>
          {rutinPerHari.length === 0 && (
            <div style={{ background: 'white', padding: '32px', borderRadius: '16px', textAlign: 'center', color: '#6b7280' }}>
              Belum ada jadwal rutin. Tambahkan jalur layanan terlebih dahulu, lalu isi jadwal rutin per hari.
            </div>
          )}
          {rutinPerHari.map(({ hari, list }) => (
            <div key={hari} style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', marginBottom: '16px', overflowX: 'auto' }}>
              <div style={{ padding: '14px 16px', fontWeight: 800, color: '#111827', borderBottom: '1px solid #f3f4f6' }}>{HARI[hari]} <span style={{ fontWeight: 500, color: '#6b7280', fontSize: '0.85rem' }}>• {list.length} armada</span></div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '860px' }}>
                <tbody>
                  {list.map(r => (
                    <tr key={r.id} style={{ borderTop: '1px solid #f9fafb', verticalAlign: 'top', opacity: r.status === 'aktif' ? 1 : 0.5 }}>
                      <td style={{ ...th, width: '90px' }}><div style={{ fontWeight: 700 }}>{r.jam}</div><div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{r.ritase} rit</div></td>
                      <td style={th}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>{r.nama_jalur}</div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', maxWidth: '300px' }}>{r.desa || ''}</div>
                        <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{r.jarak_km ? `${r.jarak_km} km • ` : ''}±{r.waktu_tempuh_jam || 8} jam{r.estimasi_tonase ? ` • ${r.estimasi_tonase} ton` : ''}</div>
                      </td>
                      <td style={th}><div>{r.nomor_polisi}</div><div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{r.jenis_kendaraan}</div></td>
                      <td style={th}><div style={{ fontWeight: 600 }}>{r.sopir_name}</div><div style={{ fontSize: '0.8rem', color: '#6b7280', maxWidth: '240px' }}>Kru: {r.kru_names || '-'}</div></td>
                      <td style={th}>{r.status !== 'aktif' && <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280' }}>NONAKTIF</span>}</td>
                      <td style={{ ...th, textAlign: 'center', whiteSpace: 'nowrap', width: '110px' }}>
                        <button onClick={() => bukaRutinEdit(r)} style={{ background: '#f3f4f6', color: '#3b82f6', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', marginRight: '8px' }}><Edit2 size={16} /></button>
                        <button onClick={() => setHapus({ jenis: 'rutin', item: r })} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}

      {/* ---------- Form ---------- */}
      {form && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', padding: '28px', borderRadius: '16px', width: '100%', maxWidth: '540px', margin: '16px', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>
                {form.mode === 'rutin' ? (form.id ? 'Ubah Jadwal Rutin' : 'Tambah Jadwal Rutin')
                  : `Ubah Jadwal ${form.jenis === 'rutin' ? 'Rutin' : 'Tambahan'} • ${form.tanggal}`}
              </h2>
              <button onClick={() => setForm(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={20} /></button>
            </div>

            <form onSubmit={submit}>
              {form.mode === 'rutin' && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={label}>Hari</label>
                    <select value={form.hari} onChange={e => setForm({ ...form, hari: Number(e.target.value) })} style={input}>
                      {[1, 2, 3, 4, 5, 6, 7].map(h => <option key={h} value={h}>{HARI[h]}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={label}>Jam Berangkat</label>
                    <input type="time" required value={form.jam} onChange={e => setForm({ ...form, jam: e.target.value })} style={input} />
                  </div>
                </div>
              )}
              {form.mode !== 'rutin' && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={label}>Tanggal</label>
                    <input type="date" required value={form.tanggal} disabled={form.mode === 'harian' && form.jenis === 'rutin'}
                      onChange={e => setForm({ ...form, tanggal: e.target.value })} style={input} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={label}>Jam Berangkat</label>
                    <input type="time" required value={form.jam} onChange={e => setForm({ ...form, jam: e.target.value })} style={input} />
                  </div>
                </div>
              )}

              {/* Jalur / lokasi */}
              {form.mode === 'rutin' ? (
                <>
                  <label style={label}>Jalur Layanan</label>
                  <select required value={form.jalur_id} onChange={e => setForm({ ...form, jalur_id: e.target.value })} style={input}>
                    <option value="">-- Pilih Jalur --</option>
                    {jalurAktif.map(j => <option key={j.id} value={j.id}>{j.nama_jalur}{j.kecamatan ? ` — ${j.kecamatan}` : ''}</option>)}
                  </select>
                </>
              ) : form.jenis === 'rutin' ? (
                <div style={{ ...input, background: '#f9fafb' }}>{form.lokasi_tampil} <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>(dari jadwal rutin)</span></div>
              ) : (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ ...input, flex: 2, background: '#f9fafb' }}>
                    {form.lokasi_tampil}
                    <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>{form.kode_laporan ? `Laporan ${form.kode_laporan}` : 'Jadwal tambahan'}{form.pemohon ? ` • ${form.pemohon}` : ''}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={label}>Durasi (jam)</label>
                    <input type="number" min="0.5" step="0.5" value={form.durasi_jam} onChange={e => setForm({ ...form, durasi_jam: e.target.value })} style={input} />
                  </div>
                </div>
              )}

              <label style={label}>Armada</label>
              <select required value={form.kendaraan_id} onChange={e => setForm({ ...form, kendaraan_id: e.target.value })} style={input}
                disabled={form.mode === 'harian' && form.status !== 'menunggu'}>
                <option value="" disabled>-- Pilih Armada --</option>
                {kendaraanList
                  .filter(k => form.mode === 'rutin' || k.status_penggunaan !== 'maintenance' || String(k.id) === String(form.kendaraan_awal))
                  .map(k => <option key={k.id} value={k.id}>{k.nomor_polisi} ({k.jenis_kendaraan}){k.status_penggunaan === 'maintenance' ? ' - maintenance' : ''}</option>)}
              </select>
              {form.mode === 'harian' && String(form.kendaraan_id) !== String(form.kendaraan_awal) && (
                <div style={{ marginTop: '-8px', marginBottom: '14px', fontSize: '0.8rem', color: '#d97706' }}>Armada diganti: sopir perlu memeriksa armada pengganti sebelum berangkat.</div>
              )}

              <label style={label}>Sopir (Ketua Tim)</label>
              <select required value={form.sopir_id} onChange={e => setForm({ ...form, sopir_id: e.target.value })} style={input}>
                <option value="" disabled>-- Pilih Sopir --</option>
                {sopirList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              <label style={label}>Kru ({form.kru_ids.length} dipilih)</label>
              <div style={{ border: '1px solid #d1d5db', borderRadius: '8px', padding: '8px 12px', marginBottom: '14px', maxHeight: '150px', overflowY: 'auto' }}>
                {kruList.length === 0 && <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Belum ada data kru aktif</div>}
                {kruList.map(k => (
                  <label key={k.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.kru_ids.includes(k.id)} onChange={() => toggleKru(k.id)} /> {k.name}
                  </label>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={label}>Ritase</label>
                  <input type="number" min="1" value={form.ritase} onChange={e => setForm({ ...form, ritase: e.target.value })} style={input} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={label}>Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={input}>
                    {form.mode === 'rutin'
                      ? <><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option></>
                      : <><option value="menunggu">Menunggu</option><option value="berjalan">Berjalan</option><option value="selesai">Selesai</option><option value="batal">Batal</option></>}
                  </select>
                </div>
              </div>

              <label style={label}>Catatan (opsional)</label>
              <textarea value={form.catatan} onChange={e => setForm({ ...form, catatan: e.target.value })} style={{ ...input, resize: 'vertical', height: '56px' }} />

              <button type="submit" style={{ width: '100%', padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>Simpan Jadwal</button>
            </form>
          </div>
        </div>
      )}

      {/* ---------- Peringatan bentrok ---------- */}
      {bentrok && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', padding: '28px', borderRadius: '16px', width: '100%', maxWidth: '480px', margin: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertTriangle size={24} /></div>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Jadwal Bentrok</h3>
            </div>
            <p style={{ color: '#4b5563', fontSize: '0.9rem', margin: '0 0 10px' }}>Pada waktu yang sama sudah ada jadwal lain:</p>
            <ul style={{ margin: '0 0 18px', paddingLeft: '20px', color: '#b45309', fontSize: '0.88rem', lineHeight: 1.6 }}>
              {bentrok.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setBentrok(null)} style={{ flex: 1, padding: '10px', border: '1px solid #e5e7eb', background: 'white', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Ubah Lagi</button>
              <button onClick={() => kirim(true)} style={{ flex: 1, padding: '10px', border: 'none', background: '#d97706', color: 'white', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Tetap Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Hapus / batal ---------- */}
      {hapus && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', padding: '28px', borderRadius: '16px', width: '100%', maxWidth: '380px', margin: '16px', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}><AlertTriangle size={28} /></div>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem' }}>
              {hapus.jenis === 'rutin' ? 'Hapus Jadwal Rutin?' : hapus.item.jenis === 'rutin' ? 'Batalkan Jadwal Hari Ini?' : 'Hapus Jadwal Tambahan?'}
            </h3>
            <p style={{ color: '#6b7280', fontSize: '0.86rem', marginBottom: '22px', lineHeight: 1.5 }}>
              {hapus.jenis === 'rutin'
                ? <>Jadwal rutin <strong>{hapus.item.nama_jalur}</strong> setiap hari {HARI[hapus.item.hari]} dihapus. Jadwal harian yang belum berjalan ikut dihapus; riwayat yang sudah berjalan tetap tersimpan.</>
                : hapus.item.jenis === 'rutin'
                  ? <>Jadwal <strong>{hapus.item.lokasi_tampil}</strong> tanggal <strong>{hapus.item.tanggal}</strong> dibatalkan. Jadwal rutinnya tetap berlaku untuk minggu berikutnya.</>
                  : <>Jadwal <strong>{hapus.item.lokasi_tampil}</strong> tanggal <strong>{hapus.item.tanggal}</strong> dihapus.{hapus.item.kode_laporan && <> Laporan <strong>{hapus.item.kode_laporan}</strong> kembali berstatus masuk dan dapat dijadwalkan ulang.</>}</>}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setHapus(null)} style={{ flex: 1, padding: '10px', border: '1px solid #e5e7eb', background: 'white', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Batal</button>
              <button onClick={konfirmasiHapus} style={{ flex: 1, padding: '10px', border: 'none', background: '#dc2626', color: 'white', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Ya, Lanjutkan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function JenisBadge({ jenis }) {
  const rutin = jenis === 'rutin';
  return (
    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: rutin ? '#e0f2fe' : '#fae8ff', color: rutin ? '#0369a1' : '#a21caf' }}>
      {rutin ? 'RUTIN' : 'TAMBAHAN'}
    </span>
  );
}

// Badge hasil pemeriksaan armada oleh sopir
function KondisiBadge({ label, kondisi, foto }) {
  const warna = !kondisi ? ['#f3f4f6', '#9ca3af'] : kondisi === 'baik' ? ['#d1fae5', '#059669'] : kondisi === 'rusak ringan' ? ['#fef3c7', '#d97706'] : ['#fee2e2', '#dc2626'];
  return (
    <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
      <span style={{ color: '#6b7280', minWidth: '62px' }}>{label}:</span>
      <span style={{ padding: '2px 8px', borderRadius: '12px', fontWeight: '700', background: warna[0], color: warna[1] }}>{kondisi ? kondisi.toUpperCase() : 'BELUM'}</span>
      {foto && <a href={`${API_URL}/uploads/${foto}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>📷</a>}
    </div>
  );
}
