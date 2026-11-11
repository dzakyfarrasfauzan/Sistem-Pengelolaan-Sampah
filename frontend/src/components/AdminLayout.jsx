import { LayoutDashboard, Trash2, Truck, Users, CalendarDays, Route as IconJalur, MessageSquareWarning, ClipboardCheck } from 'lucide-react';
import PanelLayout from './PanelLayout';

const MENU = [
  { to: '/admin/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/admin/laporan-masyarakat', label: 'Laporan Masyarakat', Icon: MessageSquareWarning },
  { to: '/admin/jadwal', label: 'Jadwal', Icon: CalendarDays },
  { to: '/admin/jalur', label: 'Jalur Layanan', Icon: IconJalur },
  { to: '/admin/tps', label: 'Data TPS', Icon: Trash2 },
  { to: '/admin/kendaraan', label: 'Kendaraan', Icon: Truck },
  { to: '/admin/petugas', label: 'Petugas Operasional', Icon: Users },
  { to: '/admin/pemeriksaan-kendaraan', label: 'Pemeriksaan Armada', Icon: ClipboardCheck },
];

export default function AdminLayout() {
  return <PanelLayout judulMenu="Admin Korwil" menu={MENU} />;
}
