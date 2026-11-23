import { useState } from 'react';
import axios from 'axios';
import { Mail, Phone } from 'lucide-react';
import { API_URL } from '../config';
import { Pesan } from './AkunForm';
import { gaya } from './akunGaya';

/**
 * Ganti email atau nomor WhatsApp akun masyarakat dengan kode OTP.
 * - jenis 'email': kode dikirim ke email BARU
 * - jenis 'wa'   : kode dikirim ke email akun saat ini
 * Props: jenis, akun, onSelesai(akunBaru, pesan), onBatal()
 */
export default function GantiKontak({ jenis, akun, onSelesai, onBatal }) {
  const email = jenis === 'email';
  const [nilai, setNilai] = useState('');
  const [kode, setKode] = useState('');
  const [langkah, setLangkah] = useState(1);
  const [galat, setGalat] = useState('');
  const [info, setInfo] = useState('');
  const [proses, setProses] = useState(false);
  const alamat = email ? 'ganti-email' : 'ganti-wa';

  const minta = async (e) => {
    e?.preventDefault();
    setGalat(''); setProses(true);
    try {
      const r = await axios.post(`${API_URL}/masyarakat/${alamat}`, email ? { email_baru: nilai } : { no_wa: nilai }, { withCredentials: true });
      if (r.data.langsung) { onSelesai(r.data.akun, r.data.message); return; }
      setInfo(r.data.message); setLangkah(2);
    } catch (err) { setGalat(err.response?.data?.message || 'Gagal mengirim kode'); }
    finally { setProses(false); }
  };

  const konfirmasi = async (e) => {
    e.preventDefault();
    setGalat(''); setProses(true);
    try {
      const r = await axios.post(`${API_URL}/masyarakat/${alamat}/konfirmasi`, { kode }, { withCredentials: true });
      onSelesai(r.data.akun, r.data.message);
    } catch (err) { setGalat(err.response?.data?.message || 'Kode tidak dapat diperiksa'); }
    finally { setProses(false); }
  };

  const tombolKedua = { padding: '8px 16px', background: 'white', border: '1px solid #b9c2cb', borderRadius: '8px', cursor: 'pointer' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, marginBottom: '4px' }}>
        {email ? <Mail size={17} color="#1f6b47" /> : <Phone size={17} color="#1f6b47" />}
        {email ? 'Ganti email' : 'Ganti nomor WhatsApp'}
      </div>
      <p style={{ fontSize: '0.84rem', color: '#5b6673', marginBottom: '12px' }}>
        {email
          ? `Email sekarang: ${akun.email}. Kode konfirmasi akan dikirim ke email baru.`
          : `Nomor sekarang: ${akun.no_wa || '-'}. Kode konfirmasi akan dikirim ke email ${akun.email}.`}
      </p>
      <Pesan>{galat}</Pesan>
      {!galat && info && <Pesan jenis="info">{info}</Pesan>}

      {langkah === 1 ? (
        <form onSubmit={minta}>
          <label style={gaya.label} htmlFor="nilai-baru">{email ? 'Email baru' : 'Nomor WhatsApp baru'}</label>
          <input id="nilai-baru" required autoFocus type={email ? 'email' : 'tel'} placeholder={email ? 'nama@contoh.com' : '08xxxxxxxxxx'}
            value={nilai} onChange={e => setNilai(e.target.value)} style={{ ...gaya.input, maxWidth: '360px' }} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" disabled={proses} style={{ ...gaya.tombol, width: 'auto', padding: '8px 16px', opacity: proses ? 0.7 : 1 }}>{proses ? 'Mengirim...' : 'Kirim Kode'}</button>
            <button type="button" onClick={onBatal} style={tombolKedua}>Batal</button>
          </div>
        </form>
      ) : (
        <form onSubmit={konfirmasi}>
          <label style={gaya.label} htmlFor="kode-ganti">Kode dari email</label>
          <input id="kode-ganti" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required pattern="[0-9]{6}" autoFocus value={kode}
            onChange={e => setKode(e.target.value.replace(/\D/g, ''))}
            style={{ ...gaya.input, maxWidth: '220px', fontSize: '1.2rem', letterSpacing: '8px', textAlign: 'center', fontWeight: 700 }} />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="submit" disabled={proses || kode.length !== 6} style={{ ...gaya.tombol, width: 'auto', padding: '8px 16px', opacity: proses || kode.length !== 6 ? 0.6 : 1 }}>{proses ? 'Memeriksa...' : 'Konfirmasi'}</button>
            <button type="button" onClick={() => minta()} disabled={proses} style={tombolKedua}>Kirim ulang kode</button>
            <button type="button" onClick={onBatal} style={tombolKedua}>Batal</button>
          </div>
        </form>
      )}
    </div>
  );
}
