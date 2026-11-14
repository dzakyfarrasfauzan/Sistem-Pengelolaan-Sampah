import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, X, RotateCcw, Aperture } from 'lucide-react';

/**
 * Foto untuk sopir: bisa memotret langsung dengan kamera, atau memilih dari galeri.
 * Kamera memakai getUserMedia (berjalan di localhost). Bila browser tidak mendukung,
 * tombol kamera memakai pemilih file dengan atribut capture sebagai cadangan.
 * Props: onChange(file | null)
 */
export default function PilihFoto({ onChange }) {
  const [preview, setPreview] = useState(null);
  const [kameraAktif, setKameraAktif] = useState(false);
  const [memuatKamera, setMemuatKamera] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const cadanganRef = useRef(null);

  const matikanKamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setKameraAktif(false);
  };

  // Matikan kamera saat komponen ditutup
  useEffect(() => () => streamRef.current?.getTracks().forEach(t => t.stop()), []);

  useEffect(() => {
    if (kameraAktif && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current;
  }, [kameraAktif]);

  const pakaiFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('File harus berupa gambar'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Ukuran foto maksimal 5 MB'); return; }
    setPreview(URL.createObjectURL(file));
    onChange(file);
  };

  const bukaKamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { cadanganRef.current?.click(); return; }
    setMemuatKamera(true);
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } } });
      setKameraAktif(true);
    } catch {
      alert('Kamera tidak dapat dibuka. Pastikan izin kamera diberikan di browser, atau pilih foto dari galeri.');
    } finally { setMemuatKamera(false); }
  };

  const jepret = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      pakaiFile(new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      matikanKamera();
    }, 'image/jpeg', 0.85);
  };

  const hapus = () => {
    setPreview(null);
    onChange(null);
  };

  if (preview) {
    return (
      <div style={{ position: 'relative' }}>
        <img src={preview} alt="Pratinjau foto" style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #d8dde3' }} />
        <button type="button" onClick={hapus} title="Hapus foto" style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={16} />
        </button>
        <button type="button" onClick={() => { hapus(); bukaKamera(); }} style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '999px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
          <RotateCcw size={14} /> Foto ulang
        </button>
      </div>
    );
  }

  if (kameraAktif) {
    return (
      <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #d8dde3', background: '#000' }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', maxHeight: '300px', display: 'block', objectFit: 'contain' }} />
        <div style={{ display: 'flex', gap: '8px', padding: '10px', background: '#111' }}>
          <button type="button" onClick={matikanKamera} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #555', background: 'transparent', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
            Batal
          </button>
          <button type="button" onClick={jepret} style={{ flex: 2, padding: '10px', borderRadius: '8px', border: 'none', background: '#e9b949', color: '#3d2c00', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Aperture size={18} /> Ambil Foto
          </button>
        </div>
      </div>
    );
  }

  const kotak = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '20px 12px', border: '2px dashed #cbd5e1', borderRadius: '8px', cursor: 'pointer', color: '#334155', background: '#f8fafc', textAlign: 'center', fontFamily: 'inherit' };

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="button" onClick={bukaKamera} disabled={memuatKamera} style={{ ...kotak, borderColor: '#9cc5ad', background: '#f1f8f4' }}>
          <Camera size={26} color="#1f6b47" />
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{memuatKamera ? 'Membuka kamera...' : 'Ambil Foto'}</span>
          <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Pakai kamera langsung</span>
        </button>
        <label style={kotak}>
          <ImagePlus size={26} color="#1f6b47" />
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Pilih dari Galeri</span>
          <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Gambar, maks. 5 MB</span>
          <input type="file" accept="image/*" onChange={e => { pakaiFile(e.target.files?.[0]); e.target.value = ''; }} style={{ display: 'none' }} />
        </label>
      </div>
      {/* Cadangan bila getUserMedia tidak tersedia: buka kamera bawaan perangkat */}
      <input ref={cadanganRef} type="file" accept="image/*" capture="environment" onChange={e => { pakaiFile(e.target.files?.[0]); e.target.value = ''; }} style={{ display: 'none' }} />
    </div>
  );
}
