import { useEffect, useState } from 'react';
import axios from 'axios';
import { MessageSquareWarning, Eye, Trash2, Edit2, Check, X, MapPin, Phone, Calendar, User, FileText, AlertTriangle, Image as ImageIcon, UserCheck, Landmark } from 'lucide-react';
import { API_URL } from '../../config';


export default function LaporanMasyarakat() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [editingReport, setEditingReport] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [editPrioritas, setEditPrioritas] = useState('');
  const [updating, setUpdating] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState('semua');

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

  useEffect(() => {
    const load = async () => {
      await fetchData();
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
      alert('Gagal menghapus laporan');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await axios.put(`${API_URL}/admin/laporan-masyarakat/${editingReport.id}`, {
        status: editStatus,
        prioritas: editPrioritas
      }, { withCredentials: true });
      
      setEditingReport(null);
      fetchData();
      // Update selected report view if open
      if (selectedReport && selectedReport.id === editingReport.id) {
        setSelectedReport(prev => ({ ...prev, status: editStatus, prioritas: editPrioritas }));
      }
    } catch (err) {
      console.error(err);
      alert('Gagal memperbarui laporan');
    } finally {
      setUpdating(false);
    }
  };

  const startEdit = (report) => {
    setEditingReport(report);
    setEditStatus(report.status);
    setEditPrioritas(report.prioritas);
  };

  const getPriorityInfo = (prioritas) => {
    switch(prioritas) {
      case 'tinggi': return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', label: 'Tinggi' };
      case 'sedang': return { bg: '#fffbeb', text: '#d97706', border: '#fde68a', label: 'Sedang' };
      default: return { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', label: 'Rendah' };
    }
  };

  const getStatusInfo = (status) => {
    switch(status) {
      case 'selesai': return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0', label: 'Selesai' };
      case 'diproses': return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', label: 'Diproses' };
      default: return { bg: '#f3f4f6', text: '#4b5563', border: '#e5e7eb', label: 'Masuk' };
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
  const filteredList = activeTab === 'semua' ? list : list.filter(l => l.status === activeTab);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Memuat data laporan...</div>;

  return (
    <div style={{ padding: '40px', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1f2937' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
            color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <MessageSquareWarning size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800', color: '#111827', letterSpacing: '-0.5px' }}>Laporan Masyarakat</h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#6b7280' }}>Kelola laporan dan pantau tindak lanjut kebersihan dari warga.</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedReport ? '1.2fr 0.8fr' : '1fr', gap: '30px', alignItems: 'start' }}>
        {/* Table List */}
        <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #f3f4f6', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', overflow: 'hidden' }}>

          {/* === TAB FILTER === */}
          <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {[
                { key: 'semua',    label: 'Semua',    color: '#6b7280', activeBg: '#f3f4f6',  activeText: '#111827' },
                { key: 'masuk',    label: 'Masuk',    color: '#4b5563', activeBg: '#f3f4f6',  activeText: '#111827' },
                { key: 'diproses', label: 'Diproses', color: '#2563eb', activeBg: '#eff6ff',  activeText: '#2563eb' },
                { key: 'selesai',  label: 'Selesai',  color: '#059669', activeBg: '#ecfdf5',  activeText: '#059669' },
              ].map(tab => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => { setActiveTab(tab.key); setSelectedReport(null); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '10px 18px', borderRadius: '10px 10px 0 0',
                      border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: '0.875rem', fontWeight: isActive ? '700' : '500',
                      background: isActive ? tab.activeBg : 'transparent',
                      color: isActive ? tab.activeText : '#6b7280',
                      borderBottom: isActive ? `2px solid ${tab.color}` : '2px solid transparent',
                      transition: 'all 0.2s',
                    }}
                  >
                    {tab.label}
                    <span style={{
                      padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700',
                      background: isActive ? (tab.key === 'selesai' ? '#a7f3d0' : tab.key === 'diproses' ? '#bfdbfe' : '#e5e7eb') : '#f3f4f6',
                      color: isActive ? tab.activeText : '#9ca3af',
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
                <tr style={{ background: '#f9fafb', color: '#4b5563', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '16px 24px' }}>Kode</th>
                  <th style={{ padding: '16px' }}>Pelapor</th>
                  <th style={{ padding: '16px' }}>Deskripsi</th>
                  <th style={{ padding: '16px' }}>Prioritas</th>
                  <th style={{ padding: '16px' }}>Status</th>
                  <th style={{ padding: '16px' }}>Ditangani Oleh</th>
                  <th style={{ padding: '16px 24px', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map(l => (
                  <tr key={l.id} style={{
                    borderBottom: '1px solid #f3f4f6',
                    background: selectedReport && selectedReport.id === l.id ? '#f0fdf4' : 'transparent',
                    transition: 'background 0.2s'
                  }}>
                    <td style={{ padding: '16px 24px', fontWeight: '600', color: '#111827', whiteSpace: 'nowrap' }}>{l.kode_laporan}</td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#374151' }}>{l.nama_pelapor}</div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Phone size={12} /> {l.nomor_telepon}
                      </div>
                    </td>
                    <td style={{ padding: '16px', maxWidth: '200px' }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.9rem', color: '#4b5563' }}>{l.deskripsi}</div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        <Calendar size={12} /> {new Date(l.created_at).toLocaleDateString('id-ID')}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '700',
                        background: getPriorityInfo(l.prioritas).bg, color: getPriorityInfo(l.prioritas).text,
                        border: `1px solid ${getPriorityInfo(l.prioritas).border}`
                      }}>{getPriorityInfo(l.prioritas).label}</span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '700',
                        background: getStatusInfo(l.status).bg, color: getStatusInfo(l.status).text,
                        border: `1px solid ${getStatusInfo(l.status).border}`
                      }}>{getStatusInfo(l.status).label}</span>
                    </td>

                    {/* === KOLOM DITANGANI OLEH (B) === */}
                    <td style={{ padding: '16px', minWidth: '140px' }}>
                      {l.ditangani_oleh ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontSize: '0.7rem', fontWeight: '700', flexShrink: 0
                          }}>
                            {l.nama_petugas?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: '600', color: '#1e40af' }}>{l.nama_petugas}</div>
                            <div style={{ fontSize: '0.72rem', color: '#60a5fa' }}>Petugas</div>
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#d1d5db', fontStyle: 'italic' }}>—</span>
                      )}
                    </td>

                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button onClick={() => setSelectedReport(l)} title="Detail Laporan" style={{
                          padding: '8px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', color: '#4b5563', cursor: 'pointer', display: 'flex', transition: 'all 0.2s'
                        }} onMouseOver={e=>e.currentTarget.style.background='#f3f4f6'} onMouseOut={e=>e.currentTarget.style.background='white'}>
                          <Eye size={16} />
                        </button>
                        <button onClick={() => startEdit(l)} title="Edit Status/Prioritas" style={{
                          padding: '8px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', color: '#2563eb', cursor: 'pointer', display: 'flex', transition: 'all 0.2s'
                        }} onMouseOver={e=>e.currentTarget.style.background='#eff6ff'} onMouseOut={e=>e.currentTarget.style.background='white'}>
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => setReportToDelete(l)} title="Hapus Laporan" style={{
                          padding: '8px', borderRadius: '8px', border: '1px solid #fee2e2', background: 'white', color: '#dc2626', cursor: 'pointer', display: 'flex', transition: 'all 0.2s'
                        }} onMouseOver={e=>e.currentTarget.style.background='#fef2f2'} onMouseOut={e=>e.currentTarget.style.background='white'}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredList.length === 0 && (
                  <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                    {activeTab === 'semua' ? 'Belum ada laporan masuk' : `Tidak ada laporan dengan status "${activeTab}"`}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        {selectedReport && (
          <div style={{ 
            background: 'white', borderRadius: '20px', border: '1px solid #f3f4f6', 
            boxShadow: '0 10px 30px rgba(0,0,0,0.05)', padding: '30px',
            animation: 'fadeInUp 0.3s ease-out', position: 'sticky', top: '90px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <span style={{ fontWeight: '800', color: '#111827', fontSize: '1.1rem' }}>Detail Laporan</span>
              <button onClick={() => setSelectedReport(null)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Photo */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>Foto Bukti</div>
              {selectedReport.foto ? (
                <img 
                  src={`${API_URL}/uploads/${selectedReport.foto}`} 
                  alt="Bukti Sampah" 
                  style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '12px', border: '1px solid #e5e7eb' }}
                  onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=500&auto=format&fit=crop&q=60'; }}
                />
              ) : (
                <div style={{ 
                  height: '140px', borderRadius: '12px', border: '1.5px dashed #e5e7eb', background: '#f9fafb',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', gap: '8px'
                }}>
                  <ImageIcon size={32} />
                  <span style={{ fontSize: '0.85rem' }}>Tidak ada foto bukti</span>
                </div>
              )}
            </div>

            {/* Badges Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: '600', marginBottom: '6px' }}>Status</div>
                <span style={{ 
                  display: 'inline-block', padding: '6px 12px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: '700',
                  background: getStatusInfo(selectedReport.status).bg, color: getStatusInfo(selectedReport.status).text,
                  border: `1px solid ${getStatusInfo(selectedReport.status).border}`
                }}>{getStatusInfo(selectedReport.status).label}</span>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: '600', marginBottom: '6px' }}>Prioritas</div>
                <span style={{ 
                  display: 'inline-block', padding: '6px 12px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: '700',
                  background: getPriorityInfo(selectedReport.prioritas).bg, color: getPriorityInfo(selectedReport.prioritas).text,
                  border: `1px solid ${getPriorityInfo(selectedReport.prioritas).border}`
                }}>{getPriorityInfo(selectedReport.prioritas).label}</span>
              </div>
            </div>

            {/* Rows info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={14} /> Pelapor
                </div>
                <div style={{ fontWeight: '700', color: '#374151' }}>{selectedReport.nama_pelapor}</div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '2px' }}>WhatsApp: {selectedReport.nomor_telepon}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={14} /> Deskripsi Masalah
                </div>
                <div style={{ fontSize: '0.9rem', color: '#4b5563', lineHeight: '1.6', background: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  {selectedReport.deskripsi}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} /> Lokasi Kejadian
                </div>
                <div style={{ fontSize: '0.9rem', color: '#4b5563', lineHeight: '1.5', marginBottom: '10px' }}>
                  {selectedReport.alamat_lokasi || 'Tidak ada keterangan alamat'}
                </div>
                {selectedReport.latitude && selectedReport.longitude ? (
                  <div>
                    {/* Koordinat */}
                    <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#6b7280', fontFamily: 'monospace' }}>
                      <MapPin size={13} color="#059669" />
                      {selectedReport.latitude.toFixed(6)}, {selectedReport.longitude.toFixed(6)}
                    </div>
                    {/* Tombol Google Maps */}
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedReport.latitude},${selectedReport.longitude}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '9px 16px', borderRadius: '10px', textDecoration: 'none',
                        background: 'linear-gradient(135deg, #1a73e8, #1557b0)',
                        color: 'white', fontWeight: '700', fontSize: '0.82rem',
                        boxShadow: '0 3px 10px rgba(26,115,232,0.25)',
                        transition: 'all 0.2s',
                      }}
                      onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 5px 14px rgba(26,115,232,0.35)'; }}
                      onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(26,115,232,0.25)'; }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                      Buka di Google Maps
                    </a>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: '#9ca3af', fontStyle: 'italic' }}>Koordinat tidak tersedia</div>
                )}
              </div>

              {/* Patokan / Landmark */}
              {selectedReport.patokan && (
                <div style={{ background: '#fffbeb', padding: '16px', borderRadius: '12px', border: '1px solid #fde68a' }}>
                  <div style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Landmark size={14} /> Patokan Lokasi
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#78350f', lineHeight: '1.6', fontStyle: 'italic' }}>
                    📍 {selectedReport.patokan}
                  </div>
                </div>
              )}

              {/* Petugas yang menangani */}
              {selectedReport.ditangani_oleh && (
                <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <UserCheck size={14} /> Ditangani Oleh Petugas
                  </div>
                  <div style={{ fontWeight: '700', color: '#1e40af', fontSize: '0.95rem' }}>{selectedReport.nama_petugas}</div>
                  {selectedReport.catatan_tindak_lanjut && (
                    <div style={{ marginTop: '10px', padding: '10px', background: 'white', borderRadius: '8px', fontSize: '0.85rem', color: '#374151', lineHeight: '1.6', border: '1px solid #dbeafe', fontStyle: 'italic' }}>
                      💬 "{selectedReport.catatan_tindak_lanjut}"
                    </div>
                  )}
                  <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#60a5fa' }}>
                    Diperbarui: {new Date(selectedReport.updated_at).toLocaleString('id-ID')}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action in details */}
            <div style={{ marginTop: '30px', borderTop: '1px solid #f3f4f6', paddingTop: '20px' }}>
              <button 
                onClick={() => startEdit(selectedReport)}
                style={{
                  width: '100%', padding: '12px', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', color: 'white',
                  border: 'none', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                <Edit2 size={16} /> Ubah Status / Prioritas
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal / Backdrop */}
      {editingReport && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'white', borderRadius: '24px', padding: '36px', width: '100%', maxWidth: '440px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)', animation: 'fadeInUp 0.25s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#111827' }}>Ubah Laporan</h3>
              <button onClick={() => setEditingReport(null)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>Status Laporan</label>
                <select 
                  value={editStatus} 
                  onChange={e => setEditStatus(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #e5e7eb', outline: 'none', fontFamily: 'inherit' }}
                >
                  <option value="masuk">Masuk (Baru)</option>
                  <option value="diproses">Diproses</option>
                  <option value="selesai">Selesai</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>Prioritas Penanganan</label>
                <select 
                  value={editPrioritas} 
                  onChange={e => setEditPrioritas(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #e5e7eb', outline: 'none', fontFamily: 'inherit' }}
                >
                  <option value="rendah">Rendah</option>
                  <option value="sedang">Sedang</option>
                  <option value="tinggi">Tinggi</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setEditingReport(null)} style={{
                  flex: 1, padding: '12px', border: '1px solid #e5e7eb', background: 'white', color: '#4b5563',
                  borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit'
                }}>
                  Batal
                </button>
                <button type="submit" disabled={updating} style={{
                  flex: 1, padding: '12px', border: 'none', background: 'linear-gradient(135deg, #059669, #047857)', color: 'white',
                  borderRadius: '10px', fontWeight: '700', cursor: updating ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}>
                  {updating ? 'Menyimpan...' : <><Check size={16} /> Simpan</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {reportToDelete && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'white', borderRadius: '24px', padding: '36px', width: '100%', maxWidth: '400px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)', animation: 'fadeInUp 0.25s ease-out', textAlign: 'center'
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
            }}>
              <AlertTriangle size={32} />
            </div>
            <h3 style={{ margin: '0 0 10px', fontSize: '1.25rem', fontWeight: '800', color: '#111827' }}>Hapus Laporan?</h3>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '28px', lineHeight: '1.6' }}>
              Apakah Anda yakin ingin menghapus laporan <strong>{reportToDelete.kode_laporan}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setReportToDelete(null)} style={{
                flex: 1, padding: '12px', border: '1px solid #e5e7eb', background: 'white', color: '#4b5563',
                borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit'
              }}>
                Batal
              </button>
              <button onClick={confirmDelete} disabled={updating} style={{
                flex: 1, padding: '12px', border: 'none', background: '#dc2626', color: 'white',
                borderRadius: '10px', fontWeight: '700', cursor: updating ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
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
