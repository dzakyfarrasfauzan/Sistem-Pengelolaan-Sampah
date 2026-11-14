import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Truck, Users } from 'lucide-react';
import { Lencana } from './Ui';

// Bagian-bagian dashboard (admin dan pengawas) yang berfokus pada tugas hari ini

/** Kepala dashboard: label kecil, sapaan, kalimat ringkas, dan tombol */
export function KepalaBeranda({ label, sapaan, ringkas, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '14px', flexWrap: 'wrap', marginBottom: '20px' }}>
      <div>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1f6b47', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <h1 style={{ fontSize: '1.6rem', marginTop: '2px' }}>{sapaan}</h1>
        {ringkas && <p style={{ color: '#5b6673', fontSize: '0.95rem', marginTop: '2px' }}>{ringkas}</p>}
      </div>
      {children && <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{children}</div>}
    </div>
  );
}

/** Tombol tautan hijau / putih */
export function TombolTautan({ ke, ikon, children, utama }) {
  return (
    <Link to={ke} style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 15px', borderRadius: '8px', fontWeight: 600, fontSize: '0.88rem',
      background: utama ? '#1f6b47' : 'white', color: utama ? 'white' : '#1f2933', border: utama ? '1px solid #1f6b47' : '1px solid #d8dde3',
    }}>{ikon}{children}</Link>
  );
}

/** Deretan angka dalam satu kartu, dipisah garis tipis: [{ label, nilai, warna, ke }] */
export function StripAngka({ data }) {
  return (
    <div className="strip-angka" style={{ display: 'grid', gridTemplateColumns: `repeat(${data.length}, 1fr)`, background: 'white', border: '1px solid #e1e5e9', borderRadius: '12px', marginBottom: '20px', overflow: 'hidden' }}>
      {data.map((d, i) => {
        const isi = (
          <div style={{ padding: '16px 20px', borderLeft: i ? '1px solid #eef0f2' : 'none', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.82rem', color: '#5b6673' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.warna || '#1f6b47', flexShrink: 0 }} />{d.label}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1f2933', lineHeight: 1.25, marginTop: '4px' }}>{d.nilai}</div>
            {d.ket && <div style={{ fontSize: '0.76rem', color: '#8a939d' }}>{d.ket}</div>}
          </div>
        );
        return d.ke ? <Link key={d.label} to={d.ke} className="sel-angka" style={{ display: 'block' }}>{isi}</Link> : <div key={d.label}>{isi}</div>;
      })}
    </div>
  );
}

/** Kartu putih berjudul dengan angka kecil di samping judul */
export function KotakBeranda({ judul, jumlah, aksi, keAksi, children }) {
  return (
    <section style={{ background: 'white', border: '1px solid #e1e5e9', borderRadius: '12px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '16px 20px 12px' }}>
        <h3 style={{ fontSize: '1.02rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {judul}
          {jumlah !== undefined && <span style={{ fontSize: '0.76rem', fontWeight: 700, padding: '1px 8px', borderRadius: '999px', background: jumlah ? '#fdf1e3' : '#e3f1e8', color: jumlah ? '#8a4b0f' : '#17533a' }}>{jumlah}</span>}
        </h3>
        {aksi && <Link to={keAksi} style={{ fontSize: '0.84rem', color: '#1f6b47', fontWeight: 600 }}>{aksi}</Link>}
      </div>
      <div style={{ padding: '0 20px 18px' }}>{children}</div>
    </section>
  );
}

const NADA = {
  merah: ['#fbe9e9', '#9b1c1c'],
  oranye: ['#fdf1e3', '#8a4b0f'],
  biru: ['#e6eef7', '#1d4f73'],
};

/** Satu baris tugas: ikon, judul, keterangan, tombol aksi */
export function BarisTugas({ ikon, nada = 'oranye', judul, ket, aksi, ke }) {
  const [bg, fg] = NADA[nada];
  return (
    <div className="baris-tugas" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 12px', borderRadius: '10px', border: '1px solid #eef0f2', marginBottom: '8px' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{ikon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{judul}</div>
        {ket && <div style={{ fontSize: '0.8rem', color: '#6b7580', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ket}</div>}
      </div>
      {aksi && (
        <Link to={ke} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 11px', borderRadius: '7px', border: '1px solid #cfe2d6', color: '#17533a', background: '#f3f9f5', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {aksi} <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}

/** Keadaan kosong: semua beres */
export function SemuaBeres({ teks }) {
  return (
    <div style={{ textAlign: 'center', padding: '28px 12px', color: '#5b6673' }}>
      <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#e3f1e8', color: '#1f6b47', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
        <CheckCircle2 size={28} />
      </div>
      <div style={{ fontWeight: 600, color: '#1f2933' }}>Semua beres</div>
      <div style={{ fontSize: '0.86rem' }}>{teks}</div>
    </div>
  );
}

const TITIK = {
  selesai: { background: '#2f8a5b', border: '2px solid #2f8a5b' },
  berjalan: { background: '#3b6ea8', border: '2px solid #3b6ea8', boxShadow: '0 0 0 4px #dbe7f4' },
  menunggu: { background: 'white', border: '2px solid #aab3bc' },
};

/** Garis waktu jadwal pengangkutan hari ini */
export function GarisWaktu({ jadwal, tampilPeriksa }) {
  if (!jadwal.length) return <div style={{ color: '#8a939d', fontSize: '0.88rem', padding: '20px 0', textAlign: 'center' }}>Tidak ada jadwal pengangkutan hari ini.</div>;
  return (
    <div>
      {jadwal.map((j, i) => {
        const akhir = i === jadwal.length - 1;
        const belumPeriksa = tampilPeriksa && j.status === 'menunggu' && !j.kondisi_berangkat;
        return (
          <div key={j.id} style={{ display: 'flex', gap: '12px' }}>
            <div style={{ width: '46px', flexShrink: 0, textAlign: 'right', fontWeight: 700, fontSize: '0.88rem', color: '#1f2933', paddingTop: '1px' }}>{j.jam}</div>
            <div style={{ position: 'relative', width: '14px', flexShrink: 0 }}>
              <span style={{ position: 'absolute', left: '1px', top: '4px', width: '12px', height: '12px', borderRadius: '50%', ...(TITIK[j.status] || TITIK.menunggu) }} />
              {!akhir && <span style={{ position: 'absolute', left: '6px', top: '20px', bottom: '-2px', width: '2px', background: '#e6e9ec' }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingBottom: akhir ? 0 : '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{j.lokasi_tampil}</span>
                <Lencana nilai={j.status} />
                {j.laporan_id && <Lencana nilai="tambahan" />}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b7580', display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '2px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Truck size={13} /> {j.nomor_polisi} · {j.sopir_name}</span>
                {j.kru_names && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Users size={13} /> {j.kru_names}</span>}
              </div>
              {belumPeriksa && <div style={{ fontSize: '0.76rem', color: '#8a4b0f', marginTop: '3px' }}>Armada belum diperiksa sebelum berangkat</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
