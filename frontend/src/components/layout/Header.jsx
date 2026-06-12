import React, { useState, useEffect } from 'react';
import { Search, Bell, Mail, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';

export default function Header() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser?.uid) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
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
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleNotificationClick = async (n) => {
    if (!n.isRead) {
      try {
        await updateDoc(doc(db, 'notifications', n.id), { isRead: true });
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
  };

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
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>
          
          {showNotifications && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-slate-800">Bildirimler {unreadCount > 0 && `(${unreadCount})`}</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={handleMarkAllRead}
                      className="text-xs text-blue-600 font-medium hover:text-blue-700 transition-colors"
                    >
                      Tümünü okundu işaretle
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-sm">
                      Henüz bildiriminiz yok.
                    </div>
                  ) : (
                    notifications.map(notification => (
                      <div 
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-3 cursor-pointer group ${notification.isRead ? 'opacity-70' : 'bg-blue-50/30'}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          notification.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${notification.isRead ? 'text-slate-600' : 'text-slate-800 font-medium'}`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {notification.createdAt?.toDate ? new Date(notification.createdAt.toDate()).toLocaleString('tr-TR') : 'Şimdi'}
                          </p>
                        </div>
                        <button 
                          onClick={(e) => handleDelete(e, notification.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 rounded-lg transition-all shrink-0 self-start"
                        >
                          <X className="w-4 h-4" />
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
    </header>
  );
}
