import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import KepalaSitus from '../components/KepalaSitus';
import { API_URL } from '../config';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_URL}/login`, {
        username,
        password
      }, { withCredentials: true });

      if (res.data.success) {
        if (res.data.user.role === 'admin') {
          navigate('/admin/dashboard');
        } else if (res.data.user.role === 'pengawas') {
          navigate('/pengawas/dashboard');
        } else {
          navigate('/sopir/dashboard');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal. Periksa kembali username dan password Anda.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '9px 11px', borderRadius: '4px',
    border: '1px solid #b9c2cb', boxSizing: 'border-box', background: 'white',
  };
  const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '0.88rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', display: 'flex', flexDirection: 'column' }}>
      <KepalaSitus />
      <main style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 16px' }}>
        <div style={{ width: '100%', maxWidth: '380px', background: 'white', border: '1px solid #d8dde3', borderRadius: '6px' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #eceff2' }}>
            <h1 style={{ fontSize: '1.15rem' }}>Masuk Petugas</h1>
            <p style={{ color: '#5b6673', fontSize: '0.85rem', marginTop: '2px' }}>Untuk admin Korwil, sopir, dan pengawas Bidang.</p>
          </div>
          <form onSubmit={handleLogin} style={{ padding: '20px 24px 24px' }}>
            {error && (
              <div role="alert" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', background: '#fdf0f0', border: '1px solid #f0c7c7', color: '#9b1c1c', padding: '9px 11px', borderRadius: '4px', fontSize: '0.86rem', marginBottom: '16px' }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} /> {error}
              </div>
            )}
            <label style={labelStyle} htmlFor="username">Username</label>
            <input id="username" name="username" type="text" autoComplete="username" required value={username}
              onChange={e => setUsername(e.target.value)} style={{ ...inputStyle, marginBottom: '14px' }} />

            <label style={labelStyle} htmlFor="password">Password</label>
            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password}
                onChange={e => setPassword(e.target.value)} style={{ ...inputStyle, paddingRight: '40px' }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#5b6673', display: 'flex' }}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', background: loading ? '#5f9478' : '#1f6b47', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: loading ? 'wait' : 'pointer' }}>
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
