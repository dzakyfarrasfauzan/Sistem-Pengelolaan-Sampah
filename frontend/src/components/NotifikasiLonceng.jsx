import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Bell, X, Volume2, VolumeX, CheckCheck } from 'lucide-react';
import { API_URL } from '../config';

const INTERVAL_MS = 15000;   // cek pemberitahuan baru setiap 15 detik
const LAMA_POPUP_MS = 7000;  // pop up hilang otomatis setelah 7 detik
const KUNCI_SUARA = 'notifikasi-suara';

const bacaPengaturan = () => {
  try { return localStorage.getItem(KUNCI_SUARA) !== 'mati'; } catch { return true; }
};
const simpanPengaturan = (aktif) => {
  try { localStorage.setItem(KUNCI_SUARA, aktif ? 'hidup' : 'mati'); } catch { /* penyimpanan browser tidak tersedia */ }
};

// Efek suara "ding-dong" dibuat langsung dengan Web Audio API (tanpa file suara)
let audioCtx = null;
function bunyikan() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const mulai = audioCtx.currentTime;
    [[1318.5, 0], [987.8, 0.18]].forEach(([frekuensi, jeda]) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = frekuensi;
      gain.gain.setValueAtTime(0.0001, mulai + jeda);
      gain.gain.exponentialRampToValueAtTime(0.35, mulai + jeda + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, mulai + jeda + 0.5);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(mulai + jeda);
      osc.stop(mulai + jeda + 0.55);
    });
  } catch { /* browser tidak mendukung suara */ }
}

const WARNA_JENIS = {
  teguran: '#dc2626', terlambat: '#dc2626', kendaraan_rusak: '#ea580c',
  laporan_baru: '#2563eb', laporan_ditugaskan: '#2563eb', jadwal_baru: '#0891b2', armada_diganti: '#ea580c',
  laporan_selesai: '#059669', pengangkutan_selesai: '#059669', penilaian: '#d97706',
};

const waktuLalu = (t) => {
  const detik = Math.max(0, (Date.now() - new Date(String(t).replace(' ', 'T') + 'Z').getTime()) / 1000);
  if (detik < 60) return 'baru saja';
  if (detik < 3600) return `${Math.floor(detik / 60)} menit lalu`;
  if (detik < 86400) return `${Math.floor(detik / 3600)} jam lalu`;
  return `${Math.floor(detik / 86400)} hari lalu`;
};

/**
 * Lonceng pemberitahuan di header: pop up + efek suara ketika ada pemberitahuan baru,
 * dan riwayat pemberitahuan 30 hari terakhir saat lonceng diklik.
 */
export default function NotifikasiLonceng() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [belumDibaca, setBelumDibaca] = useState(0);
  const [masaSimpan, setMasaSimpan] = useState(30);
  const [buka, setBuka] = useState(false);
  const [popup, setPopup] = useState([]);
  const [suaraAktif, setSuaraAktif] = useState(bacaPengaturan);
  const idTerakhir = useRef(null);
  const suaraRef = useRef(suaraAktif);
  const panelRef = useRef(null);

  const tampilkanPopup = useCallback((items) => {
    const baru = items.map(n => ({ ...n, kunci: `${n.id}-${Date.now()}` }));
    setPopup(p => [...baru, ...p].slice(0, 3));
    baru.forEach(n => setTimeout(() => setPopup(p => p.filter(x => x.kunci !== n.kunci)), LAMA_POPUP_MS));
    if (suaraRef.current) bunyikan();
  }, []);

  const muat = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/notifikasi`, { withCredentials: true });
      if (!res.data.success) return;
      const data = res.data.data || [];
      setList(data);
      setBelumDibaca(res.data.belumDibaca);
      setMasaSimpan(res.data.masaSimpanHari || 30);
      const maks = data.reduce((m, n) => Math.max(m, n.id), 0);
      if (idTerakhir.current === null) {
        // Saat pertama dibuka: ringkas pemberitahuan yang belum dibaca dalam satu pop up
        if (res.data.belumDibaca > 0) {
          tampilkanPopup([{ id: 0, jenis: 'info', judul: 'Pemberitahuan belum dibaca', pesan: `Anda memiliki ${res.data.belumDibaca} pemberitahuan yang belum dibaca. Klik lonceng untuk melihat.` }]);
        }
      } else {
        const baru = data.filter(n => n.id > idTerakhir.current).reverse();
        if (baru.length) tampilkanPopup(baru);
      }
      idTerakhir.current = Math.max(idTerakhir.current || 0, maks);
    } catch { /* belum login atau server mati: coba lagi pada putaran berikutnya */ }
  }, [tampilkanPopup]);

  useEffect(() => {
    const awal = setTimeout(muat, 0);
    const timer = setInterval(muat, INTERVAL_MS);
    return () => { clearTimeout(awal); clearInterval(timer); };
  }, [muat]);

  // Tutup panel bila klik di luar lonceng
  useEffect(() => {
    if (!buka) return;
    const tutup = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setBuka(false); };
    document.addEventListener('mousedown', tutup);
    return () => document.removeEventListener('mousedown', tutup);
  }, [buka]);

  const ubahSuara = () => {
    const aktif = !suaraAktif;
    setSuaraAktif(aktif);
    suaraRef.current = aktif;
    simpanPengaturan(aktif);
    if (aktif) bunyikan();
  };

  const bukaNotifikasi = async (n) => {
    if (n.id && !n.dibaca) {
      try { await axios.put(`${API_URL}/api/notifikasi/${n.id}/baca`, {}, { withCredentials: true }); } catch { /* abaikan */ }
    }
    setBuka(false);
    setPopup(p => p.filter(x => x.id !== n.id));
    if (n.tautan) navigate(n.tautan);
    else if (!n.id) setBuka(true);
    muat();
  };

  const bacaSemua = async () => {
    try { await axios.put(`${API_URL}/api/notifikasi/baca-semua`, {}, { withCredentials: true }); } catch { /* abaikan */ }
    muat();
  };

  return (
    <>
      <div ref={panelRef} style={{ position: 'relative' }}>
        <button onClick={() => setBuka(!buka)} aria-label="Pemberitahuan" title="Pemberitahuan"
          style={{ position: 'relative', width: '42px', height: '42px', borderRadius: '50%', border: '1px solid #e5e7eb', background: buka ? '#f3f4f6' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}>
          <Bell size={20} />
          {belumDibaca > 0 && (
            <span style={{ position: 'absolute', top: '-4px', right: '-4px', minWidth: '20px', height: '20px', padding: '0 5px', borderRadius: '10px', background: '#ef4444', color: 'white', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', boxSizing: 'border-box' }}>
              {belumDibaca > 99 ? '99+' : belumDibaca}
            </span>
          )}
        </button>

        {buka && (
          <div style={{ position: 'absolute', right: 0, top: '52px', width: '380px', maxWidth: 'calc(100vw - 32px)', background: 'white', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb', zIndex: 2000, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ fontWeight: 700, color: '#111827' }}>Pemberitahuan</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={ubahSuara} title={suaraAktif ? 'Matikan suara' : 'Hidupkan suara'}
                  style={{ border: 'none', background: '#f3f4f6', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#374151', display: 'flex' }}>
                  {suaraAktif ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
                {belumDibaca > 0 && (
                  <button onClick={bacaSemua} style={{ border: 'none', background: '#eff6ff', color: '#2563eb', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCheck size={14} /> Tandai semua dibaca
                  </button>
                )}
              </div>
            </div>
            <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
              {list.length === 0 ? (
                <div style={{ padding: '30px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>Belum ada pemberitahuan</div>
              ) : list.map(n => (
                <button key={n.id} onClick={() => bukaNotifikasi(n)}
                  style={{ display: 'flex', gap: '10px', width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none', borderBottom: '1px solid #f9fafb', background: n.dibaca ? 'white' : '#eff6ff', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', marginTop: '6px', flexShrink: 0, background: n.dibaca ? 'transparent' : (WARNA_JENIS[n.jenis] || '#2563eb') }} />
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontWeight: n.dibaca ? 500 : 700, color: WARNA_JENIS[n.jenis] || '#111827', fontSize: '0.88rem' }}>{n.judul}</span>
                    <span style={{ display: 'block', color: '#4b5563', fontSize: '0.82rem', lineHeight: 1.45, marginTop: '2px' }}>{n.pesan}</span>
                    <span style={{ display: 'block', color: '#9ca3af', fontSize: '0.74rem', marginTop: '4px' }}>{waktuLalu(n.created_at)}</span>
                  </span>
                </button>
              ))}
            </div>
            <div style={{ padding: '10px 16px', background: '#f9fafb', color: '#6b7280', fontSize: '0.75rem', textAlign: 'center' }}>
              Riwayat pemberitahuan disimpan selama {masaSimpan} hari
            </div>
          </div>
        )}
      </div>

      {/* Pop up pemberitahuan baru */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 3000, display: 'flex', flexDirection: 'column', gap: '10px', width: '340px', maxWidth: 'calc(100vw - 40px)' }}>
        {popup.map(n => (
          <div key={n.kunci} role="alert" onClick={() => bukaNotifikasi(n)}
            style={{ background: 'white', borderRadius: '14px', boxShadow: '0 12px 30px rgba(0,0,0,0.18)', borderLeft: `5px solid ${WARNA_JENIS[n.jenis] || '#2563eb'}`, padding: '14px 16px', cursor: 'pointer', display: 'flex', gap: '10px', animation: 'notifMasuk 0.3s ease-out' }}>
            <Bell size={18} color={WARNA_JENIS[n.jenis] || '#2563eb'} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.9rem' }}>{n.judul}</div>
              <div style={{ color: '#4b5563', fontSize: '0.83rem', lineHeight: 1.45, marginTop: '2px' }}>{n.pesan}</div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setPopup(p => p.filter(x => x.kunci !== n.kunci)); }} aria-label="Tutup"
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', alignSelf: 'flex-start', padding: 0 }}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
      <style>{'@keyframes notifMasuk { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }'}</style>
    </>
  );
}
