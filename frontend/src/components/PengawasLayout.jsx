import { LayoutDashboard, MessageSquareWarning, CalendarDays } from 'lucide-react';
import PanelLayout from './PanelLayout';

const MENU = [
  { to: '/pengawas/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/pengawas/laporan', label: 'Pemantauan Laporan', Icon: MessageSquareWarning },
  { to: '/pengawas/jadwal', label: 'Jadwal Pengangkutan', Icon: CalendarDays },
];

export default function PengawasLayout() {
  return <PanelLayout judulMenu="Pengawas Bidang" menu={MENU} />;
}
