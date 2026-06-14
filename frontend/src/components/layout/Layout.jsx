import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import OfflineBanner from '../common/OfflineBanner';
import PwaInstallPrompt from '../common/PwaInstallPrompt';
import { navItems } from './navigation';

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <Sidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden lg:ml-64">
        <Header onMenuClick={() => setIsMobileMenuOpen(true)} />
        <main className="app-shell-scroll flex-1 overflow-auto px-4 pb-24 pt-4 sm:px-6 sm:pb-28 sm:pt-6 lg:px-8 lg:pb-8 relative">
          <Outlet />
        </main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex min-w-0 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-colors ${
                    isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                <span className="truncate">{item.name.replace('Saha ', '')}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
      <OfflineBanner />
      <PwaInstallPrompt />
    </div>
  );
}
