import React, { useState } from 'react';
import { Search, Bell, Mail, RefreshCw } from 'lucide-react';

export default function Header() {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-2 text-slate-500 font-medium">
        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-md text-sm border border-slate-200">
          TÜRSAB Data Sync: <span className="text-emerald-600 font-bold ml-1">Güncel (17.144 Kayıt)</span>
        </span>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative hidden md:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            className="pl-9 pr-4 py-2 w-64 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 text-slate-700"
            placeholder="Hızlı Arama (Belge No vb.)"
          />
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          
          {showNotifications && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-slate-800">Bildirimler</h3>
                  <span className="text-xs text-blue-600 font-medium cursor-pointer">Tümünü okundu işaretle</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  <div className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-3 cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-700">Toplu e-posta kampanyası <strong>Erken Rezervasyon...</strong> başarıyla gönderildi.</p>
                      <p className="text-xs text-slate-400 mt-1">10 dakika önce</p>
                    </div>
                  </div>
                  <div className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-3 cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-700">Aylık TÜRSAB veritabanı senkronizasyonu tamamlandı. 15 yeni acente eklendi.</p>
                      <p className="text-xs text-slate-400 mt-1">2 gün önce</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
