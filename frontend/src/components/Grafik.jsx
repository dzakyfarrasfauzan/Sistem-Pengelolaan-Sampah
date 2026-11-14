import { useState } from 'react';

/**
 * Grafik batang berkelompok: tiap kategori (bulan) punya beberapa batang (seri).
 * data: [{ label, nilai: { kunci: angka } }], seri: [{ kunci, nama, warna }]
 */
export function GrafikBatang({ data, seri, tinggi = 220 }) {
  const [sorot, setSorot] = useState(null);
  const lebar = 560, kiri = 32, bawah = 26, atas = 12;
  const maks = Math.max(1, ...data.flatMap(d => seri.map(s => d.nilai[s.kunci] || 0)));
  const langkah = maks <= 5 ? 1 : Math.ceil(maks / 4);
  const puncak = Math.ceil(maks / langkah) * langkah;
  const garis = [];
  for (let v = 0; v <= puncak; v += langkah) garis.push(v);
  const tinggiPlot = tinggi - bawah - atas;
  const y = (v) => atas + tinggiPlot - (v / puncak) * tinggiPlot;
  const lebarKelompok = (lebar - kiri) / data.length;
  const lebarBatang = Math.min(22, (lebarKelompok - 16) / seri.length - 2);

  return (
    <div style={{ position: 'relative' }}>
      {/* Legenda */}
      <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: '#3a4550', marginBottom: '6px' }}>
        {seri.map(s => (
          <span key={s.kunci} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: s.warna }} /> {s.nama}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${lebar} ${tinggi}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img"
        aria-label={`Grafik ${seri.map(s => s.nama).join(' dan ')} per bulan`} onMouseLeave={() => setSorot(null)}>
        {garis.map(v => (
          <g key={v}>
            <line x1={kiri} x2={lebar} y1={y(v)} y2={y(v)} stroke={v === 0 ? '#b9c2cb' : '#eceff2'} strokeWidth="1" />
            <text x={kiri - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#8a939d">{v}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x0 = kiri + i * lebarKelompok + (lebarKelompok - seri.length * (lebarBatang + 2)) / 2;
          return (
            <g key={d.label} onMouseEnter={() => setSorot(i)}>
              {/* area sentuh lebih besar dari batang */}
              <rect x={kiri + i * lebarKelompok} y={atas} width={lebarKelompok} height={tinggiPlot} fill={sorot === i ? '#f5f7f8' : 'transparent'} />
              {seri.map((s, j) => {
                const v = d.nilai[s.kunci] || 0;
                const h = Math.max(v ? 2 : 0, y(0) - y(v));
                const x = x0 + j * (lebarBatang + 2);
                return v ? (
                  <path key={s.kunci} fill={s.warna}
                    d={`M${x},${y(0)} V${y(0) - h + 4} Q${x},${y(0) - h} ${x + 4},${y(0) - h} H${x + lebarBatang - 4} Q${x + lebarBatang},${y(0) - h} ${x + lebarBatang},${y(0) - h + 4} V${y(0)} Z`} />
                ) : null;
              })}
              <text x={kiri + i * lebarKelompok + lebarKelompok / 2} y={tinggi - 8} textAnchor="middle" fontSize="11" fill="#5b6673">{d.label}</text>
            </g>
          );
        })}
      </svg>
      {sorot !== null && (
        <div style={{
          position: 'absolute', top: '28px', left: `${((kiri + (sorot + 0.5) * lebarKelompok) / lebar) * 100}%`, transform: 'translateX(-50%)',
          background: '#1f2933', color: 'white', fontSize: '0.78rem', padding: '6px 9px', borderRadius: '4px', pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          <div style={{ fontWeight: 600, marginBottom: '2px' }}>{data[sorot].label}</div>
          {seri.map(s => <div key={s.kunci}>{s.nama}: {data[sorot].nilai[s.kunci] || 0}</div>)}
        </div>
      )}
    </div>
  );
}

/** Bilah kemajuan bertumpuk, mis. status jadwal hari ini */
export function BilahStatus({ bagian }) {
  const total = bagian.reduce((a, b) => a + b.nilai, 0);
  return (
    <div>
      <div style={{ display: 'flex', height: '10px', borderRadius: '5px', overflow: 'hidden', background: '#eceff2', gap: total ? '2px' : 0 }}>
        {total > 0 && bagian.filter(b => b.nilai).map(b => (
          <div key={b.nama} title={`${b.nama}: ${b.nilai}`} style={{ width: `${(b.nilai / total) * 100}%`, background: b.warna }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '8px', fontSize: '0.8rem', color: '#3a4550' }}>
        {bagian.map(b => (
          <span key={b.nama} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: b.warna }} /> {b.nama} <strong>{b.nilai}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}
