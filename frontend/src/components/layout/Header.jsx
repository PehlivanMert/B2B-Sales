import { useState, useEffect } from 'react';
import { Search, Bell, Mail, RefreshCw, X, CheckCircle2, Menu } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, writeBatch, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useCrm } from '../../context/CrmContext';

export default function Header({ onMenuClick }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications]         = useState([]);
  const [isRefreshing, setIsRefreshing]           = useState(false);
  const { currentUser } = useAuth();
  const { syncInfo, refreshCrmData, crmLoading }  = useCrm();

  // Son sync’ten kaç dakika geçtiği (her dakika güncellenir)
  const [syncAgo, setSyncAgo] = useState('');
  useEffect(() => {
    function compute() {
      if (!syncInfo?.time) { setSyncAgo(''); return; }
      const mins = Math.floor((Date.now() - syncInfo.time) / 60000);
      setSyncAgo(mins < 1 ? 'az önce' : `${mins} dk önce`);
    }
    compute();
    const id = setInterval(compute, 60_000);
    return () => clearInterval(id);
  }, [syncInfo]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshCrmData();
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (!currentUser?.uid) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = [];
      snapshot.forEach(doc => {
        fetched.push({ id: doc.id, ...doc.data() });
      });
      setNotifications(fetched);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    try {
      const batch = writeBatch(db);
      notifications.filter(n => !n.isRead).forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { isRead: true });
      });
      await batch.commit();
      // Lokal state aninda guncelle
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'notifications', id));
      // Lokal state'den aninda kaldir
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleNotificationClick = async (n) => {
    if (!n.isRead) {
      try {
        await updateDoc(doc(db, 'notifications', n.id), { isRead: true });
        // Lokal state'i aninda guncelle
        setNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, isRead: true } : notif));
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3 text-slate-500 font-medium">
          <button
            type="button"
            onClick={onMenuClick}
            className="rounded-2xl border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden browser-only"
            aria-label="Menüyü aç"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 sm:text-sm">
          TÜRSAB Data Sync: <span className="text-emerald-600 font-bold ml-1">Güncel (17.144 Kayıt)</span>
            </span>

            {crmLoading ? (
              <span className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-700">
                <RefreshCw className="h-3 w-3 animate-spin" />
                CRM yükleniyor...
              </span>
            ) : syncInfo ? (
              <span
                className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700"
                title={`Son sync: ${new Date(syncInfo.time).toLocaleTimeString('tr-TR')}`}
              >
                <CheckCircle2 className="h-3 w-3" />
                CRM sync{syncAgo ? `: ${syncAgo}` : ''}
                {syncInfo.delta > 0 && <span className="ml-1 font-bold">({syncInfo.delta} Δ)</span>}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end sm:gap-4">
          <div className="relative hidden md:block">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              className="w-56 rounded-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-700 transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 lg:w-64"
              placeholder="Hızlı Arama (Belge No vb.)"
            />
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing || crmLoading}
            title="CRM verisini Firestore'dan yenile"
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500"></span>
              )}
            </button>

            {showNotifications && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-0 z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                    <h3 className="text-sm font-semibold text-slate-800">Bildirimler {unreadCount > 0 && `(${unreadCount})`}</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-700"
                      >
                        Tümünü okundu işaretle
                      </button>
                    )}
                  </div>
                  <div className="max-h-[65vh] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-sm text-slate-500">
                        Henüz bildiriminiz yok.
                      </div>
                    ) : (
                      notifications.map(notification => (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`group flex cursor-pointer gap-3 border-b border-slate-50 p-4 transition-colors hover:bg-slate-50 ${notification.isRead ? 'opacity-70' : 'bg-blue-50/30'}`}
                        >
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            notification.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {notification.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm ${notification.isRead ? 'text-slate-600' : 'font-medium text-slate-800'}`}>
                              {notification.title}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                              {notification.message}
                            </p>
                            <p className="mt-1 text-[10px] text-slate-400">
                              {notification.createdAt?.toDate ? new Date(notification.createdAt.toDate()).toLocaleString('tr-TR') : 'Şimdi'}
                            </p>
                          </div>
                          <button
                            onClick={(e) => handleDelete(e, notification.id)}
                            className="self-start rounded-lg p-1.5 text-slate-300 transition-all hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
