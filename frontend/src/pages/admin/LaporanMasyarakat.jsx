import { useEffect, useState } from 'react';
import axios from 'axios';
import { Eye, Trash2, Edit2, Check, X, MapPin, Phone, Calendar, User, FileText, AlertTriangle, Image as ImageIcon, UserCheck, Landmark, CalendarPlus, Plus, Truck } from 'lucide-react';
import { RingkasanAngka, KotakCari } from '../../components/Ui';
import { API_URL } from '../../config';


// Tautan WhatsApp untuk mengabarkan pelapor bahwa laporannya sudah ditangani
function linkWhatsApp(l) {
  let nomor = String(l.nomor_telepon || '').replace(/\D/g, '');
  if (nomor.startsWith('0')) nomor = '62' + nomor.slice(1);
  const pesan = `Halo ${l.nama_pelapor}, laporan Anda dengan kode ${l.kode_laporan} sudah selesai ditangani oleh DLH Kabupaten Sukabumi. ` +
    `Silakan cek hasilnya dan beri penilaian di halaman Cek Status Laporan. Terima kasih atas partisipasi Anda.`;
  return `https://wa.me/${nomor}?text=${encodeURIComponent(pesan)}`;
}

const SUMBER_LABEL = { website: 'Website', telepon: 'Telepon', whatsapp: 'WhatsApp', surat: 'Surat', 'datang langsung': 'Datang langsung' };
const hariIni = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
const LAPORAN_KOSONG = { nama_pelapor: '', nomor_telepon: '', sumber: 'telepon', alamat_lokasi: '', patokan: '', deskripsi: '', prioritas: '' };

export default function LaporanMasyarakat() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [editingReport, setEditingReport] = useState(null);
  const [editPrioritas, setEditPrioritas] = useState('');
  const [petugasList, setPetugasList] = useState([]);
  const [kruList, setKruList] = useState([]);
  const [kendaraanList, setKendaraanList] = useState([]);
  const [catat, setCatat] = useState(null);         // form catat laporan dari telepon/WhatsApp
  const [catatFoto, setCatatFoto] = useState(null);
  const [jadwalkan, setJadwalkan] = useState(null); // form jadwalkan laporan
  const [bentrok, setBentrok] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState('semua');
  const [cari, setCari] = useState('');

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/laporan-masyarakat`, { withCredentials: true });
      if (res.data.success) {
        setList(res.data.data || []);
      }
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  const fetchPetugas = async () => {
    try {
      const [res, kd] = await Promise.all([
        axios.get(`${API_URL}/admin/petugas`, { withCredentials: true }),
        axios.get(`${API_URL}/admin/kendaraan`, { withCredentials: true }),
      ]);
      if (res.data.success) {
        const aktif = (res.data.data || []).filter(p => p.status === 'aktif');
        setPetugasList(aktif.filter(p => p.peran === 'sopir'));
        setKruList(aktif.filter(p => p.peran === 'kru' || (p.peran === 'sopir' && p.juga_kru)));
      }
      if (kd.data.success) setKendaraanList((kd.data.data || []).filter(k => k.status_penggunaan !== 'maintenance'));
    } catch (err) {
      console.error(err);
    }
  };

  // ---------- catat laporan dari telepon / WhatsApp ----------
  const kirimCatat = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const fd = new FormData();
      Object.entries(catat).forEach(([k, v]) => fd.append(k, v));
      if (catatFoto) fd.append('foto', catatFoto);
      const res = await axios.post(`${API_URL}/admin/laporan-masyarakat`, fd, { withCredentials: true });
      alert(res.data.message);
      setCatat(null); setCatatFoto(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mencatat laporan');
    } finally { setUpdating(false); }
  };

  // ---------- jadwalkan laporan sebagai jadwal tambahan ----------
  const bukaJadwalkan = (l) => setJadwalkan({
    laporan: l, prioritas: l.prioritas || '', tanggal: hariIni(), jam: '08:00',
    kendaraan_id: '', sopir_id: '', kru_ids: [], catatan: '',
  });
  const toggleKru = (id) => setJadwalkan(f => ({ ...f, kru_ids: f.kru_ids.includes(id) ? f.kru_ids.filter(k => k !== id) : [...f.kru_ids, id] }));
  const kirimJadwalkan = async (paksa = false) => {
    const { laporan, ...data } = jadwalkan;
    setUpdating(true);
    try {
      const res = await axios.post(`${API_URL}/admin/laporan-masyarakat/${laporan.id}/jadwalkan`, { ...data, paksa }, { withCredentials: true });
      setBentrok(null); setJadwalkan(null); setSelectedReport(null);
      alert(res.data.message);
      fetchData();
    } catch (err) {
      if (err.response?.status === 409 && err.response.data.bentrok) setBentrok(err.response.data.bentrok);
      else alert(err.response?.data?.message || 'Gagal menjadwalkan laporan');
    } finally { setUpdating(false); }
  };

  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchData(), fetchPetugas()]);
    };
    load();
  }, []);

  const confirmDelete = async () => {
    if (!reportToDelete) return;
    setUpdating(true);
    try {
      await axios.delete(`${API_URL}/admin/laporan-masyarakat/${reportToDelete.id}`, { withCredentials: true });
      setReportToDelete(null);
      fetchData();
      if (selectedReport && selectedReport.id === reportToDelete.id) setSelectedReport(null);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Gagal menghapus laporan');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await axios.put(`${API_URL}/admin/laporan-masyarakat/${editingReport.id}`, { prioritas: editPrioritas || null }, { withCredentials: true });
      setEditingReport(null);
      fetchData();
      if (selectedReport && selectedReport.id === editingReport.id) setSelectedReport(prev => ({ ...prev, prioritas: editPrioritas || null }));
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memperbarui laporan');
    } finally {
      setUpdating(false);
    }
  };

  const startEdit = (report) => {
    setEditingReport(report);
    setEditPrioritas(report.prioritas || '');
  };

  const getPriorityInfo = (prioritas) => {
    switch(prioritas) {
      case 'tinggi': return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', label: 'Tinggi' };
      case 'sedang': return { bg: '#fffbeb', text: '#d97706', border: '#fde68a', label: 'Sedang' };
      case 'rendah': return { bg: '#f1f7f3', text: '#17533a', border: '#b9d8c6', label: 'Rendah' };
      default: return { bg: '#f3f4f6', text: '#5b6673', border: '#d8dde3', label: 'Belum Ditentukan' };
    }
  };

  const getStatusInfo = (status) => {
    switch(status) {
      case 'selesai': return { bg: '#e7f1eb', text: '#1f6b47', border: '#b9d8c6', label: 'Selesai' };
      case 'diproses': return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', label: 'Diproses' };
      default: return { bg: '#f3f4f6', text: '#4b5563', border: '#d8dde3', label: 'Masuk' };
    }
  };

  // Hitung counter per tab
  const counts = {
    semua:    list.length,
    masuk:    list.filter(l => l.status === 'masuk').length,
    diproses: list.filter(l => l.status === 'diproses').length,
    selesai:  list.filter(l => l.status === 'selesai').length,
  };

  // Filter list berdasarkan tab aktif
  const filteredList = (activeTab === 'semua' ? list : list.filter(l => l.status === activeTab))
    .filter(l => `${l.kode_laporan} ${l.nama_pelapor} ${l.alamat_lokasi || ''} ${l.deskripsi || ''}`.toLowerCase().includes(cari.toLowerCase()));

  const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
  const kotak = { background: 'white', border: '1px solid #e1e5e9', borderRadius: '10px', padding: '28px', width: '100%', margin: '16px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 1px 2px rgba(16,24,40,0.06)' };
  const lbl = { display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '0.88rem' };
  const inp = { width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1.5px solid #d8dde3', boxSizing: 'border-box', marginBottom: '14px', fontFamily: 'inherit', outline: 'none' };
  const tombolUtama = { width: '100%', padding: '12px', border: 'none', borderRadius: '6px', background: '#1f6b47', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#5b6673' }}>Memuat data laporan...</div>;

  return (
    <div style={{ padding: '40px', fontFamily: 'inherit', color: '#1f2937' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '700', color: '#1f2933', letterSpacing: '0' }}>Laporan Masyarakat</h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#5b6673' }}>Laporan dan permohonan pelayanan dari warga. Tentukan prioritas, lalu jadwalkan pengangkutannya.</p>
          </div>
        </div>
        <button onClick={() => { setCatat({ ...LAPORAN_KOSONG }); setCatatFoto(null); }} style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 18px', border: 'none', borderRadius: '6px',
          background: '#1f6b47', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
        }}>
          <Plus size={18} /> Catat Laporan (Telepon/WA)
        </button>
      </div>

      <RingkasanAngka data={[
        { label: 'Belum dijadwalkan', nilai: list.filter(l => l.status !== 'selesai' && !l.jadwal_id).length, warna: '#c98a1a' },
        { label: 'Prioritas tinggi aktif', nilai: list.filter(l => l.status !== 'selesai' && l.prioritas === 'tinggi').length, warna: '#c0392b' },
        { label: 'Sedang diproses', nilai: list.filter(l => l.status === 'diproses').length, warna: '#3b6ea8' },
        { label: 'Selesai', nilai: list.filter(l => l.status === 'selesai').length, warna: '#2f8a5b' },
      ]} />
      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <KotakCari nilai={cari} onUbah={setCari} petunjuk="Cari kode, pelapor, lokasi..." />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', alignItems: 'start' }}>
        {/* Table List */}
        <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e1e5e9', boxShadow: '0 1px 2px rgba(16,24,40,0.06)', overflow: 'hidden' }}>

          {/* === TAB FILTER === */}
          <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {[
                { key: 'semua',    label: 'Semua',    color: '#1f6b47', activeBg: '#e7f1eb',  activeText: '#17533a' },
                { key: 'masuk',    label: 'Masuk',    color: '#1f6b47', activeBg: '#e7f1eb',  activeText: '#17533a' },
                { key: 'diproses', label: 'Diproses', color: '#1f6b47', activeBg: '#e7f1eb',  activeText: '#17533a' },
                { key: 'selesai',  label: 'Selesai',  color: '#1f6b47', activeBg: '#e7f1eb',  activeText: '#17533a' },
              ].map(tab => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => { setActiveTab(tab.key); setSelectedReport(null); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '10px 18px', borderRadius: '6px',
                      border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: '0.875rem', fontWeight: isActive ? '700' : '500',
                      background: isActive ? tab.activeBg : 'transparent',
                      color: isActive ? tab.activeText : '#5b6673',
                      borderBottom: isActive ? `2px solid ${tab.color}` : '2px solid transparent',
                      transition: 'all 0.2s',
                    }}
                  >
                    {tab.label}
                    <span style={{
                      padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700',
                      background: isActive ? '#b9d8c6' : '#f1f3f5',
                      color: isActive ? tab.activeText : '#8a939d',
                    }}>
                      {counts[tab.key]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f7f8f9', color: '#4b5563', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '16px 24px' }}>Kode</th>
                  <th style={{ padding: '16px' }}>Pelapor</th>
                  <th style={{ padding: '16px' }}>Deskripsi</th>
                  <th style={{ padding: '16px' }}>Prioritas</th>
                  <th style={{ padding: '16px' }}>Status</th>
                  <th style={{ padding: '16px' }}>Jadwal Pengangkutan</th>
                  <th style={{ padding: '16px 24px', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map(l => (
                  <tr key={l.id} style={{
                    borderBottom: '1px solid #f3f4f6',
                    background: selectedReport && selectedReport.id === l.id ? '#f1f7f3' : 'transparent',
                    transition: 'background 0.2s'
                  }}>
                    <td style={{ padding: '16px 24px', fontWeight: '600', color: '#1f2933', whiteSpace: 'nowrap' }}>
                      {l.kode_laporan}
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: l.sumber && l.sumber !== 'website' ? '#5b6673' : '#8a939d', marginTop: '3px' }}>{SUMBER_LABEL[l.sumber || 'website']}</div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#374151' }}>{l.nama_pelapor}</div>
                      <div style={{ fontSize: '0.8rem', color: '#5b6673', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Phone size={12} /> {l.nomor_telepon}
                      </div>
                    </td>
                    <td style={{ padding: '16px', maxWidth: '200px' }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.9rem', color: '#4b5563' }}>{l.deskripsi}</div>
                      <div style={{ fontSize: '0.75rem', color: '#8a939d', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        <Calendar size={12} /> {new Date(l.created_at).toLocaleDateString('id-ID')}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700',
                        background: getPriorityInfo(l.prioritas).bg, color: getPriorityInfo(l.prioritas).text,
                        border: `1px solid ${getPriorityInfo(l.prioritas).border}`
                      }}>{getPriorityInfo(l.prioritas).label}</span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700',
                        background: getStatusInfo(l.status).bg, color: getStatusInfo(l.status).text,
                        border: `1px solid ${getStatusInfo(l.status).border}`
                      }}>{getStatusInfo(l.status).label}</span>
                      {l.teguran_pengawas && l.status !== 'selesai' && (
                        <div style={{ marginTop: '6px', fontSize: '0.72rem', fontWeight: '700', color: '#dc2626' }}>Teguran Bidang</div>
                      )}
                      {l.rating && (
                        <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#d97706' }}>{'★'.repeat(l.rating)}{'☆'.repeat(5 - l.rating)}</div>
                      )}
                    </td>

                    {/* === KOLOM JADWAL PENGANGKUTAN === */}
                    <td style={{ padding: '16px', minWidth: '160px' }}>
                      {l.jadwal_id ? (
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e40af' }}>{new Date(`${l.jadwal_tanggal}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • {l.jadwal_jam}</div>
                          <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>{l.nama_petugas}{l.jadwal_armada ? ` • ${l.jadwal_armada}` : ''}</div>
                        </div>
                      ) : l.status === 'selesai' ? (
                        <span style={{ fontSize: '0.8rem', color: '#5b6673' }}>{l.nama_petugas || '—'}</span>
                      ) : (
                        <button onClick={() => bukaJadwalkan(l)} style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '4px', border: 'none',
                          background: '#e7f1eb', color: '#17533a', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit'
                        }}>
                          <CalendarPlus size={15} /> Jadwalkan
                        </button>
                      )}
                    </td>

                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button onClick={() => setSelectedReport(l)} title="Detail Laporan" style={{
                          padding: '8px', borderRadius: '4px', border: '1px solid #d8dde3', background: 'white', color: '#4b5563', cursor: 'pointer', display: 'flex', transition: 'all 0.2s'
                        }} onMouseOver={e=>e.currentTarget.style.background='#f3f4f6'} onMouseOut={e=>e.currentTarget.style.background='white'}>
                          <Eye size={16} />
                        </button>
                        <button onClick={() => startEdit(l)} title="Ubah Prioritas" style={{
                          padding: '8px', borderRadius: '4px', border: '1px solid #d8dde3', background: 'white', color: '#2563eb', cursor: 'pointer', display: 'flex', transition: 'all 0.2s'
                        }} onMouseOver={e=>e.currentTarget.style.background='#eff6ff'} onMouseOut={e=>e.currentTarget.style.background='white'}>
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => setReportToDelete(l)} title="Hapus Laporan" style={{
                          padding: '8px', borderRadius: '4px', border: '1px solid #fee2e2', background: 'white', color: '#dc2626', cursor: 'pointer', display: 'flex', transition: 'all 0.2s'
                        }} onMouseOver={e=>e.currentTarget.style.background='#fef2f2'} onMouseOut={e=>e.currentTarget.style.background='white'}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredList.length === 0 && (
                  <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#8a939d' }}>
                    {activeTab === 'semua' ? 'Belum ada laporan masuk' : `Tidak ada laporan dengan status "${activeTab}"`}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        {selectedReport && (
          <div onClick={() => setSelectedReport(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'white', borderRadius: '12px', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 50px rgba(16,24,40,0.25)', padding: '28px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <span style={{ fontWeight: '700', color: '#1f2933', fontSize: '1.1rem' }}>Detail Laporan</span>
              <button onClick={() => setSelectedReport(null)} style={{ background: 'none', border: 'none', color: '#8a939d', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Photo */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '0.8rem', color: '#8a939d', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>Foto Bukti</div>
              {selectedReport.foto ? (
                <img 
                  src={`${API_URL}/uploads/${selectedReport.foto}`} 
                  alt="Bukti Sampah" 
                  style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #d8dde3' }}
                  onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=500&auto=format&fit=crop&q=60'; }}
                />
              ) : (
                <div style={{ 
                  height: '140px', borderRadius: '6px', border: '1.5px dashed #d8dde3', background: '#f7f8f9',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#8a939d', gap: '8px'
                }}>
                  <ImageIcon size={32} />
                  <span style={{ fontSize: '0.85rem' }}>Tidak ada foto bukti</span>
                </div>
              )}
            </div>

            {/* Badges Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#8a939d', fontWeight: '600', marginBottom: '6px' }}>Status</div>
                <span style={{ 
                  display: 'inline-block', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '700',
                  background: getStatusInfo(selectedReport.status).bg, color: getStatusInfo(selectedReport.status).text,
                  border: `1px solid ${getStatusInfo(selectedReport.status).border}`
                }}>{getStatusInfo(selectedReport.status).label}</span>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#8a939d', fontWeight: '600', marginBottom: '6px' }}>Prioritas</div>
                <span style={{ 
                  display: 'inline-block', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '700',
                  background: getPriorityInfo(selectedReport.prioritas).bg, color: getPriorityInfo(selectedReport.prioritas).text,
                  border: `1px solid ${getPriorityInfo(selectedReport.prioritas).border}`
                }}>{getPriorityInfo(selectedReport.prioritas).label}</span>
              </div>
            </div>

            {/* Rows info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#8a939d', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={14} /> Pelapor
                </div>
                <div style={{ fontWeight: '700', color: '#374151' }}>{selectedReport.nama_pelapor}</div>
                <div style={{ fontSize: '0.85rem', color: '#5b6673', marginTop: '2px' }}>Telepon/WA: {selectedReport.nomor_telepon}</div>
                <div style={{ fontSize: '0.8rem', color: '#5b6673', marginTop: '2px' }}>
                  Masuk lewat {SUMBER_LABEL[selectedReport.sumber || 'website']}{selectedReport.nama_pencatat ? ` • dicatat oleh ${selectedReport.nama_pencatat}` : ''}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: '#8a939d', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={14} /> Deskripsi Masalah
                </div>
                <div style={{ fontSize: '0.9rem', color: '#4b5563', lineHeight: '1.6', background: '#f7f8f9', padding: '12px', borderRadius: '4px', border: '1px solid #d8dde3' }}>
                  {selectedReport.deskripsi}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: '#8a939d', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} /> Lokasi Kejadian
                </div>
                <div style={{ fontSize: '0.9rem', color: '#4b5563', lineHeight: '1.5', marginBottom: '10px' }}>
                  {selectedReport.alamat_lokasi || 'Tidak ada keterangan alamat'}
                </div>
                {selectedReport.latitude && selectedReport.longitude ? (
                  <div>
                    {/* Koordinat */}
                    <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#5b6673', fontFamily: 'monospace' }}>
                      <MapPin size={13} color="#1f6b47" />
                      {selectedReport.latitude.toFixed(6)}, {selectedReport.longitude.toFixed(6)}
                    </div>
                    {/* Tombol Google Maps */}
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedReport.latitude},${selectedReport.longitude}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '9px 16px', borderRadius: '6px', textDecoration: 'none',
                        background: '#2b5c8a',
                        color: 'white', fontWeight: '700', fontSize: '0.82rem',
                        boxShadow: '0 1px 2px rgba(16,24,40,0.06)',
                        transition: 'all 0.2s',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                      Buka di Google Maps
                    </a>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: '#8a939d', fontStyle: 'italic' }}>Koordinat tidak tersedia</div>
                )}
              </div>

              {/* Patokan / Landmark */}
              {selectedReport.patokan && (
                <div style={{ background: '#fffbeb', padding: '16px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                  <div style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Landmark size={14} /> Patokan Lokasi
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#78350f', lineHeight: '1.6', fontStyle: 'italic' }}>
                    {selectedReport.patokan}
                  </div>
                </div>
              )}

              {/* Teguran dari pengawas bidang */}
              {selectedReport.teguran_pengawas && selectedReport.status !== 'selesai' && (
                <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '6px', border: '1px solid #fecaca' }}>
                  <div style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>Teguran dari Bidang</div>
                  <div style={{ fontSize: '0.9rem', color: '#7f1d1d', lineHeight: '1.6' }}>{selectedReport.teguran_pengawas}</div>
                  {selectedReport.teguran_at && <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#ef4444' }}>{new Date(selectedReport.teguran_at.replace(' ', 'T') + 'Z').toLocaleString('id-ID')}</div>}
                </div>
              )}

              {/* Petugas yang menangani */}
              {selectedReport.ditangani_oleh && (
                <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <UserCheck size={14} /> Ditangani Oleh Sopir dan Tim
                  </div>
                  <div style={{ fontWeight: '700', color: '#1e40af', fontSize: '0.95rem' }}>{selectedReport.nama_petugas}</div>
                  {selectedReport.jadwal_id && (
                    <div style={{ marginTop: '6px', fontSize: '0.82rem', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <Truck size={14} /> {selectedReport.jadwal_tanggal} pukul {selectedReport.jadwal_jam} • {selectedReport.jadwal_armada}
                      <span style={{ fontWeight: 700 }}>({String(selectedReport.jadwal_status).toUpperCase()})</span>
                    </div>
                  )}
                  {selectedReport.jadwal_kru && <div style={{ marginTop: '2px', fontSize: '0.8rem', color: '#3b82f6' }}>Kru: {selectedReport.jadwal_kru}</div>}
                  {selectedReport.catatan_tindak_lanjut && (
                    <div style={{ marginTop: '10px', padding: '10px', background: 'white', borderRadius: '4px', fontSize: '0.85rem', color: '#374151', lineHeight: '1.6', border: '1px solid #dbeafe', fontStyle: 'italic' }}>
                      "{selectedReport.catatan_tindak_lanjut}"
                    </div>
                  )}
                  {selectedReport.foto_tindak_lanjut && (
                    <a href={`${API_URL}/uploads/${selectedReport.foto_tindak_lanjut}`} target="_blank" rel="noopener noreferrer">
                      <img src={`${API_URL}/uploads/${selectedReport.foto_tindak_lanjut}`} alt="Foto kegiatan penanganan"
                        style={{ marginTop: '10px', width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #dbeafe', cursor: 'zoom-in' }} />
                    </a>
                  )}
                  <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#60a5fa' }}>
                    Diperbarui: {new Date(selectedReport.updated_at).toLocaleString('id-ID')}
                  </div>
                </div>
              )}

              {/* Umpan balik ke pelapor */}
              {selectedReport.status === 'selesai' && (
                <div style={{ background: '#f1f7f3', padding: '16px', borderRadius: '6px', border: '1px solid #b9d8c6' }}>
                  <div style={{ fontSize: '0.8rem', color: '#17533a', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>Umpan Balik Pelapor</div>
                  {selectedReport.rating ? (
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ fontSize: '1.1rem', color: '#d97706' }}>{'★'.repeat(selectedReport.rating)}{'☆'.repeat(5 - selectedReport.rating)}</div>
                      {selectedReport.ulasan && <div style={{ fontSize: '0.85rem', color: '#374151', marginTop: '4px', fontStyle: 'italic' }}>"{selectedReport.ulasan}"</div>}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '10px' }}>Pelapor belum memberi penilaian.</div>
                  )}
                  <a href={linkWhatsApp(selectedReport)} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'block', textAlign: 'center', padding: '10px', background: '#1f6b47', color: 'white', borderRadius: '4px', fontWeight: '700', fontSize: '0.85rem', textDecoration: 'none' }}>
                    Kabari Pelapor via WhatsApp
                  </a>
                </div>
              )}
            </div>

            {/* Quick Action in details */}
            {selectedReport.status !== 'selesai' && !selectedReport.jadwal_id && (
              <div style={{ marginTop: '30px', borderTop: '1px solid #f3f4f6', paddingTop: '20px' }}>
                <button
                  onClick={() => { const l = selectedReport; setSelectedReport(null); bukaJadwalkan(l); }}
                  style={{
                    width: '100%', padding: '12px', background: '#1f6b47', color: 'white',
                    border: 'none', borderRadius: '6px', fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'inherit'
                  }}
                >
                  <CalendarPlus size={16} /> Jadwalkan Pengangkutan
                </button>
              </div>
            )}
          </div>
          </div>
        )}
      </div>

      {/* Edit Modal / Backdrop */}
      {editingReport && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'white', border: '1px solid #e1e5e9', borderRadius: '10px', padding: '36px', width: '100%', maxWidth: '440px',
            boxShadow: '0 1px 2px rgba(16,24,40,0.06)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#1f2933' }}>Prioritas {editingReport.kode_laporan}</h3>
              <button onClick={() => setEditingReport(null)} style={{ background: 'none', border: 'none', color: '#8a939d', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>Prioritas Penanganan</label>
                <select 
                  value={editPrioritas} 
                  onChange={e => setEditPrioritas(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1.5px solid #d8dde3', outline: 'none', fontFamily: 'inherit' }}
                >
                  <option value="">Belum ditentukan</option>
                  <option value="rendah">Rendah</option>
                  <option value="sedang">Sedang</option>
                  <option value="tinggi">Tinggi</option>
                </select>
                <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#5b6673' }}>
                  Status laporan mengikuti jadwal pengangkutannya: diproses saat dijadwalkan, selesai saat sopir menyelesaikan jadwal.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setEditingReport(null)} style={{
                  flex: 1, padding: '12px', border: '1px solid #d8dde3', background: 'white', color: '#4b5563',
                  borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit'
                }}>
                  Batal
                </button>
                <button type="submit" disabled={updating} style={{
                  flex: 1, padding: '12px', border: 'none', background: '#1f6b47', color: 'white',
                  borderRadius: '6px', fontWeight: '700', cursor: updating ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}>
                  {updating ? 'Menyimpan...' : <><Check size={16} /> Simpan</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Catat laporan dari telepon / WhatsApp */}
      {catat && (
        <div style={overlay}>
          <div style={{ ...kotak, maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#1f2933' }}>Catat Laporan Masyarakat</h3>
              <button onClick={() => setCatat(null)} style={{ background: 'none', border: 'none', color: '#8a939d', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <p style={{ margin: '0 0 18px', fontSize: '0.84rem', color: '#5b6673' }}>Untuk laporan atau permohonan pelayanan yang masuk lewat telepon atau WhatsApp.</p>
            <form onSubmit={kirimCatat}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 2, minWidth: '200px' }}>
                  <label style={lbl}>Nama Pelapor / Pemohon</label>
                  <input required value={catat.nama_pelapor} onChange={e => setCatat({ ...catat, nama_pelapor: e.target.value })} placeholder="contoh: Pemdes Ciracap" style={inp} />
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label style={lbl}>Masuk Lewat</label>
                  <select value={catat.sumber} onChange={e => setCatat({ ...catat, sumber: e.target.value })} style={inp}>
                    <option value="telepon">Telepon</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
              </div>
              <label style={lbl}>Nomor Telepon / WhatsApp</label>
              <input required value={catat.nomor_telepon} onChange={e => setCatat({ ...catat, nomor_telepon: e.target.value })} placeholder="08xxxxxxxxxx" style={inp} />
              <label style={lbl}>Lokasi</label>
              <input required value={catat.alamat_lokasi} onChange={e => setCatat({ ...catat, alamat_lokasi: e.target.value })} placeholder="contoh: Lapangan Desa Ciracap, Kec. Ciracap" style={inp} />
              <label style={lbl}>Patokan <span style={{ color: '#8a939d', fontWeight: 400 }}>(opsional)</span></label>
              <input value={catat.patokan} onChange={e => setCatat({ ...catat, patokan: e.target.value })} placeholder="contoh: depan masjid" style={inp} />
              <label style={lbl}>Keterangan</label>
              <textarea required rows={3} value={catat.deskripsi} onChange={e => setCatat({ ...catat, deskripsi: e.target.value })} placeholder="contoh: Permohonan pengangkutan sampah bekas acara desa" style={{ ...inp, resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label style={lbl}>Prioritas <span style={{ color: '#8a939d', fontWeight: 400 }}>(opsional)</span></label>
                  <select value={catat.prioritas} onChange={e => setCatat({ ...catat, prioritas: e.target.value })} style={inp}>
                    <option value="">Belum ditentukan</option>
                    <option value="rendah">Rendah</option>
                    <option value="sedang">Sedang</option>
                    <option value="tinggi">Tinggi</option>
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label style={lbl}>Foto <span style={{ color: '#8a939d', fontWeight: 400 }}>(opsional)</span></label>
                  <input type="file" accept="image/*" onChange={e => setCatatFoto(e.target.files[0] || null)} style={{ ...inp, padding: '8px' }} />
                </div>
              </div>
              <button type="submit" disabled={updating} style={{ ...tombolUtama, marginTop: '4px' }}>{updating ? 'Menyimpan...' : 'Simpan Laporan'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Jadwalkan laporan sebagai jadwal tambahan */}
      {jadwalkan && (
        <div style={overlay}>
          <div style={{ ...kotak, maxWidth: '540px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#1f2933' }}>Jadwalkan Pengangkutan</h3>
              <button onClick={() => setJadwalkan(null)} style={{ background: 'none', border: 'none', color: '#8a939d', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ background: '#f7f8f9', border: '1px solid #d8dde3', borderRadius: '6px', padding: '12px', margin: '0 0 18px', fontSize: '0.85rem', color: '#374151', lineHeight: 1.5 }}>
              <div style={{ fontWeight: 700 }}>{jadwalkan.laporan.kode_laporan} • {jadwalkan.laporan.nama_pelapor}</div>
              <div><MapPin size={12} /> {jadwalkan.laporan.alamat_lokasi || jadwalkan.laporan.patokan || '-'}</div>
              <div style={{ color: '#5b6673' }}>{jadwalkan.laporan.deskripsi}</div>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); kirimJadwalkan(false); }}>
              <label style={lbl}>Prioritas</label>
              <select required value={jadwalkan.prioritas} onChange={e => setJadwalkan({ ...jadwalkan, prioritas: e.target.value })} style={inp}>
                <option value="" disabled>-- Tentukan prioritas --</option>
                <option value="tinggi">Tinggi</option>
                <option value="sedang">Sedang</option>
                <option value="rendah">Rendah</option>
              </select>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Tanggal</label>
                  <input type="date" required min={hariIni()} value={jadwalkan.tanggal} onChange={e => setJadwalkan({ ...jadwalkan, tanggal: e.target.value })} style={inp} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Jam Berangkat</label>
                  <input type="time" required value={jadwalkan.jam} onChange={e => setJadwalkan({ ...jadwalkan, jam: e.target.value })} style={inp} />
                </div>
              </div>
              <label style={lbl}>Armada</label>
              <select required value={jadwalkan.kendaraan_id} onChange={e => setJadwalkan({ ...jadwalkan, kendaraan_id: e.target.value })} style={inp}>
                <option value="" disabled>-- Pilih Armada --</option>
                {kendaraanList.map(k => <option key={k.id} value={k.id}>{k.nomor_polisi} ({k.jenis_kendaraan})</option>)}
              </select>
              <label style={lbl}>Sopir (Ketua Tim)</label>
              <select required value={jadwalkan.sopir_id} onChange={e => setJadwalkan({ ...jadwalkan, sopir_id: e.target.value })} style={inp}>
                <option value="" disabled>-- Pilih Sopir --</option>
                {petugasList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <label style={lbl}>Kru ({jadwalkan.kru_ids.length} dipilih)</label>
              <div style={{ border: '1.5px solid #d8dde3', borderRadius: '6px', padding: '8px 12px', marginBottom: '14px', maxHeight: '140px', overflowY: 'auto' }}>
                {kruList.length === 0 && <div style={{ fontSize: '0.85rem', color: '#8a939d' }}>Belum ada data kru aktif</div>}
                {kruList.filter(k => String(k.id) !== String(jadwalkan.sopir_id)).map(k => (
                  <label key={k.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={jadwalkan.kru_ids.includes(k.id)} onChange={() => toggleKru(k.id)} /> {k.name}{k.peran === 'sopir' && <span style={{ fontSize: '0.75rem', color: '#1d4f73' }}>(sopir)</span>}
                  </label>
                ))}
              </div>
              <label style={lbl}>Catatan <span style={{ color: '#8a939d', fontWeight: 400 }}>(opsional)</span></label>
              <input value={jadwalkan.catatan} onChange={e => setJadwalkan({ ...jadwalkan, catatan: e.target.value })} style={inp} />
              <button type="submit" disabled={updating} style={tombolUtama}>{updating ? 'Menyimpan...' : 'Simpan Jadwal'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Peringatan bentrok */}
      {bentrok && (
        <div style={{ ...overlay, zIndex: 1100 }}>
          <div style={{ ...kotak, maxWidth: '480px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertTriangle size={24} /></div>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Jadwal Bentrok</h3>
            </div>
            <p style={{ color: '#4b5563', fontSize: '0.9rem', margin: '0 0 10px' }}>Pada waktu yang sama sudah ada jadwal lain:</p>
            <ul style={{ margin: '0 0 18px', paddingLeft: '20px', color: '#b45309', fontSize: '0.88rem', lineHeight: 1.6 }}>
              {bentrok.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setBentrok(null)} style={{ flex: 1, padding: '10px', border: '1px solid #d8dde3', background: 'white', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Ubah Lagi</button>
              <button onClick={() => kirimJadwalkan(true)} style={{ flex: 1, padding: '10px', border: 'none', background: '#d97706', color: 'white', borderRadius: '4px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Tetap Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {reportToDelete && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'white', border: '1px solid #e1e5e9', borderRadius: '10px', padding: '36px', width: '100%', maxWidth: '400px',
            boxShadow: '0 1px 2px rgba(16,24,40,0.06)', textAlign: 'center'
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
            }}>
              <AlertTriangle size={32} />
            </div>
            <h3 style={{ margin: '0 0 10px', fontSize: '1.25rem', fontWeight: '700', color: '#1f2933' }}>Hapus Laporan?</h3>
            <p style={{ color: '#5b6673', fontSize: '0.9rem', marginBottom: '28px', lineHeight: '1.6' }}>
              Apakah Anda yakin ingin menghapus laporan <strong>{reportToDelete.kode_laporan}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setReportToDelete(null)} style={{
                flex: 1, padding: '12px', border: '1px solid #d8dde3', background: 'white', color: '#4b5563',
                borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit'
              }}>
                Batal
              </button>
              <button onClick={confirmDelete} disabled={updating} style={{
                flex: 1, padding: '12px', border: 'none', background: '#dc2626', color: 'white',
                borderRadius: '6px', fontWeight: '700', cursor: updating ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}>
                {updating ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
