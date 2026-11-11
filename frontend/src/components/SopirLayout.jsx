import { LayoutDashboard, ClipboardCheck, MessageSquareWarning } from 'lucide-react';
import PanelLayout from './PanelLayout';

const MENU = [
  { to: '/sopir/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/sopir/jadwal', label: 'Jadwal & Armada', Icon: ClipboardCheck },
  { to: '/sopir/laporan', label: 'Laporan Masyarakat', Icon: MessageSquareWarning },
];

export default function SopirLayout() {
  return <PanelLayout judulMenu="Sopir" menu={MENU} />;
}
