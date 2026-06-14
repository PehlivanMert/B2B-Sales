import { useState, useEffect, useRef } from 'react';
import { X, MapPin, Phone, Mail, Building2, Calendar, FileText, Send, CheckCircle2, AlertCircle, XCircle, Trash2, Search, Clock, } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useCrm } from '../../context/CrmContext';

const STATUS_OPTIONS = [
  { value: 'lead', label: 'Lead (Potansiyel)', icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-100 border-yellow-200' },
  { value: 'contacted', label: 'İletişime Geçildi', icon: Mail, color: 'text-blue-600', bg: 'bg-blue-100 border-blue-200' },
  { value: 'contracted', label: 'Sözleşmeli', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100 border-emerald-200' },
  { value: 'not_interested', label: 'İlgilenmiyor', icon: XCircle, color: 'text-red-600', bg: 'bg-red-100 border-red-200' },
  { value: 'blacklisted', label: 'Kara Liste', icon: X, color: 'text-slate-600', bg: 'bg-slate-200 border-slate-300' },
];

export default function AgencyDetailModal({ agency, onClose, onUpdateStatus }) {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [showOnlyMyNotes, setShowOnlyMyNotes] = useState(false);
  const [noteSearch, setNoteSearch] = useState('');
  const [noteError, setNoteError] = useState('');
  const [statusError, setStatusError] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  // Canlı CRM durumu — modal açıkken tek belge dinlenir (çok ucuz: 1 okuma/değişiklik)
  const [liveData, setLiveData] = useState(null);
  // Başka kullanıcı değiştirdiyse gösterilecek uyarı
  const [conflictWarning, setConflictWarning] = useState(null);
  // Modal açılırken başlangıç durumunu sakla (conflict tespiti için)
  const openedStatusRef = useRef(agency?.status || 'lead');

  const { currentUser, userData } = useAuth();
  const { pushCrmUpdate } = useCrm();

  // Canlı veri varsa onu, yoksa prop'tan gelen veriyi kullan
  const currentStatus = liveData?.status ?? agency?.status ?? 'lead';
  const liveLastUpdatedBy = liveData?.lastUpdatedBy ?? agency?.lastUpdatedBy;
  const liveLastUpdatedAt = liveData?.lastUpdatedAt ?? agency?.lastUpdatedAt;

  const isAdmin = userData?.role === 'admin';
  const authorName = userData?.firstName
    ? `${userData.firstName} ${userData.lastName || ''}`.trim()
    : currentUser?.email;

  // ── Canlı CRM durumu (tek belge onSnapshot) ─────────────────────────────
  // Modal açıkken sadece bu acente'nin agency_crm belgesi dinlenir.
  // Maliyet: 1 read/değişiklik — 18k koleksiyondan bağımsız.
  // Fayda: Başka kullanıcı aynı anda değiştirirse anında görünür.
  useEffect(() => {
    if (!agency?.docId) return;
    const crmRef = doc(db, 'agency_crm', agency.docId);
    const unsub = onSnapshot(crmRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setLiveData(data);

      // Conflict tespiti: modal açılırken başlangıç durumu değiştiyse
      // VE değişikliği yapan bu kullanıcı değilse uyar
      const changedByOther =
        data.lastUpdatedByEmail &&
        data.lastUpdatedByEmail !== currentUser?.email &&
        data.status !== openedStatusRef.current;

      if (changedByOther) {
        setConflictWarning({
          newStatus: data.status,
          by: data.lastUpdatedBy || data.lastUpdatedByEmail,
        });
      }
    });
    return () => unsub();
  }, [agency?.docId, currentUser?.email]);

  // ── Notlar (agency_crm/{docId}/notes) ───────────────────────────────────
  useEffect(() => {
    if (!agency?.docId) return;
    const q = query(
      collection(db, 'agency_crm', agency.docId, 'notes'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [agency?.docId]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim() || !agency?.docId) return;
    setNoteError('');
    try {
      setIsSubmitting(true);
      await addDoc(collection(db, 'agency_crm', agency.docId, 'notes'), {
        text: newNote,
        createdAt: serverTimestamp(),
        authorEmail: currentUser?.email,
        authorName,
        authorId: currentUser?.uid
      });
      setNewNote('');
    } catch (err) {
      console.error('Error adding note:', err);
      setNoteError('Not eklenirken bir hata oluştu. Tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Durum Değiştirme ─────────────────────────────────────────────────────
  const handleStatusChange = async (newStatus) => {
    if (!agency?.docId || newStatus === currentStatus) return;
    setStatusError('');
    setConflictWarning(null); // Conflict uyarısını temizle
    try {
      setIsStatusUpdating(true);
      const patch = {
        status: newStatus,
        lastUpdatedBy: authorName,
        lastUpdatedByEmail: currentUser?.email,
        lastUpdatedAt: new Date() // IndexedDB serialization uyumlu
      };
      
      // openedStatusRef'i güncelle — bundan sonraki değişiklik tespiti için
      openedStatusRef.current = newStatus;

      // Global state + IndexedDB patch + Firestore yazma (veya çevrimdışı kuyruğu)
      await pushCrmUpdate(agency.docId, patch);
      
      if (onUpdateStatus) onUpdateStatus(agency.docId, newStatus);
    } catch (error) {
      console.error('Error updating status:', error);
      setStatusError('Durum güncellenirken hata oluştu.');
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await deleteDoc(doc(db, 'agency_crm', agency.docId, 'notes', noteId));
      setPendingDeleteId(null);
    } catch (err) {
      console.error('Error deleting note:', err);
      setPendingDeleteId(null);
    }
  };

  // Filtered + searched notes
  const visibleNotes = notes
    .filter(n => showOnlyMyNotes ? n.authorId === currentUser?.uid : true)
    .filter(n => noteSearch
      ? n.text?.toLowerCase().includes(noteSearch.toLowerCase()) ||
        n.authorName?.toLowerCase().includes(noteSearch.toLowerCase())
      : true
    );

  if (!agency) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />

      {/* Slide-over Panel */}
      <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out border-l border-slate-200">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800 line-clamp-1">{agency.name}</h2>
            <p className="text-sm text-slate-500 mt-0.5">TÜRSAB No: {agency.tursab_no}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">

          {/* Status Updater */}
          <section>
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-3">Müşteri Durumu</h3>

            {/* ⚠️ Conflict Banner — başka kullanıcı aynı anda değiştirdi */}
            {conflictWarning && (
              <div className="mb-3 flex items-start gap-2 bg-amber-50 border border-amber-300 text-amber-800 px-3 py-2.5 rounded-xl text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <p className="font-semibold">Eş zamanlı düzenlenme tespit edildi!</p>
                  <p className="mt-0.5">
                    <span className="font-medium">{conflictWarning.by}</span> bu acente'nin durumunu
                    {' '}<span className="font-bold">{STATUS_OPTIONS.find(s => s.value === conflictWarning.newStatus)?.label ?? conflictWarning.newStatus}</span>{' '}
                    olarak güncelledi. Aşağıdaki durum otomatik yenilendi.
                  </p>
                  <button
                    onClick={() => setConflictWarning(null)}
                    className="mt-1.5 text-amber-700 underline text-[11px]"
                  >
                    Uyardıyı Kapat
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(status => {
                const isSelected = currentStatus === status.value;
                const Icon = status.icon;
                return (
                  <button
                    key={status.value}
                    onClick={() => handleStatusChange(status.value)}
                    disabled={isStatusUpdating}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      isSelected
                        ? `${status.bg} ${status.color} ring-2 ring-offset-1`
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {status.label}
                  </button>
                );
              })}
            </div>
            {statusError && (
              <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {statusError}
              </p>
            )}
            {/* Audit trail — canlı veri (liveLastUpdatedBy) kullanılır */}
            {liveLastUpdatedBy && (
              <p className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Son güncelleme: <span className="font-medium text-slate-500">{liveLastUpdatedBy}</span>
                {liveLastUpdatedAt?.toDate && (
                  <> — {new Date(liveLastUpdatedAt.toDate()).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</>
                )}
              </p>
            )}
          </section>

          {/* Agency Details */}
          <section className="bg-slate-50 rounded-xl p-5 border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">Acente Bilgileri</h3>
            <div className="space-y-4">
              <div className="flex gap-3 text-sm">
                <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
                <div className="text-slate-600">
                  <p className="font-medium text-slate-800">{agency.city} / {agency.district}</p>
                  <p className="mt-0.5">{agency.address}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-5 h-5 text-slate-400 shrink-0" />
                <span className="text-slate-700 font-medium">{agency.phone || 'Belirtilmemiş'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-5 h-5 text-slate-400 shrink-0" />
                <span className="text-slate-700 font-medium">{agency.email || 'Belirtilmemiş'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="w-5 h-5 text-slate-400 shrink-0" />
                <span className="text-slate-700 font-medium text-xs bg-white px-2 py-1 rounded border border-slate-200">
                  BTK: {agency.btk || 'Bilinmiyor'}
                </span>
              </div>
            </div>
          </section>

          {/* Notes Section */}
          <section className="flex-1 flex flex-col">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Satış Notları
              {notes.length > 0 && (
                <span className="ml-auto text-xs font-normal text-slate-400">{notes.length} not</span>
              )}
            </h3>

            {/* Note Input */}
            <form onSubmit={handleAddNote} className="mb-4">
              <div className="relative">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Görüşme detaylarını buraya yazın..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 pr-12 text-sm min-h-[90px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={!newNote.trim() || isSubmitting}
                  className="absolute right-3 bottom-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              {noteError && (
                <p className="mt-1.5 text-xs text-red-600">{noteError}</p>
              )}
            </form>

            {/* Note Filters */}
            {notes.length > 0 && (
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    value={noteSearch}
                    onChange={e => setNoteSearch(e.target.value)}
                    placeholder="Notlarda ara..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/30 bg-white"
                  />
                </div>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none shrink-0">
                  <input
                    type="checkbox"
                    checked={showOnlyMyNotes}
                    onChange={e => setShowOnlyMyNotes(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300"
                  />
                  Sadece Benimkiler
                </label>
              </div>
            )}

            {/* Notes List */}
            <div className="space-y-4">
              {visibleNotes.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm">
                  {noteSearch ? 'Arama kriterine uygun not bulunamadı.' : 'Henüz not girilmemiş.'}
                </div>
              ) : (
                visibleNotes.map(note => (
                  <div key={note.id} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm relative group">

                    {/* Inline delete confirm */}
                    {(isAdmin || note.authorId === currentUser?.uid) && (
                      pendingDeleteId === note.id ? (
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white border border-red-200 rounded-lg px-2 py-1 shadow-sm z-10">
                          <span className="text-xs text-red-600 font-medium">Silinsin mi?</span>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-xs text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded transition-colors"
                          >
                            Evet
                          </button>
                          <button
                            onClick={() => setPendingDeleteId(null)}
                            className="text-xs text-slate-500 hover:text-slate-700 px-1"
                          >
                            Hayır
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setPendingDeleteId(note.id)}
                          className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          title="Notu Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )
                    )}

                    <p className="text-sm text-slate-700 whitespace-pre-wrap pr-6">{note.text}</p>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-500">
                          {(note.authorName || note.authorEmail || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-slate-600">{note.authorName || note.authorEmail}</span>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Calendar className="w-3 h-3" />
                        {note.createdAt?.toDate
                          ? new Date(note.createdAt.toDate()).toLocaleString('tr-TR', {
                            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })
                          : 'Şimdi'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>
      </div>
    </>
  );
}
