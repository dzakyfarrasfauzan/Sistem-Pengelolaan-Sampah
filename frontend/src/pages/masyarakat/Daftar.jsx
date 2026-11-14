import { useCallback, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../config';
import { KotakAkun, Pesan, TombolGoogle } from '../../components/AkunForm';
import { gaya } from '../../components/akunGaya';

// Pendaftaran akun masyarakat. Setelah daftar, kode OTP dikirim ke email untuk verifikasi.
export default function Daftar() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const lanjut = params.get('lanjut') || '/laporan-saya';
  const [f, setF] = useState({ nama: '', email: '', no_wa: '', password: '', ulangi: '' });
  const [galat, setGalat] = useState('');
  const [proses, setProses] = useState(false);
  const ubah = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const kirim = async (e) => {
    e.preventDefault();
    setGalat('');
    if (f.password.length < 8) return setGalat('Password minimal 8 karakter');
    if (f.password !== f.ulangi) return setGalat('Ulangi password tidak sama');
    setProses(true);
    try {
      const r = await axios.post(`${API_URL}/masyarakat/daftar`, f, { withCredentials: true });
      navigate(`/verifikasi?email=${encodeURIComponent(r.data.email)}&lanjut=${encodeURIComponent(lanjut)}`, { state: { pesan: r.data.message } });
    } catch (err) {
      setGalat(err.response?.data?.message || 'Gagal mendaftar. Coba lagi.');
    } finally { setProses(false); }
  };

  const googleBerhasil = useCallback((data) => {
    navigate(data.perluNoWa ? '/laporan-saya?lengkapi=1' : lanjut, { replace: true });
  }, [navigate, lanjut]);

  return (
    <KotakAkun judul="Daftar Akun" keterangan="Akun dipakai untuk membuat laporan dan menerima kabar penanganannya lewat email.">
      <Pesan>{galat}</Pesan>
      <form onSubmit={kirim}>
        <label style={gaya.label} htmlFor="nama">Nama lengkap</label>
        <input id="nama" required autoComplete="name" value={f.nama} onChange={ubah('nama')} style={gaya.input} />

        <label style={gaya.label} htmlFor="email">Email</label>
        <input id="email" type="email" required autoComplete="email" value={f.email} onChange={ubah('email')} style={gaya.input} />

        <label style={gaya.label} htmlFor="no_wa">Nomor WhatsApp</label>
        <input id="no_wa" type="tel" required placeholder="08xxxxxxxxxx" autoComplete="tel" value={f.no_wa} onChange={ubah('no_wa')} style={gaya.input} />

        <label style={gaya.label} htmlFor="password">Password <span style={{ color: '#8a939d', fontWeight: 400 }}>(minimal 8 karakter)</span></label>
        <input id="password" type="password" required minLength={8} autoComplete="new-password" value={f.password} onChange={ubah('password')} style={gaya.input} />

        <label style={gaya.label} htmlFor="ulangi">Ulangi password</label>
        <input id="ulangi" type="password" required autoComplete="new-password" value={f.ulangi} onChange={ubah('ulangi')} style={gaya.input} />

        <button type="submit" disabled={proses} style={{ ...gaya.tombol, marginTop: '4px', opacity: proses ? 0.7 : 1 }}>{proses ? 'Memproses...' : 'Daftar'}</button>
      </form>

      <TombolGoogle teks="signup_with" onBerhasil={googleBerhasil} onGagal={setGalat} />

      <p style={{ marginTop: '18px', fontSize: '0.88rem', color: '#5b6673', textAlign: 'center' }}>
        Sudah punya akun? <Link to={`/masuk?lanjut=${encodeURIComponent(lanjut)}`} style={gaya.tautan}>Masuk</Link>
      </p>
    </KotakAkun>
  );
}
