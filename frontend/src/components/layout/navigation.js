import {
  LayoutDashboard,
  Users,
  Map,
  Mail,
  Settings,
  Building2
} from 'lucide-react';

export const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Acenteler', path: '/agencies', icon: Users },
  { name: 'Şirketler', path: '/companies', icon: Building2 },
  { name: 'Saha Haritası', path: '/map', icon: Map },
  { name: 'Ayarlar', path: '/settings', icon: Settings },
];
