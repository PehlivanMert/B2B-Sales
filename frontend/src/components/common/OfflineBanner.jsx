import React from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useCrm } from '../../context/CrmContext';

export default function OfflineBanner() {
  const { isOnline, pendingWritesCount } = useCrm();

  if (isOnline && pendingWritesCount === 0) return null;

  return (
    <div className={`fixed inset-x-4 bottom-24 z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg transition-all duration-300 sm:inset-x-auto sm:right-4 sm:mx-0 lg:bottom-6 ${
      !isOnline
        ? 'bg-red-50 border-red-200 text-red-700'
        : 'bg-emerald-50 border-emerald-200 text-emerald-700'
    }`}>
      {!isOnline ? (
        <>
          <div className="bg-red-100 p-2 rounded-lg">
            <WifiOff className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="font-semibold text-sm">Çevrimdışısınız</p>
            <p className="text-xs opacity-90">
              {pendingWritesCount > 0
                ? `${pendingWritesCount} işlem kuyrukta. Bağlantı gelince senkronize edilecek.`
                : 'Bağlantı koptu. Uygulama çevrimdışı modda çalışıyor.'}
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="bg-emerald-100 p-2 rounded-lg">
            {pendingWritesCount > 0 ? (
              <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin" />
            ) : (
              <Wifi className="w-5 h-5 text-emerald-600" />
            )}
          </div>
          <div>
            <p className="font-semibold text-sm">Bağlantı Kuruldu</p>
            <p className="text-xs opacity-90">
              {pendingWritesCount > 0
                ? `${pendingWritesCount} işlem senkronize ediliyor...`
                : 'Verileriniz güncel.'}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
