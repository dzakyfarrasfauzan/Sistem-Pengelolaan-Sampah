import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../config';
import { KotakAkun, Pesan } from '../../components/AkunForm';
import { gaya } from '../../components/akunGaya';

const JEDA = 60; // detik sebelum boleh kirim ulang kode

// Verifikasi email setelah daftar: masukkan 6 digit kode yang dikirim ke email
export default function Verifikasi() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get('email') || '';
  const lanjut = params.get('lanjut') || '/laporan-saya';
  const [kode, setKode] = useState('');
  const [galat, setGalat] = useState('');
  const [info, setInfo] = useState(params.get('pesan') || `Kode verifikasi sudah dikirim ke ${email}.`);
  const [proses, setProses] = useState(false);
  const [sisa, setSisa] = useState(JEDA);

  useEffect(() => {
    if (sisa <= 0) return undefined;
    const t = setTimeout(() => setSisa(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [sisa]);

  const verifikasi = async (e) => {
    e.preventDefault();
    setGalat(''); setProses(true);
    try {
      const r = await axios.post(`${API_URL}/masyarakat/verifikasi-email`, { email, kode }, { withCredentials: true });
      navigate(r.data.akun?.no_wa ? lanjut : '/laporan-saya?lengkapi=1', { replace: true });
    } catch (err) { setGalat(err.response?.data?.message || 'Gagal memverifikasi kode'); }
    finally { setProses(false); }
  };

  const kirimUlang = async () => {
    setGalat('');
    try {
      const r = await axios.post(`${API_URL}/masyarakat/kirim-ulang-kode`, { email, tujuan: 'verifikasi' }, { withCredentials: true });
      setInfo(r.data.message); setSisa(JEDA);
    } catch (err) { setGalat(err.response?.data?.message || 'Gagal mengirim ulang kode'); }
  };

  if (!email) {
    return (
      <KotakAkun judul="Verifikasi Email">
        <Pesan>Alamat email tidak ditemukan. Silakan daftar atau masuk kembali.</Pesan>
        <Link to="/daftar" style={gaya.tautan}>Kembali ke Daftar</Link>
      </KotakAkun>
    );
  }

  return (
    <KotakAkun judul="Verifikasi Email" keterangan="Masukkan 6 digit kode dari email untuk mengaktifkan akun Anda. Periksa juga folder Spam bila email belum masuk.">
      <Pesan>{galat}</Pesan>
      {!galat && <Pesan jenis="info">{info}</Pesan>}
      <form onSubmit={verifikasi}>
        <label style={gaya.label} htmlFor="kode">Kode verifikasi</label>
        <input id="kode" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required pattern="[0-9]{6}" autoFocus value={kode}
          onChange={e => setKode(e.target.value.replace(/\D/g, ''))}
          style={{ ...gaya.input, fontSize: '1.4rem', letterSpacing: '10px', textAlign: 'center', fontWeight: 700 }} />
        <button type="submit" disabled={proses || kode.length !== 6} style={{ ...gaya.tombol, opacity: proses || kode.length !== 6 ? 0.6 : 1 }}>
          {proses ? 'Memeriksa...' : 'Verifikasi'}
        </button>
      </form>
      <button type="button" onClick={kirimUlang} disabled={sisa > 0}
        style={{ marginTop: '10px', width: '100%', padding: '9px', background: 'white', border: '1px solid #b9c2cb', borderRadius: '8px', cursor: sisa > 0 ? 'default' : 'pointer', color: sisa > 0 ? '#8a939d' : '#1f2933' }}>
        {sisa > 0 ? `Kirim ulang kode (${sisa} detik)` : 'Kirim ulang kode'}
      </button>
      <p style={{ marginTop: '16px', fontSize: '0.88rem', textAlign: 'center', color: '#5b6673' }}>
        Salah email? <Link to="/daftar" style={gaya.tautan}>Daftar ulang</Link>
      </p>
    </KotakAkun>
  );
}
