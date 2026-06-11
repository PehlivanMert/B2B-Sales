import React from 'react';
import { NavLink } from 'react-router-dom';
import { Building2, LayoutDashboard, Map, Users, Settings, LogOut, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Acenteler', path: '/agencies', icon: Users },
  { name: 'Saha Haritası', path: '/map', icon: Map },
  { name: 'Kampanyalar', path: '/campaigns', icon: Mail },
  { name: 'Ayarlar', path: '/settings', icon: Settings },
];

export default function Sidebar() {
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
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 text-slate-300">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <span className="text-xl font-bold text-white tracking-tight">B2B CRM</span>
      </div>

      <div className="px-6 pb-4">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Ana Menü
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive 
                    ? 'bg-blue-600/10 text-blue-400 font-medium' 
                    : 'hover:bg-slate-900 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-500' : 'text-slate-400 group-hover:text-white transition-colors'}`} />
                  {item.name}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-900 rounded-xl p-4 mb-4 border border-slate-800/50">
          <p className="text-sm font-medium text-white truncate" title={displayName}>
            {displayName}
          </p>
          <p className="text-xs text-slate-500 mt-1">{getRoleLabel(userData?.role)}</p>
        </div>
        
        <button
          onClick={() => logout()}
          className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Oturumu Kapat
        </button>
      </div>
    </aside>
  );
}
