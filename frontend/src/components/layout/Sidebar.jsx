import { NavLink } from 'react-router-dom';
import { Building2, LogOut, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { navItems } from './navigation';

export default function Sidebar({ isMobileOpen = false, onClose = () => {} }) {
  const { logout, currentUser, userData } = useAuth();
  
  const getRoleLabel = (role) => {
    switch(role) {
      case 'admin': return 'Yönetici (Admin)';
      case 'manager': return 'Müdür';
      default: return 'Satış Temsilcisi';
    }
  };

  const displayName = userData?.firstName 
    ? `${userData.firstName} ${userData.lastName || ''}`.trim() 
    : (currentUser?.email || 'Kullanıcı');

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          isMobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed left-0 top-0 z-40 flex h-dvh w-72 max-w-[86vw] flex-col border-r border-slate-800 bg-slate-950 text-slate-300 shadow-2xl transition-transform duration-300 lg:w-64 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="p-5 sm:p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-lg font-bold tracking-tight text-white sm:text-xl">B2B CRM</span>
            <span className="text-xs text-slate-500">Turizm saha operasyonları</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-900 hover:text-white lg:hidden"
            aria-label="Menüyü kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 pb-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Ana Menü
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto pb-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all duration-200 group ${
                    isActive
                      ? 'bg-blue-600/10 text-blue-400 font-medium ring-1 ring-blue-500/20'
                      : 'hover:bg-slate-900 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`h-5 w-5 ${isActive ? 'text-blue-500' : 'text-slate-400 group-hover:text-white transition-colors'}`} />
                    {item.name}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="mb-4 rounded-2xl border border-slate-800/50 bg-slate-900 p-4">
            <p className="truncate text-sm font-medium text-white" title={displayName}>
              {displayName}
            </p>
            <p className="mt-1 text-xs text-slate-500">{getRoleLabel(userData?.role)}</p>
          </div>

          <button
            onClick={() => logout()}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Oturumu Kapat
          </button>
        </div>
      </aside>
    </>
  );
}
