import { useState } from 'react';
import { ImagePlus, X } from 'lucide-react';

/**
 * Pilih foto untuk sopir: boleh dari galeri maupun langsung dari kamera.
 * Sopir memotret armada atau kegiatan di lapangan, lalu mengunggahnya kapan saja.
 * (Kamera langsung tanpa galeri hanya dipakai pada laporan masyarakat.)
 * Props: onChange(file | null)
 */
export default function PilihFoto({ onChange }) {
  const [preview, setPreview] = useState(null);

  const pilih = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('File harus berupa gambar'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Ukuran foto maksimal 5 MB'); return; }
    setPreview(URL.createObjectURL(file));
    onChange(file);
  };

  const hapus = () => {
    setPreview(null);
    onChange(null);
  };

  if (preview) {
    return (
      <div style={{ position: 'relative' }}>
        <img src={preview} alt="Pratinjau foto" style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #d8dde3' }} />
        <button type="button" onClick={hapus} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '22px', border: '2px dashed #cbd5e1', borderRadius: '6px', cursor: 'pointer', color: '#475569', background: '#f8fafc', textAlign: 'center' }}>
      <ImagePlus size={28} color="#1f6b47" />
      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Pilih foto dari galeri atau kamera</span>
      <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Format gambar, maksimal 5 MB</span>
      <input type="file" accept="image/*" onChange={pilih} style={{ display: 'none' }} />
    </label>
  );
}
