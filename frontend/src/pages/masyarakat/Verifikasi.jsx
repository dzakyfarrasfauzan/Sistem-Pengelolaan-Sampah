import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../config';
import { KotakAkun, Pesan } from '../../components/AkunForm';
import { gaya } from '../../components/akunGaya';

// Verifikasi email dengan kode OTP 6 angka
export default function Verifikasi() {
  const navigate = useNavigate();
  const lokasi = useLocation();
  const [params] = useSearchParams();
  const email = params.get('email') || '';
  const lanjut = params.get('lanjut') || '/laporan-saya';
  const [kode, setKode] = useState('');
  const [galat, setGalat] = useState('');
  const [info, setInfo] = useState(lokasi.state?.pesan || `Kode verifikasi dikirim ke ${email}.`);
  const [proses, setProses] = useState(false);
  const [jeda, setJeda] = useState(60);

  useEffect(() => {
    if (jeda <= 0) return;
    const t = setTimeout(() => setJeda(j => j - 1), 1000);
    return () => clearTimeout(t);
  }, [jeda]);

  const kirim = async (e) => {
    e.preventDefault();
    setGalat(''); setProses(true);
    try {
      await axios.post(`${API_URL}/masyarakat/verifikasi`, { email, kode }, { withCredentials: true });
      navigate(lanjut, { replace: true });
    } catch (err) {
      setGalat(err.response?.data?.message || 'Gagal memverifikasi kode');
    } finally { setProses(false); }
  };

  const kirimUlang = async () => {
    setGalat('');
    try {
      const r = await axios.post(`${API_URL}/masyarakat/kirim-ulang-kode`, { email, tujuan: 'verifikasi' }, { withCredentials: true });
      setInfo(r.data.message); setJeda(60);
    } catch (err) { setGalat(err.response?.data?.message || 'Gagal mengirim ulang kode'); }
  };

  return (
    <KotakAkun judul="Verifikasi Email" keterangan="Masukkan 6 angka kode yang dikirim ke email Anda. Periksa juga folder Spam.">
      <Pesan>{galat}</Pesan>
      {!galat && <Pesan jenis="info">{info}</Pesan>}
      <form onSubmit={kirim}>
        <label style={gaya.label} htmlFor="kode">Kode verifikasi</label>
        <input id="kode" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required pattern="[0-9]{6}" value={kode}
          onChange={e => setKode(e.target.value.replace(/\D/g, ''))}
          style={{ ...gaya.input, fontSize: '1.3rem', letterSpacing: '8px', textAlign: 'center' }} />
        <button type="submit" disabled={proses || kode.length !== 6} style={{ ...gaya.tombol, opacity: proses || kode.length !== 6 ? 0.6 : 1 }}>
          {proses ? 'Memeriksa...' : 'Verifikasi'}
        </button>
      </form>
      <p style={{ marginTop: '16px', fontSize: '0.86rem', color: '#5b6673', textAlign: 'center' }}>
        Tidak menerima kode?{' '}
        {jeda > 0
          ? <span>Kirim ulang dalam {jeda} detik</span>
          : <button type="button" onClick={kirimUlang} style={{ ...gaya.tautan, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Kirim ulang kode</button>}
      </p>
    </KotakAkun>
  );
}
