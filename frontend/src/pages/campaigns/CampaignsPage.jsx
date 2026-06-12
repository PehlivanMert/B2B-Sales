import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Loader2, Mail, Calendar, Users, FileText, Search, Trash2 } from 'lucide-react';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'campaigns'), orderBy('sentAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = [];
      snapshot.forEach(doc => {
        fetched.push({ id: doc.id, ...doc.data() });
      });
      setCampaigns(fetched);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching campaigns: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Bu kampanyayı silmek istediğininze emin misiniz?")) return;
    try {
      await deleteDoc(doc(db, 'campaigns', id));
    } catch (err) {
      console.error("Error deleting campaign:", err);
      alert("Silinirken hata oluştu.");
    }
  };

  const filteredCampaigns = campaigns.filter(c => {
    const search = searchTerm.toLowerCase();
    return (c.subject || '').toLowerCase().includes(search) || 
           (c.sender || '').toLowerCase().includes(search) ||
           (c.authorName || c.authorEmail || '').toLowerCase().includes(search);
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-slate-500">Kampanyalar yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">E-posta Kampanya Geçmişi</h1>
          <p className="text-sm text-slate-500 mt-1">Sistem üzerinden gönderilen tüm toplu mailleri ve detaylarını inceleyin.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full md:w-64 bg-white"
            placeholder="Konu veya gönderen ara..."
          />
        </div>
      </div>

      {filteredCampaigns.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <Mail className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">Sonuç bulunamadı</h3>
          <p className="text-slate-500 mt-1">Arama kriterlerinize veya sistemde kayıtlı kampanyalara uygun veri yok.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredCampaigns.map(camp => (
            <div key={camp.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-blue-200 transition-colors relative group">
              <button 
                onClick={() => handleDelete(camp.id)}
                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                title="Kampanyayı Sil"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1 pr-12">
                  <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                    {camp.subject}
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-sm text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-slate-400" />
                      Gönderen: <span className="font-medium text-slate-700">{camp.sender}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-slate-400" />
                      Alıcı Sayısı: <span className="font-medium text-slate-700">{camp.recipientCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      Tarih: <span className="font-medium text-slate-700">
                        {camp.sentAt?.toDate ? new Date(camp.sentAt.toDate()).toLocaleString('tr-TR') : 'Şimdi'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{camp.message}</p>
                  </div>
                </div>
                
                <div className="text-right text-xs text-slate-400 pt-1">
                  İşlemi Yapan:<br/>
                  <span className="font-medium text-slate-600">{camp.authorName || camp.authorEmail}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
