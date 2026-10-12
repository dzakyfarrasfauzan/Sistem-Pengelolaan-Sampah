import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, MapPin, Truck, ArrowRight, Leaf, ChevronDown, Phone, Mail, Building2 } from 'lucide-react';

const steps = [
  {
    icon: <Camera size={32} />,
    title: 'Foto & Laporkan',
    desc: 'Buka kamera langsung dari browser, potret lokasi sampah liar. GPS otomatis terdeteksi.',
    color: '#6366f1',
    bg: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
  },
  {
    icon: <MapPin size={32} />,
    title: 'Lokasi Otomatis',
    desc: 'Sistem mendeteksi koordinat & alamat lokasi Anda secara otomatis saat foto diambil.',
    color: '#059669',
    bg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
  },
  {
    icon: <Truck size={32} />,
    title: 'Tindak Lanjut',
    desc: 'Petugas DLH terdekat segera dijadwalkan untuk membersihkan lokasi yang dilaporkan.',
    color: '#f59e0b',
    bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1f2937', overflowX: 'hidden' }}>

      {/* ===== NAVBAR ===== */}
      <header style={{
        padding: '0 40px',
        height: '72px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: scrolled ? 'rgba(255,255,255,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
        position: 'fixed',
        top: 0,
        width: '100%',
        boxSizing: 'border-box',
        zIndex: 100,
        borderBottom: scrolled ? '1px solid rgba(229,231,235,0.6)' : '1px solid transparent',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'linear-gradient(135deg, #059669, #10b981)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)',
          }}>
            <Leaf size={20} color="white" />
          </div>
          <span style={{ fontWeight: '800', fontSize: '1.15rem', color: '#064e3b', letterSpacing: '-0.3px' }}>
            DLH Sukabumi
          </span>
        </div>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link to="/login" style={{
            padding: '8px 18px', borderRadius: '10px',
            background: '#064e3b', color: 'white', fontWeight: '600', fontSize: '0.9rem',
            transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(6, 78, 59, 0.2)',
          }}
            onMouseOver={e => { e.currentTarget.style.background = '#047857'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseOut={e => { e.currentTarget.style.background = '#064e3b'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >Login Admin / Petugas</Link>
        </nav>
      </header>

      <main>
        {/* ===== HERO SECTION ===== */}
        <section style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '120px 24px 80px',
          position: 'relative',
          background: 'linear-gradient(160deg, #f0fdf4 0%, #ecfdf5 25%, #e0e7ff 50%, #eef2ff 75%, #f0fdf4 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradient-shift 15s ease infinite',
        }}>
          {/* Decorative orbs */}
          <div style={{
            position: 'absolute', top: '15%', left: '10%', width: '300px', height: '300px',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)',
            borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none',
            animation: 'float 6s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute', bottom: '20%', right: '10%', width: '250px', height: '250px',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
            borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none',
            animation: 'float 8s ease-in-out infinite 2s',
          }} />

          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '8px 20px', borderRadius: '100px',
            background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            fontSize: '0.85rem', fontWeight: '600', color: '#059669',
            marginBottom: '28px',
            animation: 'fadeInUp 0.6s ease-out',
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', animation: 'pulse-glow 2s infinite' }} />
            Platform Digital Partisipatif
          </div>

          {/* Heading */}
          <h1 style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: '800',
            color: '#064e3b',
            margin: '0 auto 20px',
            maxWidth: '800px',
            lineHeight: '1.1',
            letterSpacing: '-1.5px',
            animation: 'fadeInUp 0.6s ease-out 0.15s both',
          }}>
            Wujudkan <span style={{
              background: 'linear-gradient(135deg, #059669, #6366f1)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Sukabumi Bersih</span> Bersama
          </h1>

          <p style={{
            fontSize: 'clamp(1rem, 1.5vw, 1.25rem)',
            color: '#4b5563',
            maxWidth: '560px',
            margin: '0 auto 44px',
            lineHeight: '1.7',
            animation: 'fadeInUp 0.6s ease-out 0.3s both',
          }}>
            Laporkan tumpukan sampah liar di sekitar Anda. Cukup foto, lokasi otomatis terdeteksi, petugas segera bertindak.
          </p>

          {/* CTA Buttons */}
          <div style={{
            display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center',
            animation: 'fadeInUp 0.6s ease-out 0.45s both',
          }}>
            <button onClick={() => navigate('/laporan')} style={{
              padding: '16px 36px', fontSize: '1.05rem',
              background: 'linear-gradient(135deg, #059669, #047857)',
              color: 'white', border: 'none', borderRadius: '14px',
              cursor: 'pointer', fontWeight: '700', fontFamily: 'inherit',
              boxShadow: '0 8px 24px rgba(5, 150, 105, 0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(5, 150, 105, 0.4), inset 0 1px 0 rgba(255,255,255,0.15)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(5, 150, 105, 0.3), inset 0 1px 0 rgba(255,255,255,0.15)'; }}
            >
              <Camera size={20} /> Laporkan Sekarang <ArrowRight size={18} />
            </button>
          </div>

          {/* Scroll indicator */}
          <div style={{
            position: 'absolute', bottom: '32px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
            color: '#9ca3af', fontSize: '0.8rem', fontWeight: '500',
            animation: 'fadeIn 1s ease-out 1s both',
          }}>
            <span>Scroll untuk lihat selengkapnya</span>
            <ChevronDown size={18} style={{ animation: 'float 2s ease-in-out infinite' }} />
          </div>
        </section>



        {/* ===== HOW IT WORKS ===== */}
        <section style={{
          padding: '100px 24px',
          maxWidth: '1100px', margin: '0 auto',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{
              display: 'inline-block', padding: '6px 16px', borderRadius: '100px',
              background: '#ecfdf5', color: '#059669', fontSize: '0.8rem',
              fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px',
              marginBottom: '16px',
            }}>Cara Kerja</div>
            <h2 style={{
              fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
              fontWeight: '800', color: '#064e3b',
              margin: '0 0 16px', letterSpacing: '-0.5px',
            }}>Tiga Langkah Mudah</h2>
            <p style={{ fontSize: '1.1rem', color: '#6b7280', maxWidth: '500px', margin: '0 auto' }}>
              Proses pelaporan yang cepat, mudah, dan transparan untuk semua warga.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '28px' }}>
            {steps.map((step, i) => (
              <div key={i} style={{
                padding: '40px 32px',
                background: 'white',
                borderRadius: '24px',
                border: '1px solid #f3f4f6',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'default',
                position: 'relative',
                overflow: 'hidden',
                animation: `fadeInUp 0.6s ease-out ${0.15 * i}s both`,
              }}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.boxShadow = '0 20px 40px -12px rgba(0,0,0,0.1)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.04)'; }}
              >
                {/* Step number watermark */}
                <div style={{
                  position: 'absolute', top: '-10px', right: '-5px',
                  fontSize: '8rem', fontWeight: '900', color: 'rgba(0,0,0,0.02)',
                  lineHeight: 1, pointerEvents: 'none',
                }}>
                  {i + 1}
                </div>

                <div style={{
                  width: '64px', height: '64px', borderRadius: '18px',
                  background: step.bg, color: step.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '24px',
                }}>
                  {step.icon}
                </div>

                <div style={{
                  fontSize: '0.75rem', fontWeight: '700', color: step.color,
                  textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '10px',
                }}>Langkah {i + 1}</div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '12px', color: '#111827' }}>{step.title}</h3>
                <p style={{ color: '#6b7280', lineHeight: '1.7', fontSize: '0.95rem' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== CTA SECTION ===== */}
        <section style={{ padding: '0 24px 100px' }}>
          <div style={{
            maxWidth: '1100px', margin: '0 auto',
            background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%)',
            borderRadius: '32px',
            padding: '80px 48px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Decorative pattern */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.05) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255,255,255,0.05) 0%, transparent 50%)',
              pointerEvents: 'none',
            }} />

            <h2 style={{
              fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
              fontWeight: '800', color: 'white',
              margin: '0 0 16px', letterSpacing: '-0.5px',
              position: 'relative',
            }}>
              Temukan Sampah Liar?<br />Laporkan Sekarang!
            </h2>
            <p style={{
              fontSize: '1.1rem', color: 'rgba(255,255,255,0.8)',
              maxWidth: '500px', margin: '0 auto 40px',
              position: 'relative',
            }}>
              Satu laporan Anda bisa membuat lingkungan sekitar menjadi lebih bersih dan sehat.
            </p>
            <button onClick={() => navigate('/laporan')} style={{
              padding: '18px 48px', fontSize: '1.1rem',
              background: 'white', color: '#064e3b',
              border: 'none', borderRadius: '14px',
              cursor: 'pointer', fontWeight: '800', fontFamily: 'inherit',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'inline-flex', alignItems: 'center', gap: '10px',
              position: 'relative',
            }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.2)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'; }}
            >
              <Camera size={20} /> Buat Laporan <ArrowRight size={18} />
            </button>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer style={{
          background: '#fafafa',
          borderTop: '1px solid #e5e7eb',
          padding: '48px 24px 32px',
        }}>
          <div style={{
            maxWidth: '1100px', margin: '0 auto',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            flexWrap: 'wrap', gap: '32px',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{
                  width: '32px', height: '32px',
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Leaf size={16} color="white" />
                </div>
                <span style={{ fontWeight: '700', fontSize: '1rem', color: '#064e3b' }}>DLH Kabupaten Sukabumi</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#9ca3af', maxWidth: '300px', lineHeight: '1.6' }}>
                Dinas Lingkungan Hidup Kabupaten Sukabumi — Bersama wujudkan lingkungan bersih dan sehat.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Kontak</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#6b7280' }}>
                    <Phone size={14} /> (0266) 225 078
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#6b7280' }}>
                    <Mail size={14} /> dlh@sukabumikab.go.id
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#6b7280' }}>
                    <Building2 size={14} /> Jl. Bhayangkara No. 1, Palabuhanratu
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div style={{
            maxWidth: '1100px', margin: '32px auto 0',
            borderTop: '1px solid #e5e7eb', paddingTop: '20px',
            textAlign: 'center', fontSize: '0.8rem', color: '#9ca3af',
          }}>
            © 2024 Dinas Lingkungan Hidup Kabupaten Sukabumi. Hak Cipta Dilindungi.
          </div>
        </footer>
      </main>
    </div>
  );
}
