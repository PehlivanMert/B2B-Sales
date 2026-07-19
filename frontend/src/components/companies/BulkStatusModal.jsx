import { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Mail, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCompanyCrm } from '../../context/CompanyCrmContext';

const STATUS_OPTIONS = [
  { value: 'lead', label: 'Lead (Potansiyel)', icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-100 border-yellow-200' },
  { value: 'contacted', label: 'İletişime Geçildi', icon: Mail, color: 'text-blue-600', bg: 'bg-blue-100 border-blue-200' },
  { value: 'contracted', label: 'Sözleşmeli', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100 border-emerald-200' },
  { value: 'not_interested', label: 'İlgilenmiyor', icon: XCircle, color: 'text-red-600', bg: 'bg-red-100 border-red-200' },
  { value: 'blacklisted', label: 'Kara Liste', icon: X, color: 'text-slate-600', bg: 'bg-slate-200 border-slate-300' },
];

export default function BulkStatusModal({ selectedCompanies, onClose }) {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const { currentUser, userData } = useAuth();
  const { batchPushCrmUpdates } = useCompanyCrm();
  
  const authorName = userData?.firstName 
    ? `${userData.firstName} ${userData.lastName || ''}`.trim() 
    : currentUser?.email;

  const handleUpdate = async () => {
    if (!selectedStatus || selectedCompanies.length === 0) return;

    try {
      setIsUpdating(true);
      const now = new Date();
      
      const entries = selectedCompanies.map(company => ({
        docId: company.docId,
        patch: {
          status: selectedStatus,
          lastUpdatedBy: authorName,
          lastUpdatedByEmail: currentUser?.email,
          lastUpdatedAt: now // IndexedDB serialization uyumlu
        }
      }));

      await batchPushCrmUpdates(entries);
      
      onClose();
    } catch (err) {
      console.error('Error updating bulk status:', err);
      alert('Toplu durum güncellemesi sırasında bir hata oluştu.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 transition-opacity" onClick={!isUpdating ? onClose : undefined} />
      
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-xl z-50 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Toplu Durum Güncelle</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              <strong className="text-slate-700">{selectedCompanies.length}</strong> şirket seçildi
            </p>
          </div>
          <button 
            onClick={onClose}
            disabled={isUpdating}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-slate-600 mb-4">
            Seçili {selectedCompanies.length} şirketnin durumunu tek seferde değiştirebilirsiniz. Bu işlem geri alınamaz.
          </p>

          <div className="grid grid-cols-1 gap-2">
            {STATUS_OPTIONS.map(status => {
              const Icon = status.icon;
              const isSelected = selectedStatus === status.value;
              return (
                <button
                  key={status.value}
                  onClick={() => setSelectedStatus(status.value)}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-medium transition-all ${
                    isSelected
                      ? `${status.bg} ${status.color} ring-2 ring-${status.color.split('-')[1]}-500 border-transparent`
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {status.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isUpdating}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            İptal
          </button>
          <button
            onClick={handleUpdate}
            disabled={!selectedStatus || isUpdating}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
            {isUpdating ? 'Güncelleniyor...' : 'Güncelle'}
          </button>
        </div>
      </div>
    </>
  );
}
