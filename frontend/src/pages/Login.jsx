import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Leaf, LogIn, Eye, EyeOff, ArrowLeft, AlertCircle } from 'lucide-react';
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
    width: '100%', padding: '14px 16px', borderRadius: '12px',
    border: '1.5px solid #e5e7eb', outline: 'none', boxSizing: 'border-box',
    fontSize: '0.95rem', fontFamily: "'Plus Jakarta Sans', sans-serif",
    background: '#f9fafb',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* Left Panel — Decorative */}
      <div style={{
        flex: '1 1 50%', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        background: 'linear-gradient(160deg, #064e3b 0%, #047857 40%, #059669 100%)',
        padding: '60px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative orbs */}
        <div style={{
          position: 'absolute', top: '10%', left: '5%', width: '300px', height: '300px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', right: '5%', width: '200px', height: '200px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />

        <div style={{
          position: 'relative', textAlign: 'center', maxWidth: '400px',
          animation: 'fadeInUp 0.6s ease-out',
        }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '20px',
            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 28px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <Leaf size={36} color="white" />
          </div>
          <h2 style={{ color: 'white', fontSize: '2rem', fontWeight: '800', marginBottom: '16px', letterSpacing: '-0.5px' }}>
            Sistem Pengelolaan Sampah
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', lineHeight: '1.7' }}>
            Dinas Lingkungan Hidup Kabupaten Sukabumi — Portal Admin & Petugas Lapangan
          </p>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div style={{
        flex: '1 1 50%', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        padding: '60px 40px', background: 'white',
      }}>
        <div style={{
          width: '100%', maxWidth: '400px',
          animation: 'fadeInUp 0.6s ease-out 0.15s both',
        }}>
          <button onClick={() => navigate('/')} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none', color: '#6b7280',
            fontSize: '0.9rem', cursor: 'pointer', padding: '0',
            marginBottom: '40px', fontWeight: '500', fontFamily: 'inherit',
            transition: 'color 0.2s',
          }}
            onMouseOver={e => e.currentTarget.style.color = '#111827'}
            onMouseOut={e => e.currentTarget.style.color = '#6b7280'}
          >
            <ArrowLeft size={18} /> Kembali ke Beranda
          </button>

          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#111827', marginBottom: '8px' }}>
            Selamat Datang 👋
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '36px', fontSize: '0.95rem' }}>
            Masuk ke akun Anda untuk mengelola sistem.
          </p>

          {error && (
            <div style={{
              background: '#fef2f2', color: '#dc2626',
              padding: '14px 16px', borderRadius: '12px',
              marginBottom: '24px', fontSize: '0.9rem',
              display: 'flex', alignItems: 'center', gap: '10px',
              border: '1px solid #fecaca',
              animation: 'fadeIn 0.3s ease-out',
            }}>
              <AlertCircle size={18} /> {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#374151', fontWeight: '600', fontSize: '0.9rem' }}>
                Username
              </label>
              <input
                type="text"
                placeholder="Masukkan username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = '#059669'; e.target.style.background = 'white'; e.target.style.boxShadow = '0 0 0 4px rgba(5, 150, 105, 0.08)'; }}
                onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#f9fafb'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#374151', fontWeight: '600', fontSize: '0.9rem' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ ...inputStyle, paddingRight: '48px' }}
                  onFocus={e => { e.target.style.borderColor = '#059669'; e.target.style.background = 'white'; e.target.style.boxShadow = '0 0 0 4px rgba(5, 150, 105, 0.08)'; }}
                  onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#f9fafb'; e.target.style.boxShadow = 'none'; }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af',
                  padding: '4px', display: 'flex',
                }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '16px',
              background: loading ? '#9ca3af' : 'linear-gradient(135deg, #059669, #047857)',
              color: 'white', border: 'none', borderRadius: '12px',
              fontSize: '1rem', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              boxShadow: loading ? 'none' : '0 4px 12px rgba(5, 150, 105, 0.25)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              marginTop: '8px',
            }}
              onMouseOver={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(5, 150, 105, 0.35)'; }}}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(5, 150, 105, 0.25)'; }}
            >
              {loading ? (
                <div style={{ width: '20px', height: '20px', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
              ) : (
                <><LogIn size={18} /> Masuk</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
