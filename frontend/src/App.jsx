import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Laporan from './pages/Laporan'
import CekStatus from './pages/CekStatus'
import AdminLayout from './components/AdminLayout'
import PetugasLayout from './components/PetugasLayout'
import AdminDashboard from './pages/admin/Dashboard'
import AdminTPS from './pages/admin/TPS'
import AdminKendaraan from './pages/admin/Kendaraan'
import AdminPetugas from './pages/admin/Petugas'
import AdminJadwal from './pages/admin/Jadwal'
import AdminLaporanMasyarakat from './pages/admin/LaporanMasyarakat'
import PetugasDashboard from './pages/petugas/Dashboard'
import PetugasJadwal from './pages/petugas/Jadwal'
import PetugasLaporan from './pages/petugas/Laporan'
import AdminPemeriksaan from './pages/admin/PemeriksaanKendaraan'
import SopirLayout from './components/SopirLayout'
import SopirDashboard from './pages/sopir/Dashboard'
import SopirJadwal from './pages/sopir/Jadwal'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/laporan" element={<Laporan />} />
        <Route path="/cek-status" element={<CekStatus />} />
        
        {/* Admin routes with Layout */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="tps" element={<AdminTPS />} />
          <Route path="kendaraan" element={<AdminKendaraan />} />
          <Route path="petugas" element={<AdminPetugas key="petugas" role="petugas" />} />
          <Route path="sopir" element={<AdminPetugas key="sopir" role="sopir" />} />
          <Route path="pemeriksaan-kendaraan" element={<AdminPemeriksaan />} />
          <Route path="jadwal" element={<AdminJadwal />} />
          <Route path="laporan-masyarakat" element={<AdminLaporanMasyarakat />} />
        </Route>

        {/* Petugas routes with Layout */}
        <Route path="/petugas" element={<PetugasLayout />}>
          <Route path="dashboard" element={<PetugasDashboard />} />
          <Route path="jadwal" element={<PetugasJadwal />} />
          <Route path="laporan" element={<PetugasLaporan />} />
        </Route>
        
        {/* Sopir routes with Layout */}
        <Route path="/sopir" element={<SopirLayout />}>
          <Route path="dashboard" element={<SopirDashboard />} />
          <Route path="jadwal" element={<SopirJadwal />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
