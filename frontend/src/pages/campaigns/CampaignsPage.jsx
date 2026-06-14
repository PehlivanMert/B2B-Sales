import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Loader2, Mail, Calendar, Users, FileText, Search, Trash2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null); // campaign whose message is expanded
  const [confirmDeleteId, setConfirmDeleteId] = useState(null); // inline delete confirm

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'campaigns'), orderBy('sentAt', 'desc'));
      const snapshot = await getDocs(q);
      setCampaigns(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error fetching campaigns: ", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'campaigns', id));
      // Lokal state'den sil — Firestore'a read gitmiyor
      setCampaigns(prev => prev.filter(c => c.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      console.error("Error deleting campaign:", err);
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
      <div className="app-content-height flex flex-col items-center justify-center">
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
          <p className="text-sm text-slate-500 mt-1">
            Sistem üzerinden gönderilen tüm toplu mailleri ve detaylarını inceleyin.
            {campaigns.length > 0 && <span className="ml-2 font-medium text-blue-600">{campaigns.length} kampanya</span>}
          </p>
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
          {filteredCampaigns.map(camp => {
            const isExpanded = expandedId === camp.id;
            const isPendingDelete = confirmDeleteId === camp.id;
            const messagePreview = (camp.message || '').length > 120
              ? (camp.message || '').slice(0, 120) + '...'
              : (camp.message || '');

            return (
              <div key={camp.id} className="bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-200 transition-colors">

                {/* Header row */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 p-5">
                  <div className="flex-1 pr-4">
                    <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                      {camp.subject}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-sm text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-slate-400" />
                        Gönderen: <span className="font-medium text-slate-700">{camp.sender}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-700">{camp.recipientCount?.toLocaleString('tr-TR')}</span> alıcı
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {camp.sentAt?.toDate
                          ? new Date(camp.sentAt.toDate()).toLocaleString('tr-TR')
                          : 'Şimdi'}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-400">{camp.authorName || camp.authorEmail}</span>

                    {/* Inline delete confirm */}
                    {isPendingDelete ? (
                      <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-xs text-red-600 font-medium">Silinsin mi?</span>
                        <button
                          onClick={() => handleDelete(camp.id)}
                          className="text-xs text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded transition-colors"
                        >
                          Evet
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs text-slate-500 hover:text-slate-700"
                        >
                          Hayır
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(camp.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Kampanyayı Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Message preview / expand */}
                <div className="px-5 pb-5">
                  <div className="bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
                    <div className="p-3">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {isExpanded ? camp.message : messagePreview}
                      </p>
                    </div>
                    {(camp.message || '').length > 120 && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : camp.id)}
                        className="w-full flex items-center justify-center gap-1 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 border-t border-slate-100 transition-colors"
                      >
                        {isExpanded ? (
                          <><ChevronUp className="w-3.5 h-3.5" /> Kapat</>
                        ) : (
                          <><ChevronDown className="w-3.5 h-3.5" /> Tamamını Göster</>
                        )}
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
