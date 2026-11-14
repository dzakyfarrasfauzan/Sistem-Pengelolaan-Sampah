import { useCallback, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';
import { API_URL } from '../../config';
import { KotakAkun, Pesan, TombolGoogle } from '../../components/AkunForm';
import { gaya } from '../../components/akunGaya';

// Masuk akun masyarakat: email + password atau akun Google
export default function Masuk() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const lanjut = params.get('lanjut') || '/laporan-saya';
  const [email, setEmail] = useState(params.get('email') || '');
  const [password, setPassword] = useState('');
  const [lihat, setLihat] = useState(false);
  const [galat, setGalat] = useState('');
  const [proses, setProses] = useState(false);

  const kirim = async (e) => {
    e.preventDefault();
    setGalat(''); setProses(true);
    try {
      await axios.post(`${API_URL}/masyarakat/masuk`, { email, password }, { withCredentials: true });
      navigate(lanjut, { replace: true });
    } catch (err) {
      setGalat(err.response?.data?.message || 'Gagal masuk. Coba lagi.');
    } finally { setProses(false); }
  };

  const googleBerhasil = useCallback((data) => {
    navigate(data.perluNoWa ? '/laporan-saya?lengkapi=1' : lanjut, { replace: true });
  }, [navigate, lanjut]);

  return (
    <KotakAkun judul="Masuk" keterangan="Masuk untuk membuat laporan dan memantau status laporan Anda.">
      <Pesan>{galat}</Pesan>
      {lanjut === '/laporan' && !galat && <Pesan jenis="info">Untuk membuat laporan, silakan masuk atau daftar terlebih dahulu.</Pesan>}
      <form onSubmit={kirim}>
        <label style={gaya.label} htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} style={gaya.input} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <label style={gaya.label} htmlFor="password">Password</label>
          <Link to={`/lupa-password${email ? `?email=${encodeURIComponent(email)}` : ''}`} style={{ ...gaya.tautan, fontSize: '0.82rem', fontWeight: 500 }}>Lupa password?</Link>
        </div>
        <div style={{ position: 'relative' }}>
          <input id="password" type={lihat ? 'text' : 'password'} autoComplete="current-password" required value={password}
            onChange={e => setPassword(e.target.value)} style={{ ...gaya.input, paddingRight: '40px' }} />
          <button type="button" onClick={() => setLihat(!lihat)} title={lihat ? 'Sembunyikan password' : 'Tampilkan password'}
            style={{ position: 'absolute', right: '8px', top: '9px', background: 'none', border: 'none', cursor: 'pointer', color: '#5b6673', display: 'flex' }}>
            {lihat ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>

        <button type="submit" disabled={proses} style={{ ...gaya.tombol, marginTop: '4px', opacity: proses ? 0.7 : 1 }}>{proses ? 'Memproses...' : 'Masuk'}</button>
      </form>

      <TombolGoogle onBerhasil={googleBerhasil} onGagal={setGalat} />

      <p style={{ marginTop: '18px', fontSize: '0.88rem', color: '#5b6673', textAlign: 'center' }}>
        Belum punya akun? <Link to={`/daftar?lanjut=${encodeURIComponent(lanjut)}`} style={gaya.tautan}>Daftar</Link>
      </p>
    </KotakAkun>
  );
}
