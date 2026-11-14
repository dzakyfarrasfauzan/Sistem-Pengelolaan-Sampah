import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../config';
import { KotakAkun, Pesan } from '../../components/AkunForm';
import { gaya } from '../../components/akunGaya';

// Lupa password: (1) minta kode ke email, (2) masukkan kode dan password baru
export default function LupaPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get('email') || '');
  const [langkah, setLangkah] = useState(1);
  const [kode, setKode] = useState('');
  const [password, setPassword] = useState('');
  const [galat, setGalat] = useState('');
  const [info, setInfo] = useState('');
  const [proses, setProses] = useState(false);

  const mintaKode = async (e) => {
    e.preventDefault();
    setGalat(''); setProses(true);
    try {
      const r = await axios.post(`${API_URL}/masyarakat/lupa-password`, { email }, { withCredentials: true });
      setInfo(r.data.message); setLangkah(2);
    } catch (err) { setGalat(err.response?.data?.message || 'Gagal mengirim kode'); }
    finally { setProses(false); }
  };

  const simpan = async (e) => {
    e.preventDefault();
    setGalat('');
    if (password.length < 8) return setGalat('Password minimal 8 karakter');
    setProses(true);
    try {
      await axios.post(`${API_URL}/masyarakat/atur-ulang-password`, { email, kode, password }, { withCredentials: true });
      navigate(`/masuk?email=${encodeURIComponent(email)}`, { replace: true });
    } catch (err) { setGalat(err.response?.data?.message || 'Gagal mengganti password'); }
    finally { setProses(false); }
  };

  return (
    <KotakAkun judul="Lupa Password" keterangan={langkah === 1 ? 'Masukkan email akun Anda. Kami kirimkan kode untuk mengatur ulang password.' : 'Masukkan kode dari email dan password baru Anda.'}>
      <Pesan>{galat}</Pesan>
      {!galat && <Pesan jenis="info">{info}</Pesan>}
      {langkah === 1 ? (
        <form onSubmit={mintaKode}>
          <label style={gaya.label} htmlFor="email">Email</label>
          <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} style={gaya.input} />
          <button type="submit" disabled={proses} style={{ ...gaya.tombol, opacity: proses ? 0.7 : 1 }}>{proses ? 'Mengirim...' : 'Kirim Kode'}</button>
        </form>
      ) : (
        <form onSubmit={simpan}>
          <label style={gaya.label} htmlFor="kode">Kode dari email</label>
          <input id="kode" inputMode="numeric" maxLength={6} required pattern="[0-9]{6}" value={kode}
            onChange={e => setKode(e.target.value.replace(/\D/g, ''))}
            style={{ ...gaya.input, fontSize: '1.2rem', letterSpacing: '6px', textAlign: 'center' }} />
          <label style={gaya.label} htmlFor="baru">Password baru <span style={{ color: '#8a939d', fontWeight: 400 }}>(minimal 8 karakter)</span></label>
          <input id="baru" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} style={gaya.input} />
          <button type="submit" disabled={proses} style={{ ...gaya.tombol, opacity: proses ? 0.7 : 1 }}>{proses ? 'Menyimpan...' : 'Simpan Password Baru'}</button>
          <button type="button" onClick={() => { setLangkah(1); setInfo(''); }} style={{ marginTop: '10px', width: '100%', padding: '9px', background: 'white', border: '1px solid #b9c2cb', borderRadius: '4px', cursor: 'pointer' }}>Kirim ulang kode</button>
        </form>
      )}
      <p style={{ marginTop: '16px', fontSize: '0.88rem', textAlign: 'center' }}><Link to="/masuk" style={gaya.tautan}>Kembali ke halaman Masuk</Link></p>
    </KotakAkun>
  );
}
