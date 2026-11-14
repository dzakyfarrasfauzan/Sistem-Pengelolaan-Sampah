// Lambang aplikasi: daun di dalam lingkaran (bukan logo resmi instansi)
export default function Lambang({ ukuran = 36, latar = '#1f6b47', warna = '#ffffff' }) {
  return (
    <svg width={ukuran} height={ukuran} viewBox="0 0 40 40" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect width="40" height="40" rx="9" fill={latar} />
      <path d="M11 27c0-9 6.5-15 18-15-0.5 11.5-6.5 17.5-15 17.5" fill="none" stroke={warna} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 29.5c3.5-5.5 7.5-9 12-11" fill="none" stroke={warna} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
