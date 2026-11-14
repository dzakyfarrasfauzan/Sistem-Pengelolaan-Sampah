import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Camera, MapPin, Send, CheckCircle2, Loader2, User, FileText, Navigation, RefreshCw, AlertCircle, Landmark } from 'lucide-react';
import { API_URL } from '../config';
import KepalaSitus from '../components/KepalaSitus';

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom draggable red marker icon
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Reverse geocoding via Nominatim (OpenStreetMap) — gratis, tanpa API key
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=id`,
      { headers: { 'User-Agent': 'SistemPengelolaanSampah/1.0' } }
    );
    const data = await res.json();
    return data.display_name || '';
  } catch {
    return '';
  }
}

// Komponen untuk menangkap klik di peta
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Komponen marker yang bisa di-drag
function DraggableMarker({ position, onDragEnd }) {
  const markerRef = useRef(null);

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const { lat, lng } = marker.getLatLng();
        onDragEnd(lat, lng);
      }
    },
  };

  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={redIcon}
    />
  );
}

// Komponen untuk recenter peta
function MapRecenter({ center }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (center) {
      map.flyTo(center, map.getZoom() < 15 ? 16 : map.getZoom(), { animate: true, duration: 1 });
    }
  }, [center, map]);
  return null;
}


export default function Laporan() {
  const [akun, setAkun] = useState(undefined); // akun masyarakat yang sedang masuk
  const [formData, setFormData] = useState({
    deskripsi: '',
    alamat_lokasi: '',
    patokan: '',
    latitude: '',
    longitude: ''
  });
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [status, setStatus] = useState({ loading: false, success: false, kode: '', error: '' });
  const [locLoading, setLocLoading] = useState(false);
  const [locStatus, setLocStatus] = useState('');
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const navigate = useNavigate();
  const streamRef = useRef(null);
  const gpsRef = useRef({ latitude: null, longitude: null, accuracy: null });
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const watchIdRef = useRef(null);


  // Membuat laporan wajib masuk dengan akun masyarakat
  useEffect(() => {
    const cek = async () => {
      try {
        const r = await axios.get(`${API_URL}/masyarakat/saya`, { withCredentials: true });
        if (!r.data.akun) { navigate('/masuk?lanjut=/laporan', { replace: true }); return; }
        if (!r.data.akun.no_wa) { navigate('/laporan-saya?lengkapi=1', { replace: true }); return; }
        setAkun(r.data.akun);
      } catch { navigate('/masuk?lanjut=/laporan', { replace: true }); }
    };
    cek();
  }, [navigate]);

  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraActive]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);


  // watchPosition GPS
  const startGPSWatch = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation tidak didukung'));
        return;
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      let bestPos = null;
      const timeout = setTimeout(() => {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        if (bestPos) resolve(bestPos);
        else reject(new Error('GPS timeout'));
      }, 15000);

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          setGpsAccuracy(Math.round(accuracy));
          if (!bestPos || accuracy < bestPos.accuracy) {
            bestPos = { latitude, longitude, accuracy };
            gpsRef.current = { latitude, longitude, accuracy };
          }
          if (accuracy <= 30) {
            clearTimeout(timeout);
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
            resolve(bestPos);
          }
        },
        (err) => {
          clearTimeout(timeout);
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
          if (bestPos) resolve(bestPos);
          else reject(err);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  };

  const handleStartCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setCameraActive(true);
      setLocStatus('detecting');
      setLocLoading(true);
      setGpsAccuracy(null);
      try {
        await startGPSWatch();
        setLocStatus('success');
      } catch {
        setLocStatus('error');
      }
      setLocLoading(false);
    } catch {
      alert('Akses kamera ditolak atau tidak didukung browser ini.');
    }
  };

  const handleDetectGPS = async () => {
    setLocStatus('detecting');
    setLocLoading(true);
    setGpsAccuracy(null);
    try {
      const pos = await startGPSWatch();
      const alamat = await reverseGeocode(pos.latitude, pos.longitude);
      setFormData(prev => ({
        ...prev,
        latitude: pos.latitude,
        longitude: pos.longitude,
        alamat_lokasi: alamat || prev.alamat_lokasi
      }));
      setGpsAccuracy(Math.round(pos.accuracy));
      setLocStatus('success');
      setMapReady(true);
    } catch {
      setLocStatus('error');
    }
    setLocLoading(false);
  };

  const handleSnap = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'laporan.jpg', { type: 'image/jpeg' });
      setFoto(file);
      setFotoPreview(URL.createObjectURL(file));
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setCameraActive(false);
      const gps = gpsRef.current;
      if (gps.latitude && gps.longitude) {
        setLocLoading(true);
        setLocStatus('detecting');
        const alamat = await reverseGeocode(gps.latitude, gps.longitude);
        setFormData(prev => ({
          ...prev,
          latitude: gps.latitude,
          longitude: gps.longitude,
          alamat_lokasi: alamat || prev.alamat_lokasi
        }));
        setGpsAccuracy(gps.accuracy ? Math.round(gps.accuracy) : null);
        setLocStatus('success');
        setLocLoading(false);
        setMapReady(true);
      }
    }, 'image/jpeg');
  };

  const handleRetake = () => {
    setFotoPreview(null);
    setFoto(null);
    setCameraActive(false);
    gpsRef.current = { latitude: null, longitude: null, accuracy: null };
  };

  // Handler klik di peta atau drag marker
  const handleMapPositionChange = useCallback(async (lat, lng) => {
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
    setLocLoading(true);
    setLocStatus('detecting');
    const alamat = await reverseGeocode(lat, lng);
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      alamat_lokasi: alamat || prev.alamat_lokasi
    }));
    setGpsAccuracy(null);
    setLocStatus('success');
    setLocLoading(false);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Foto kondisi sampah wajib diambil langsung dari kamera
    if (!foto) {
      setStatus({ ...status, loading: false, error: 'Foto kondisi sampah wajib diambil terlebih dahulu.' });
      return;
    }
    setStatus({ ...status, loading: true, error: '' });
    const form = new FormData();
    Object.keys(formData).forEach(key => form.append(key, formData[key]));
    form.append('foto', foto);
    try {
      const res = await axios.post(`${API_URL}/api/public/laporan`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }, withCredentials: true,
      });
      setStatus({ loading: false, success: true, kode: res.data?.kodeLaporan || `LP-${Date.now()}`, error: '' });
    } catch (err) {
      setStatus({ loading: false, success: false, kode: '', error: err.response?.data?.message || 'Gagal mengirim laporan. Coba lagi.' });
    }
  };

  // Menunggu pemeriksaan akun
  if (!akun) {
    return <div style={{ minHeight: '100vh', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5b6673' }}>Memeriksa akun...</div>;
  }

  // SUCCESS STATE
  if (status.success) {
    return (
      <div style={{
        minHeight: '100vh', background: '#f1f7f3',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'inherit', padding: '24px',
      }}>
        <div style={{
          background: 'white', padding: '56px 48px', borderRadius: '6px', textAlign: 'center',
          boxShadow: '0 1px 2px rgba(16,24,40,0.06)', maxWidth: '440px', width: '100%',
        }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '6px',
            background: '#e7f1eb', color: '#1f6b47',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px',
          }}>
            <CheckCircle2 size={40} />
          </div>
          <h1 style={{ color: '#17533a', fontSize: '1.4rem', marginBottom: '10px', fontWeight: '700' }}>Laporan Terkirim!</h1>
          <p style={{ color: '#5b6673', marginBottom: '28px', lineHeight: '1.6' }}>Terima kasih atas partisipasi Anda menjaga kebersihan lingkungan Sukabumi.</p>
          <div style={{ background: '#f7f8f9', padding: '24px', borderRadius: '6px', marginBottom: '32px' }}>
            <div style={{ fontSize: '0.85rem', color: '#5b6673', marginBottom: '8px' }}>Kode Tiket Laporan</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#1f6b47', letterSpacing: '2px' }}>{status.kode}</div>
            <div style={{ fontSize: '0.8rem', color: '#8a939d', marginTop: '8px' }}>Kabar penanganan laporan dikirim ke email {akun?.email}.</div>
          </div>
          <button onClick={() => navigate('/laporan-saya')} style={{
            width: '100%', padding: '16px', background: '#1f6b47',
            color: 'white', border: 'none', borderRadius: '6px', fontSize: '1rem',
            fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '10px',
          }}>Lihat di Laporan Saya</button>
          <button onClick={() => navigate('/')} style={{
            width: '100%', padding: '14px', background: 'white', color: '#17533a',
            border: '1.5px solid #b9d8c6', borderRadius: '6px', fontSize: '1rem',
            fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
          }}>Kembali ke Beranda</button>
        </div>
      </div>
    );
  }

  const inputStyle = {
    width: '100%', padding: '9px 11px', borderRadius: '4px',
    border: '1px solid #b9c2cb', boxSizing: 'border-box',
    background: 'white', fontSize: '0.95rem', fontFamily: 'inherit',
  };
  const focusHandlers = {
    onFocus: () => {},
    onBlur: () => {},
  };
  const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' };

  const mapCenter = formData.latitude && formData.longitude
    ? [Number(formData.latitude), Number(formData.longitude)]
    : [-6.9174639, 106.9297]; // Default: Sukabumi

  const accuracyBadge = gpsAccuracy !== null ? (
    <span style={{
      padding: '2px 10px', borderRadius: '4px', fontWeight: '700', fontSize: '0.75rem',
      background: gpsAccuracy <= 20 ? '#e7f1eb' : gpsAccuracy <= 50 ? '#fefce8' : '#fef2f2',
      color: gpsAccuracy <= 20 ? '#1f6b47' : gpsAccuracy <= 50 ? '#ca8a04' : '#dc2626',
      border: `1px solid ${gpsAccuracy <= 20 ? '#b9d8c6' : gpsAccuracy <= 50 ? '#fde68a' : '#fecaca'}`,
    }}>
      {gpsAccuracy <= 20 ? '' : gpsAccuracy <= 50 ? '' : ''} Akurasi GPS: ±{gpsAccuracy}m
    </span>
  ) : null;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f3f4f6',
      fontFamily: 'inherit',
    }}>
      <KepalaSitus />
      <div style={{ height: '24px' }} />

      <div style={{ maxWidth: '660px', margin: '0 auto', padding: '0 24px 60px' }}>
        <div style={{
          background: 'white', padding: '28px 32px', borderRadius: '6px',
          boxShadow: '0 1px 2px rgba(16,24,40,0.06)',
          border: '1px solid #d8dde3',
        }}>
          {/* Header */}
          <div style={{ marginBottom: '36px' }}>
            <h1 style={{ margin: '0 0 6px', fontSize: '1.3rem', fontWeight: '600' }}>
              Formulir Laporan Sampah
            </h1>
            <p style={{ color: '#5b6673', margin: 0, fontSize: '0.92rem', lineHeight: '1.6' }}>
              Isi data di bawah ini. Kolom bertanda * wajib diisi.
            </p>
          </div>

          {status.error && (
            <div style={{
              background: '#fef2f2', color: '#dc2626', padding: '14px 16px', borderRadius: '6px',
              marginBottom: '24px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px',
              border: '1px solid #fecaca',
            }}>
              <AlertCircle size={18} /> {status.error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

            {/* Identitas */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', fontSize: '0.98rem', fontWeight: '600', color: '#1f2933', borderBottom: '1px solid #eceff2', paddingBottom: '8px' }}>
                <User size={16} color="#1f6b47" /> Identitas Pelapor
              </div>
              <div style={{ background: '#f7f8f9', border: '1px solid #e4e7eb', borderRadius: '4px', padding: '10px 12px', fontSize: '0.9rem', lineHeight: 1.6 }}>
                <div><strong>{akun?.nama}</strong></div>
                <div style={{ color: '#5b6673' }}>WhatsApp {akun?.no_wa} · {akun?.email}</div>
                <div style={{ color: '#8a939d', fontSize: '0.8rem' }}>Data diambil dari akun Anda. Ubah di menu <Link to="/laporan-saya" style={{ color: '#1f6b47' }}>Laporan Saya</Link>.</div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f3f4f6' }} />

            {/* Deskripsi */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', fontSize: '0.98rem', fontWeight: '600', color: '#1f2933', borderBottom: '1px solid #eceff2', paddingBottom: '8px' }}>
                <FileText size={16} color="#1f6b47" /> Detail Laporan
              </div>
              <label style={labelStyle}>Deskripsi Kondisi</label>
              <textarea placeholder="Ceritakan kondisi sampah yang Anda temukan secara singkat..."
                required rows="4" value={formData.deskripsi}
                onChange={e => setFormData({...formData, deskripsi: e.target.value})}
                style={{...inputStyle, resize: 'vertical', lineHeight: '1.6'}} {...focusHandlers} />
            </div>

            <div style={{ borderTop: '1px solid #f3f4f6' }} />

            {/* Foto Bukti */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', fontSize: '0.98rem', fontWeight: '600', color: '#1f2933', borderBottom: '1px solid #eceff2', paddingBottom: '8px' }}>
                <Camera size={16} color="#1f6b47" /> Foto Bukti <span style={{ color: '#dc2626' }}>*</span>
              </div>
              <div style={{ background: '#fafbfb', border: '1px dashed #b9c2cb', borderRadius: '6px', padding: '32px', textAlign: 'center' }}>
                {fotoPreview ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <img src={fotoPreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '260px', borderRadius: '6px', boxShadow: '0 1px 2px rgba(16,24,40,0.06)', display: 'block' }} />
                    <button type="button" onClick={handleRetake} style={{
                      background: 'white', color: '#dc2626', padding: '10px 24px', border: '1.5px solid #fecaca',
                      borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontFamily: 'inherit',
                      display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem',
                      transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(16,24,40,0.06)',
                    }}
                      onMouseOver={e => { e.currentTarget.style.background = '#fef2f2'; }}
                      onMouseOut={e => { e.currentTarget.style.background = 'white'; }}
                    >
                      <RefreshCw size={16} /> Ambil Ulang
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    {!cameraActive && (
                      <>
                        <div>
                          <div style={{ fontWeight: '600', color: '#374151', fontSize: '0.95rem', marginBottom: '4px' }}>Foto kondisi sampah</div>
                          <p style={{ fontSize: '0.85rem', color: '#5b6673', margin: '0 0 12px' }}>Foto diambil langsung dari kamera. Lokasi GPS ikut tercatat.</p>
                        </div>
                        <button type="button" onClick={handleStartCamera} style={{
                          padding: '12px 28px', background: '#1f6b47',
                          color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer',
                          fontWeight: '700', fontFamily: 'inherit', fontSize: '0.95rem',
                          display: 'inline-flex', alignItems: 'center', gap: '8px',
                          boxShadow: '0 1px 2px rgba(16,24,40,0.06)', transition: 'all 0.3s',
                        }}
                        >
                          <Camera size={18} /> Buka Kamera
                        </button>
                      </>
                    )}

                    {cameraActive && (
                      <div style={{ width: '100%', maxWidth: '360px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: '6px', background: 'black', boxShadow: '0 1px 2px rgba(16,24,40,0.06)' }}></video>
                        <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                          fontSize: '0.8rem', padding: '8px 14px', borderRadius: '6px', fontWeight: '600',
                          background: locStatus === 'success' ? '#e7f1eb' : locStatus === 'error' ? '#fef2f2' : '#eff6ff',
                          color: locStatus === 'success' ? '#1f6b47' : locStatus === 'error' ? '#dc2626' : '#2563eb',
                          border: `1px solid ${locStatus === 'success' ? '#b9d8c6' : locStatus === 'error' ? '#fecaca' : '#bfdbfe'}`,
                        }}>
                          {locStatus === 'detecting' && <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Mendeteksi GPS{gpsAccuracy ? ` (±${gpsAccuracy}m)...` : '...'}</>}
                          {locStatus === 'success' && <><CheckCircle2 size={14} /> GPS terdeteksi{gpsAccuracy ? ` — akurasi ±${gpsAccuracy}m ✓` : ' ✓'}</>}
                          {locStatus === 'error' && <><MapPin size={14} /> GPS tidak tersedia, foto tetap bisa diambil</>}
                        </div>
                        <button type="button" onClick={handleSnap} style={{
                          padding: '14px', background: '#1f6b47',
                          color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer',
                          fontWeight: '700', fontFamily: 'inherit', fontSize: '1rem',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                          boxShadow: '0 1px 2px rgba(16,24,40,0.06)', transition: 'all 0.2s',
                        }}>
                          Jepret Sekarang
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f3f4f6' }} />

            {/* Lokasi */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.98rem', fontWeight: '600', color: '#1f2933', borderBottom: '1px solid #eceff2', paddingBottom: '8px' }}>
                  <Navigation size={16} color="#1f6b47" /> Lokasi Kejadian
                </div>
                {!cameraActive && (
                  <button type="button" onClick={handleDetectGPS} disabled={locLoading} style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                    borderRadius: '6px', border: '1.5px solid #d1d5db', background: 'white',
                    color: '#374151', fontSize: '0.8rem', fontWeight: '600',
                    cursor: locLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                    transition: 'all 0.2s', opacity: locLoading ? 0.6 : 1,
                  }}
                    onMouseOver={e => { if (!locLoading) { e.currentTarget.style.borderColor = '#1f6b47'; e.currentTarget.style.color = '#1f6b47'; } }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#374151'; }}
                  >
                    {locLoading
                      ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Mendeteksi...</>
                      : <><Navigation size={14} /> {formData.latitude ? 'Deteksi Ulang GPS' : 'Deteksi GPS'}</>
                    }
                  </button>
                )}
              </div>

              <div style={{
                background: formData.latitude ? '#e7f1eb' : '#f7f8f9',
                border: `1.5px solid ${formData.latitude ? '#b9d8c6' : '#d8dde3'}`,
                borderRadius: '6px', padding: '20px', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <label style={{...labelStyle, margin: 0, fontSize: '0.9rem' }}>Alamat Lokasi</label>
                  {locLoading && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2563eb', fontSize: '0.8rem', fontWeight: '600' }}><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Mendeteksi...</div>}
                  {!locLoading && formData.latitude && <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#1f6b47', color: 'white', padding: '5px 14px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700' }}><CheckCircle2 size={12} /> Terdeteksi</div>}
                  {!locLoading && !formData.latitude && !cameraActive && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8a939d', fontSize: '0.8rem', fontWeight: '500' }}><MapPin size={14} /> Otomatis saat foto / GPS</div>}
                </div>

                <input placeholder="Alamat terisi otomatis saat foto diambil atau GPS dideteksi..."
                  required
                  value={formData.alamat_lokasi}
                  onChange={e => setFormData({...formData, alamat_lokasi: e.target.value})}
                  style={{...inputStyle, background: formData.latitude ? 'white' : '#f7f8f9'}} {...focusHandlers} />

                {formData.latitude && (
                  <div style={{ marginTop: '10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <span style={{ color: '#1f6b47', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                      <CheckCircle2 size={13} />
                      {Number(formData.latitude).toFixed(6)}, {Number(formData.longitude).toFixed(6)}
                    </span>
                    {accuracyBadge}
                  </div>
                )}
              </div>

              {/* === PETA INTERAKTIF LEAFLET === */}
              <div style={{ marginTop: '16px' }}>
                <div style={{
                  borderRadius: '6px', overflow: 'hidden',
                  border: '1.5px solid #d1d5db',
                  boxShadow: '0 1px 2px rgba(16,24,40,0.06)',
                }}>
                  {/* Info banner di atas peta */}
                  <div style={{
                    padding: '8px 12px', background: '#f7f8f9', borderBottom: '1px solid #d8dde3',
                    color: '#3a4550', fontSize: '0.82rem',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}>
                    <MapPin size={14} />
                    {formData.latitude
                      ? 'Geser atau klik pada peta untuk menyesuaikan titik lokasi'
                      : 'Klik pada peta untuk menentukan lokasi, atau gunakan tombol Deteksi GPS'}
                  </div>
                  <MapContainer
                    key={`map-${mapReady}`}
                    center={mapCenter}
                    zoom={formData.latitude ? 16 : 13}
                    style={{ height: '300px', width: '100%' }}
                    scrollWheelZoom={true}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapClickHandler onMapClick={handleMapPositionChange} />
                    {formData.latitude && formData.longitude && (
                      <>
                        <DraggableMarker
                          position={[Number(formData.latitude), Number(formData.longitude)]}
                          onDragEnd={handleMapPositionChange}
                        />
                        <MapRecenter center={[Number(formData.latitude), Number(formData.longitude)]} />
                      </>
                    )}
                  </MapContainer>
                  {/* Info bawah peta */}
                  <div style={{
                    padding: '10px 16px', background: '#f7f8f9', borderTop: '1px solid #d8dde3',
                    fontSize: '0.75rem', color: '#5b6673', display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    <span>Penanda merah dapat ditahan lalu digeser agar titiknya lebih tepat. Alamat akan diperbarui otomatis.</span>
                  </div>
                </div>
              </div>

              {/* Tombol Google Maps */}
              {formData.latitude && formData.longitude && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${formData.latitude},${formData.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    marginTop: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '11px 16px', borderRadius: '6px', textDecoration: 'none',
                    background: '#2b5c8a',
                    color: 'white', fontWeight: '700', fontSize: '0.85rem',
                    boxShadow: '0 1px 2px rgba(16,24,40,0.06)',
                    transition: 'all 0.2s',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                  Verifikasi Lokasi di Google Maps
                </a>
              )}
            </div>

            <div style={{ borderTop: '1px solid #f3f4f6' }} />

            {/* Patokan / Landmark */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', fontSize: '0.98rem', fontWeight: '600', color: '#1f2933', borderBottom: '1px solid #eceff2', paddingBottom: '8px' }}>
                <Landmark size={16} color="#1f6b47" /> Patokan Lokasi
              </div>
              <label style={labelStyle}>
                Patokan / Landmark Terdekat
                <span style={{ fontWeight: '400', color: '#8a939d', marginLeft: '8px', fontSize: '0.82rem', textTransform: 'none' }}>(opsional, sangat membantu petugas)</span>
              </label>
              <textarea
                placeholder="Cth: Di belakang Masjid Al-Ikhlas, depan warung Pak Hasan, atau 100m dari perempatan Jl. Siliwangi..."
                rows="3"
                value={formData.patokan}
                onChange={e => setFormData({...formData, patokan: e.target.value})}
                style={{...inputStyle, resize: 'vertical', lineHeight: '1.6'}}
                {...focusHandlers}
              />
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 14px', background: '#fffbeb', borderRadius: '6px', border: '1px solid #fde68a' }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}></span>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#92400e', lineHeight: '1.5' }}>
                  Patokan membantu petugas menemukan lokasi dengan lebih cepat, terutama jika sinyal GPS kurang akurat di area Anda.
                </p>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={status.loading} style={{
              width: '100%', padding: '18px',
              background: status.loading ? '#8a939d' : '#1f6b47',
              color: 'white', border: 'none', borderRadius: '6px',
              fontSize: '1.05rem', fontWeight: '700', fontFamily: 'inherit',
              cursor: status.loading ? 'not-allowed' : 'pointer', marginTop: '8px',
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px',
              boxShadow: 'none',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            >
              {status.loading
                ? <><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Mengirim...</>
                : <><Send size={18} /> Kirim Laporan</>
              }
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .leaflet-container { font-family: inherit; }
      `}</style>
    </div>
  );
}
