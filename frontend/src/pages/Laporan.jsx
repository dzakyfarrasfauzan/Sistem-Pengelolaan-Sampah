import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Camera, MapPin, Send, ArrowLeft, CheckCircle2, Loader2, User, FileText, Navigation, RefreshCw, AlertCircle, Landmark } from 'lucide-react';
import { API_URL } from '../config';

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
  const [formData, setFormData] = useState({
    nama_pelapor: '',
    nomor_telepon: '',
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
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setStatus({ loading: false, success: true, kode: res.data?.kodeLaporan || `LP-${Date.now()}`, error: '' });
    } catch (err) {
      setStatus({ loading: false, success: false, kode: '', error: err.response?.data?.message || 'Gagal mengirim laporan. Coba lagi.' });
    }
  };

  // SUCCESS STATE
  if (status.success) {
    return (
      <div style={{
        minHeight: '100vh', background: 'linear-gradient(160deg, #f0fdf4 0%, #ecfdf5 50%, #d1fae5 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '24px',
      }}>
        <div style={{
          background: 'white', padding: '56px 48px', borderRadius: '28px', textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.06)', maxWidth: '440px', width: '100%',
          animation: 'fadeInUp 0.5s ease-out',
        }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '24px',
            background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', color: '#059669',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px',
          }}>
            <CheckCircle2 size={40} />
          </div>
          <h1 style={{ color: '#064e3b', fontSize: '1.8rem', marginBottom: '10px', fontWeight: '800' }}>Laporan Terkirim!</h1>
          <p style={{ color: '#6b7280', marginBottom: '28px', lineHeight: '1.6' }}>Terima kasih atas partisipasi Anda menjaga kebersihan lingkungan Sukabumi.</p>
          <div style={{ background: '#f9fafb', padding: '24px', borderRadius: '16px', marginBottom: '32px' }}>
            <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '8px' }}>Kode Tiket Laporan</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#059669', letterSpacing: '2px' }}>{status.kode}</div>
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '8px' }}>Simpan kode ini untuk mengecek status laporan Anda.</div>
          </div>
          <button onClick={() => navigate('/')} style={{
            width: '100%', padding: '16px', background: 'linear-gradient(135deg, #059669, #047857)',
            color: 'white', border: 'none', borderRadius: '14px', fontSize: '1rem',
            fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
          }}>Kembali ke Beranda</button>
        </div>
      </div>
    );
  }

  const inputStyle = {
    width: '100%', padding: '14px 16px', borderRadius: '12px',
    border: '1.5px solid #e5e7eb', outline: 'none', boxSizing: 'border-box',
    background: '#f9fafb', fontSize: '0.95rem', fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  };
  const focusHandlers = {
    onFocus: (e) => { e.target.style.borderColor = '#059669'; e.target.style.background = 'white'; e.target.style.boxShadow = '0 0 0 4px rgba(5, 150, 105, 0.08)'; },
    onBlur: (e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#f9fafb'; e.target.style.boxShadow = 'none'; },
  };
  const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' };

  const mapCenter = formData.latitude && formData.longitude
    ? [Number(formData.latitude), Number(formData.longitude)]
    : [-6.9174639, 106.9297]; // Default: Sukabumi

  const accuracyBadge = gpsAccuracy !== null ? (
    <span style={{
      padding: '2px 10px', borderRadius: '100px', fontWeight: '700', fontSize: '0.75rem',
      background: gpsAccuracy <= 20 ? '#ecfdf5' : gpsAccuracy <= 50 ? '#fefce8' : '#fef2f2',
      color: gpsAccuracy <= 20 ? '#059669' : gpsAccuracy <= 50 ? '#ca8a04' : '#dc2626',
      border: `1px solid ${gpsAccuracy <= 20 ? '#a7f3d0' : gpsAccuracy <= 50 ? '#fde68a' : '#fecaca'}`,
    }}>
      {gpsAccuracy <= 20 ? '✅' : gpsAccuracy <= 50 ? '⚠️' : '⛔'} Akurasi GPS: ±{gpsAccuracy}m
    </span>
  ) : null;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #f0fdf4 0%, #f9fafb 40%, #eef2ff 100%)',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* Top bar */}
      <div style={{ padding: '20px 24px', maxWidth: '660px', margin: '0 auto' }}>
        <button onClick={() => navigate('/')} style={{
          display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none',
          color: '#6b7280', fontSize: '0.9rem', cursor: 'pointer', padding: '8px 0',
          fontWeight: '500', fontFamily: 'inherit', transition: 'color 0.2s',
        }}
          onMouseOver={e => e.currentTarget.style.color = '#111827'}
          onMouseOut={e => e.currentTarget.style.color = '#6b7280'}
        >
          <ArrowLeft size={18} /> Kembali
        </button>
      </div>

      <div style={{ maxWidth: '660px', margin: '0 auto', padding: '0 24px 60px', animation: 'fadeInUp 0.5s ease-out' }}>
        <div style={{
          background: 'white', padding: '48px 40px', borderRadius: '28px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04), 0 10px 15px -3px rgba(0,0,0,0.05)',
          border: '1px solid rgba(229,231,235,0.6)',
        }}>
          {/* Header */}
          <div style={{ marginBottom: '36px' }}>
            <div style={{
              display: 'inline-block', padding: '6px 16px', borderRadius: '100px',
              background: '#ecfdf5', color: '#059669', fontSize: '0.75rem',
              fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '16px',
            }}>Formulir Laporan</div>
            <h1 style={{ margin: '0 0 8px', fontSize: '1.8rem', color: '#064e3b', fontWeight: '800', letterSpacing: '-0.5px' }}>
              Buat Laporan Baru
            </h1>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '0.95rem', lineHeight: '1.6' }}>
              Sampaikan temuan tumpukan sampah liar di sekitar Anda.
            </p>
          </div>

          {status.error && (
            <div style={{
              background: '#fef2f2', color: '#dc2626', padding: '14px 16px', borderRadius: '12px',
              marginBottom: '24px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px',
              border: '1px solid #fecaca',
            }}>
              <AlertCircle size={18} /> {status.error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

            {/* Identitas */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', fontSize: '0.85rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <User size={16} color="#059669" /> Identitas Pelapor
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                <div>
                  <label style={labelStyle}>Nama Lengkap</label>
                  <input placeholder="Cth: Budi Santoso" required value={formData.nama_pelapor}
                    onChange={e => setFormData({...formData, nama_pelapor: e.target.value})}
                    style={inputStyle} {...focusHandlers} />
                </div>
                <div>
                  <label style={labelStyle}>Nomor WhatsApp</label>
                  <input placeholder="Cth: 0812..." type="tel" required value={formData.nomor_telepon}
                    onChange={e => setFormData({...formData, nomor_telepon: e.target.value})}
                    style={inputStyle} {...focusHandlers} />
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f3f4f6' }} />

            {/* Deskripsi */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', fontSize: '0.85rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <FileText size={16} color="#059669" /> Detail Laporan
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', fontSize: '0.85rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Camera size={16} color="#059669" /> Foto Bukti <span style={{ color: '#dc2626' }}>*</span>
              </div>
              <div style={{ background: '#f9fafb', border: '2px dashed #d1d5db', borderRadius: '20px', padding: '32px', textAlign: 'center' }}>
                {fotoPreview ? (
                  <div style={{ animation: 'fadeIn 0.3s ease-out', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <img src={fotoPreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '260px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'block' }} />
                    <button type="button" onClick={handleRetake} style={{
                      background: 'white', color: '#dc2626', padding: '10px 24px', border: '1.5px solid #fecaca',
                      borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontFamily: 'inherit',
                      display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem',
                      transition: 'all 0.2s', boxShadow: '0 2px 6px rgba(220,38,38,0.1)',
                    }}
                      onMouseOver={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(220,38,38,0.15)'; }}
                      onMouseOut={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(220,38,38,0.1)'; }}
                    >
                      <RefreshCw size={16} /> Ambil Ulang
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    {!cameraActive && (
                      <>
                        <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Camera size={28} />
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', color: '#374151', fontSize: '1rem', marginBottom: '4px' }}>Ambil Foto Langsung</div>
                          <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: '0 0 16px' }}>Buka kamera untuk memotret — lokasi GPS otomatis terdeteksi</p>
                        </div>
                        <button type="button" onClick={handleStartCamera} style={{
                          padding: '12px 28px', background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                          color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer',
                          fontWeight: '700', fontFamily: 'inherit', fontSize: '0.95rem',
                          display: 'inline-flex', alignItems: 'center', gap: '8px',
                          boxShadow: '0 4px 12px rgba(79,70,229,0.25)', transition: 'all 0.3s',
                        }}
                          onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                          onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                          <Camera size={18} /> Buka Kamera
                        </button>
                      </>
                    )}

                    {cameraActive && (
                      <div style={{ width: '100%', maxWidth: '360px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeIn 0.3s ease-out' }}>
                        <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: '12px', background: 'black', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}></video>
                        <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                          fontSize: '0.8rem', padding: '8px 14px', borderRadius: '10px', fontWeight: '600',
                          background: locStatus === 'success' ? '#ecfdf5' : locStatus === 'error' ? '#fef2f2' : '#eff6ff',
                          color: locStatus === 'success' ? '#059669' : locStatus === 'error' ? '#dc2626' : '#2563eb',
                          border: `1px solid ${locStatus === 'success' ? '#a7f3d0' : locStatus === 'error' ? '#fecaca' : '#bfdbfe'}`,
                        }}>
                          {locStatus === 'detecting' && <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Mendeteksi GPS{gpsAccuracy ? ` (±${gpsAccuracy}m)...` : '...'}</>}
                          {locStatus === 'success' && <><CheckCircle2 size={14} /> GPS terdeteksi{gpsAccuracy ? ` — akurasi ±${gpsAccuracy}m ✓` : ' ✓'}</>}
                          {locStatus === 'error' && <><MapPin size={14} /> GPS tidak tersedia, foto tetap bisa diambil</>}
                        </div>
                        <button type="button" onClick={handleSnap} style={{
                          padding: '14px', background: 'linear-gradient(135deg, #059669, #047857)',
                          color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer',
                          fontWeight: '700', fontFamily: 'inherit', fontSize: '1rem',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                          boxShadow: '0 4px 12px rgba(5,150,105,0.25)', transition: 'all 0.2s',
                        }}>
                          📸 Jepret Sekarang
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <Navigation size={16} color="#059669" /> Lokasi Kejadian
                </div>
                {!cameraActive && (
                  <button type="button" onClick={handleDetectGPS} disabled={locLoading} style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                    borderRadius: '10px', border: '1.5px solid #d1d5db', background: 'white',
                    color: '#374151', fontSize: '0.8rem', fontWeight: '600',
                    cursor: locLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                    transition: 'all 0.2s', opacity: locLoading ? 0.6 : 1,
                  }}
                    onMouseOver={e => { if (!locLoading) { e.currentTarget.style.borderColor = '#059669'; e.currentTarget.style.color = '#059669'; } }}
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
                background: formData.latitude ? '#ecfdf5' : '#f9fafb',
                border: `1.5px solid ${formData.latitude ? '#a7f3d0' : '#e5e7eb'}`,
                borderRadius: '16px', padding: '20px', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <label style={{...labelStyle, margin: 0, fontSize: '0.9rem' }}>Alamat Lokasi</label>
                  {locLoading && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2563eb', fontSize: '0.8rem', fontWeight: '600' }}><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Mendeteksi...</div>}
                  {!locLoading && formData.latitude && <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#059669', color: 'white', padding: '5px 14px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '700' }}><CheckCircle2 size={12} /> Terdeteksi</div>}
                  {!locLoading && !formData.latitude && !cameraActive && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9ca3af', fontSize: '0.8rem', fontWeight: '500' }}><MapPin size={14} /> Otomatis saat foto / GPS</div>}
                </div>

                <input placeholder="Alamat terisi otomatis saat foto diambil atau GPS dideteksi..."
                  required
                  value={formData.alamat_lokasi}
                  onChange={e => setFormData({...formData, alamat_lokasi: e.target.value})}
                  style={{...inputStyle, background: formData.latitude ? 'white' : '#f9fafb'}} {...focusHandlers} />

                {formData.latitude && (
                  <div style={{ marginTop: '10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
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
                  borderRadius: '16px', overflow: 'hidden',
                  border: '1.5px solid #d1d5db',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
                }}>
                  {/* Info banner di atas peta */}
                  <div style={{
                    padding: '10px 16px', background: 'linear-gradient(135deg, #1a73e8, #1557b0)',
                    color: 'white', fontSize: '0.8rem', fontWeight: '600',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}>
                    <MapPin size={14} />
                    {formData.latitude
                      ? '📍 Geser atau klik pada peta untuk menyesuaikan titik lokasi'
                      : '🗺️ Klik pada peta untuk menentukan lokasi, atau gunakan tombol Deteksi GPS'}
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
                    padding: '10px 16px', background: '#f9fafb', borderTop: '1px solid #e5e7eb',
                    fontSize: '0.75rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    <span style={{ color: '#dc2626', fontSize: '1rem' }}>📌</span>
                    Marker merah bisa <strong>diklik-tahan dan digeser</strong> untuk akurasi yang lebih tepat. Alamat akan otomatis diperbarui.
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
                    padding: '11px 16px', borderRadius: '12px', textDecoration: 'none',
                    background: 'linear-gradient(135deg, #1a73e8, #1557b0)',
                    color: 'white', fontWeight: '700', fontSize: '0.85rem',
                    boxShadow: '0 4px 12px rgba(26,115,232,0.25)',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(26,115,232,0.35)'; }}
                  onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(26,115,232,0.25)'; }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                  Verifikasi Lokasi di Google Maps
                </a>
              )}
            </div>

            <div style={{ borderTop: '1px solid #f3f4f6' }} />

            {/* Patokan / Landmark */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', fontSize: '0.85rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Landmark size={16} color="#059669" /> Patokan Lokasi
              </div>
              <label style={labelStyle}>
                Patokan / Landmark Terdekat
                <span style={{ fontWeight: '400', color: '#9ca3af', marginLeft: '8px', fontSize: '0.82rem', textTransform: 'none' }}>(opsional, sangat membantu petugas)</span>
              </label>
              <textarea
                placeholder="Cth: Di belakang Masjid Al-Ikhlas, depan warung Pak Hasan, atau 100m dari perempatan Jl. Siliwangi..."
                rows="3"
                value={formData.patokan}
                onChange={e => setFormData({...formData, patokan: e.target.value})}
                style={{...inputStyle, resize: 'vertical', lineHeight: '1.6'}}
                {...focusHandlers}
              />
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 14px', background: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a' }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>💡</span>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#92400e', lineHeight: '1.5' }}>
                  Patokan membantu petugas menemukan lokasi dengan lebih cepat, terutama jika sinyal GPS kurang akurat di area Anda.
                </p>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={status.loading} style={{
              width: '100%', padding: '18px',
              background: status.loading ? '#9ca3af' : 'linear-gradient(135deg, #059669, #047857)',
              color: 'white', border: 'none', borderRadius: '14px',
              fontSize: '1.05rem', fontWeight: '800', fontFamily: 'inherit',
              cursor: status.loading ? 'not-allowed' : 'pointer', marginTop: '8px',
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px',
              boxShadow: status.loading ? 'none' : '0 8px 24px rgba(5,150,105,0.25)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
              onMouseOver={e => { if (!status.loading) e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {status.loading
                ? <><Loader2 size={20} style={{ animation: 'spin 0.6s linear infinite' }} /> Mengirim...</>
                : <><Send size={20} /> Kirim Laporan Sekarang</>
              }
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .leaflet-container { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}</style>
    </div>
  );
}
