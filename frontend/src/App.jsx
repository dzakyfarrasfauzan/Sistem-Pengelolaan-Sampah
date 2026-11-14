import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Laporan from './pages/Laporan'
import CekStatus from './pages/CekStatus'
import MasukMasyarakat from './pages/masyarakat/Masuk'
import DaftarMasyarakat from './pages/masyarakat/Daftar'
import VerifikasiEmail from './pages/masyarakat/Verifikasi'
import LupaPassword from './pages/masyarakat/LupaPassword'
import LaporanSaya from './pages/masyarakat/LaporanSaya'
import AdminLayout from './components/AdminLayout'
import AdminDashboard from './pages/admin/Dashboard'
import AdminTPS from './pages/admin/TPS'
import AdminKendaraan from './pages/admin/Kendaraan'
import AdminPetugas from './pages/admin/Petugas'
import AdminJadwal from './pages/admin/Jadwal'
import AdminJalur from './pages/admin/JalurLayanan'
import AdminLaporanMasyarakat from './pages/admin/LaporanMasyarakat'
import AdminPemeriksaan from './pages/admin/PemeriksaanKendaraan'
import SopirLayout from './components/SopirLayout'
import SopirDashboard from './pages/sopir/Dashboard'
import SopirJadwal from './pages/sopir/Jadwal'
import SopirLaporan from './pages/sopir/Laporan'
import PengawasLayout from './components/PengawasLayout'
import PengawasDashboard from './pages/pengawas/Dashboard'
import PengawasLaporan from './pages/pengawas/Laporan'
import PengawasJadwal from './pages/pengawas/Jadwal'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/laporan" element={<Laporan />} />
        <Route path="/masuk" element={<MasukMasyarakat />} />
        <Route path="/daftar" element={<DaftarMasyarakat />} />
        <Route path="/verifikasi" element={<VerifikasiEmail />} />
        <Route path="/lupa-password" element={<LupaPassword />} />
        <Route path="/laporan-saya" element={<LaporanSaya />} />
        <Route path="/cek-status" element={<CekStatus />} />
        
        {/* Admin routes with Layout */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="tps" element={<AdminTPS />} />
          <Route path="kendaraan" element={<AdminKendaraan />} />
          <Route path="petugas" element={<AdminPetugas />} />
          <Route path="pemeriksaan-kendaraan" element={<AdminPemeriksaan />} />
          <Route path="jalur" element={<AdminJalur />} />
          <Route path="jadwal" element={<AdminJadwal />} />
          <Route path="laporan-masyarakat" element={<AdminLaporanMasyarakat />} />
        </Route>

        {/* Sopir (pemimpin tim petugas operasional) */}
        <Route path="/sopir" element={<SopirLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<SopirDashboard />} />
          <Route path="jadwal" element={<SopirJadwal />} />
          <Route path="laporan" element={<SopirLaporan />} />
        </Route>

        {/* Pengawas Bidang */}
        <Route path="/pengawas" element={<PengawasLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<PengawasDashboard />} />
          <Route path="laporan" element={<PengawasLaporan />} />
          <Route path="jadwal" element={<PengawasJadwal />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
