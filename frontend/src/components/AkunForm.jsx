// Potongan tampilan yang dipakai bersama oleh halaman akun masyarakat
// (Masuk, Daftar, Verifikasi, Lupa Password)
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { API_URL } from '../config';
import KepalaSitus from './KepalaSitus';


/** Kerangka halaman akun: kepala situs + kotak di tengah */
export function KotakAkun({ judul, keterangan, children, lebar = 400 }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', display: 'flex', flexDirection: 'column' }}>
      <KepalaSitus />
      <main style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px' }}>
        <div style={{ width: '100%', maxWidth: `${lebar}px`, background: 'white', border: '1px solid #d8dde3', borderRadius: '6px' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #eceff2' }}>
            <h1 style={{ fontSize: '1.15rem' }}>{judul}</h1>
            {keterangan && <p style={{ color: '#5b6673', fontSize: '0.86rem', marginTop: '2px' }}>{keterangan}</p>}
          </div>
          <div style={{ padding: '20px 24px 24px' }}>{children}</div>
        </div>
      </main>
    </div>
  );
}

/** Pesan galat / berhasil */
export function Pesan({ jenis = 'galat', children }) {
  if (!children) return null;
  const g = jenis === 'galat'
    ? { background: '#fdf0f0', border: '1px solid #f0c7c7', color: '#9b1c1c', Icon: AlertCircle }
    : { background: '#eef6f1', border: '1px solid #b9d8c6', color: '#17533a', Icon: CheckCircle2 };
  return (
    <div role="alert" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', background: g.background, border: g.border, color: g.color, padding: '9px 11px', borderRadius: '4px', fontSize: '0.86rem', marginBottom: '16px' }}>
      <g.Icon size={16} style={{ flexShrink: 0, marginTop: '2px' }} /> <span>{children}</span>
    </div>
  );
}

/**
 * Tombol "Masuk dengan Google" (Google Identity Services).
 * Client ID diambil dari backend (.env GOOGLE_CLIENT_ID); bila belum diatur, tombol tidak tampil.
 */
export function TombolGoogle({ teks = 'signin_with', onBerhasil, onGagal }) {
  const wadah = useRef(null);
  const [clientId, setClientId] = useState(undefined);

  useEffect(() => {
    const muat = async () => {
      try {
        const r = await axios.get(`${API_URL}/masyarakat/konfigurasi`, { withCredentials: true });
        setClientId(r.data.googleClientId || null);
      } catch { setClientId(null); }
    };
    muat();
  }, []);

  useEffect(() => {
    if (!clientId || !wadah.current) return;
    const pasang = () => {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          try {
            const r = await axios.post(`${API_URL}/masyarakat/google`, { credential }, { withCredentials: true });
            onBerhasil?.(r.data);
          } catch (err) { onGagal?.(err.response?.data?.message || 'Gagal masuk dengan Google'); }
        },
      });
      window.google.accounts.id.renderButton(wadah.current, { theme: 'outline', size: 'large', text: teks, width: 340, locale: 'id' });
    };
    if (window.google?.accounts?.id) { pasang(); return; }
    let skrip = document.getElementById('gsi-client');
    if (!skrip) {
      skrip = document.createElement('script');
      skrip.id = 'gsi-client';
      skrip.src = 'https://accounts.google.com/gsi/client';
      skrip.async = true;
      document.head.appendChild(skrip);
    }
    skrip.addEventListener('load', pasang);
    return () => skrip.removeEventListener('load', pasang);
  }, [clientId, teks, onBerhasil, onGagal]);

  if (!clientId) return null;
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '18px 0 14px', color: '#8a939d', fontSize: '0.8rem' }}>
        <span style={{ flex: 1, height: '1px', background: '#e4e7eb' }} /> atau <span style={{ flex: 1, height: '1px', background: '#e4e7eb' }} />
      </div>
      <div ref={wadah} style={{ display: 'flex', justifyContent: 'center', minHeight: '44px' }} />
    </>
  );
}
