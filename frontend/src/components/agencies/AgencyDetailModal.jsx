import React, { useState, useEffect } from 'react';
import { X, MapPin, Phone, Mail, Building2, Calendar, FileText, Send, CheckCircle2, AlertCircle, XCircle, Trash2 } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';

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
  const { currentUser, userData } = useAuth();
  
  // Current status, defaulting to lead if null
  const currentStatus = agency?.status || 'lead';
  const isAdmin = userData?.role === 'admin';

  // Listen to notes sub-collection
  useEffect(() => {
    if (!agency?.docId) return;

    const q = query(
      collection(db, 'agencies', agency.docId, 'notes'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotes = [];
      snapshot.forEach((doc) => {
        fetchedNotes.push({ id: doc.id, ...doc.data() });
      });
      setNotes(fetchedNotes);
    });

    return () => unsubscribe();
  }, [agency?.docId]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim() || !agency?.docId) return;

    try {
      setIsSubmitting(true);
      await addDoc(collection(db, 'agencies', agency.docId, 'notes'), {
        text: newNote,
        createdAt: serverTimestamp(),
        authorEmail: currentUser?.email,
        authorName: userData?.firstName ? `${userData.firstName} ${userData.lastName}`.trim() : null,
        authorId: currentUser?.uid
      });
      setNewNote('');
    } catch (err) {
      console.error('Error adding note:', err);
      alert('Not eklenirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!agency?.docId || newStatus === currentStatus) return;
    
    try {
      setIsStatusUpdating(true);
      const agencyRef = doc(db, 'agency_crm', agency.docId);
      // Use setDoc with merge: true so we don't overwrite other CRM data like notes array
      await setDoc(agencyRef, { status: newStatus }, { merge: true });
      // Notify parent to update local state if needed
      if(onUpdateStatus) {
        onUpdateStatus(agency.docId, newStatus);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Durum güncellenirken hata oluştu.');
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Bu notu silmek istediğinize emin misiniz?')) return;
    try {
      await deleteDoc(doc(db, 'agencies', agency.docId, 'notes', noteId));
    } catch (err) {
      console.error('Error deleting note:', err);
      alert('Not silinirken hata oluştu.');
    }
  };

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
                        ? `${status.bg} ${status.color} ring-2 ring-offset-1 ring-${status.color.split('-')[1]}-500` 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {status.label}
                  </button>
                )
              })}
            </div>
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
            </h3>
            
            {/* Note Input */}
            <form onSubmit={handleAddNote} className="mb-6">
              <div className="relative">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Görüşme detaylarını buraya yazın..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 pr-12 text-sm min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={!newNote.trim() || isSubmitting}
                  className="absolute right-3 bottom-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Notes List */}
            <div className="flex items-center gap-2 mb-4">
              <input 
                type="checkbox" 
                id="myNotesToggle"
                checked={showOnlyMyNotes}
                onChange={(e) => setShowOnlyMyNotes(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <label htmlFor="myNotesToggle" className="text-sm text-slate-600 cursor-pointer select-none">
                Sadece Benim Notlarımı Göster
              </label>
            </div>
            <div className="space-y-4">
              {notes.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm">
                  Henüz bu acente için not girilmemiş.
                </div>
              ) : (
                notes
                  .filter(n => showOnlyMyNotes ? n.authorId === currentUser?.uid : true)
                  .map(note => (
                  <div key={note.id} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm relative group">
                    {(isAdmin || note.authorId === currentUser?.uid) && (
                      <button 
                        onClick={() => handleDeleteNote(note.id)}
                        className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        title="Notu Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <p className="text-sm text-slate-700 whitespace-pre-wrap pr-6">{note.text}</p>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-500">
                          {note.authorName ? note.authorName.charAt(0).toUpperCase() : note.authorEmail.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-slate-600">{note.authorName || note.authorEmail}</span>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Calendar className="w-3 h-3" />
                        {note.createdAt?.toDate ? new Date(note.createdAt.toDate()).toLocaleString('tr-TR', {
                          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        }) : 'Şimdi'}
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
