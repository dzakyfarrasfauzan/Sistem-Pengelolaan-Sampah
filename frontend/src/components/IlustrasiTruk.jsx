// Ilustrasi datar: bukit, truk sampah, dan tempat sampah (gambar sendiri, tanpa aset luar)
export default function IlustrasiTruk({ lebar = '100%' }) {
  return (
    <svg viewBox="0 0 480 300" style={{ width: lebar, height: 'auto', display: 'block' }} role="img" aria-label="Ilustrasi truk pengangkut sampah">
      {/* langit & bukit */}
      <circle cx="390" cy="70" r="34" fill="#e9b949" opacity="0.9" />
      <path d="M0 210 C70 160 140 175 210 200 C280 225 340 170 480 185 V300 H0 Z" fill="#2f7a52" />
      <path d="M0 235 C90 205 170 220 250 238 C330 256 400 222 480 228 V300 H0 Z" fill="#256644" />
      {/* jalan */}
      <rect x="0" y="262" width="480" height="38" fill="#3a4550" />
      <g fill="#e9eef0">{[20, 90, 160, 230, 300, 370, 440].map(x => <rect key={x} x={x} y="279" width="36" height="4" rx="2" />)}</g>
      {/* pohon */}
      <g>
        <rect x="44" y="196" width="6" height="30" fill="#5b4a33" />
        <circle cx="47" cy="186" r="20" fill="#3f9466" />
        <rect x="430" y="186" width="6" height="34" fill="#5b4a33" />
        <circle cx="433" cy="176" r="22" fill="#3f9466" />
      </g>
      {/* truk */}
      <g>
        <rect x="120" y="170" width="170" height="78" rx="6" fill="#f4f6f5" />
        <rect x="120" y="170" width="170" height="14" rx="6" fill="#d8dfdb" />
        <rect x="136" y="196" width="138" height="8" rx="4" fill="#1f6b47" />
        <rect x="136" y="212" width="98" height="6" rx="3" fill="#c9d3ce" />
        <path d="M290 192 H330 L356 222 V248 H290 Z" fill="#e9b949" />
        <path d="M300 200 H326 L344 222 H300 Z" fill="#cfe3ea" />
        <rect x="116" y="244" width="244" height="10" rx="3" fill="#2b333b" />
        {[160, 250, 326].map(cx => (
          <g key={cx}>
            <circle cx={cx} cy="256" r="16" fill="#1f2933" />
            <circle cx={cx} cy="256" r="7" fill="#c4cad1" />
          </g>
        ))}
      </g>
      {/* tempat sampah */}
      <g>
        <rect x="386" y="214" width="30" height="40" rx="4" fill="#1f6b47" />
        <rect x="382" y="208" width="38" height="8" rx="3" fill="#17533a" />
        <rect x="422" y="220" width="26" height="34" rx="4" fill="#e9b949" />
        <rect x="419" y="215" width="32" height="7" rx="3" fill="#c99a2e" />
      </g>
    </svg>
  );
}
