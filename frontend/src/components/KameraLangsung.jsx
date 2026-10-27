import { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, X } from 'lucide-react';

/**
 * Kamera langsung (realtime) untuk foto kegiatan petugas.
 * Foto hanya bisa diambil dari kamera perangkat saat itu juga,
 * tidak bisa memilih file dari galeri, sama seperti pelaporan masyarakat.
 * Props: onCapture(file | null)
 */
export default function KameraLangsung({ onCapture }) {
  const [cameraActive, setCameraActive] = useState(false);
  const [preview, setPreview] = useState(null);
  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Hubungkan stream ke elemen video setelah video tampil
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraActive]);

  // Matikan kamera saat komponen ditutup
  useEffect(() => () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  }, []);

  const handleStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setCameraActive(true);
    } catch {
      alert('Akses kamera ditolak atau tidak didukung browser ini.');
    }
  };

  const handleSnap = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      const file = new File([blob], `kegiatan-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setPreview(URL.createObjectURL(file));
      onCapture(file);
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  const handleRetake = () => {
    setPreview(null);
    onCapture(null);
    handleStart();
  };

  const btn = {
    padding: '12px 20px', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700',
    fontFamily: 'inherit', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
  };

  return (
    <div style={{ background: '#f9fafb', border: '2px dashed #d1d5db', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
      {preview ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <img src={preview} alt="Foto kegiatan" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '10px' }} />
          <button type="button" onClick={handleRetake} style={{ ...btn, background: 'white', color: '#dc2626', border: '1.5px solid #fecaca' }}>
            <RefreshCw size={16} /> Ambil Ulang
          </button>
        </div>
      ) : cameraActive ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', borderRadius: '10px', background: 'black' }} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={stopCamera} style={{ ...btn, flex: 1, background: 'white', color: '#4b5563', border: '1px solid #e5e7eb' }}>
              <X size={16} /> Batal
            </button>
            <button type="button" onClick={handleSnap} style={{ ...btn, flex: 2, background: 'linear-gradient(135deg, #059669, #047857)', color: 'white' }}>
              📸 Jepret Sekarang
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>Foto diambil langsung dari kamera saat kegiatan berlangsung</div>
          <button type="button" onClick={handleStart} style={{ ...btn, background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: 'white' }}>
            <Camera size={18} /> Buka Kamera
          </button>
        </div>
      )}
    </div>
  );
}
