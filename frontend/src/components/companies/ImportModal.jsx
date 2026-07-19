import { useState, useRef } from 'react';
import { X, UploadCloud, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useCompanyCrm } from '../../context/CompanyCrmContext';

export default function ImportModal({ onClose, companiesMap }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const fileInputRef = useRef(null);
  const { batchPushCrmUpdates } = useCompanyCrm();

  const STATUS_MAP = {
    'Sözleşmeli': 'contracted',
    'İletişime Geçildi': 'contacted',
    'Potansiyel': 'lead',
    'İlgilenmiyor': 'not_interested',
    'Kara Liste': 'blacklisted'
  };

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setError('');
    setPreview(null);
    setSuccess('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        // Preview analysis
        let validCount = 0;
        let notFoundCount = 0;
        let invalidStatusCount = 0;
        const updates = [];

        json.forEach((row) => {
          const tursabNo = row['Vergi No'] || row['TAX_NO'] || row['tax_no'];
          const statusText = row['Durum'] || row['STATUS'] || row['status'];

          if (!tursabNo || !statusText) return;

          // Convert status text back to key
          let statusKey = STATUS_MAP[statusText];
          if (!statusKey && Object.values(STATUS_MAP).includes(statusText)) {
            statusKey = statusText; // Already a valid key
          }

          if (!statusKey) {
            invalidStatusCount++;
            return;
          }

          // Find docId by tax_no from existing companies
          // companiesMap is a mapping we need to pass: { '1234': 'docId' }
          const docId = companiesMap[String(tursabNo)];
          if (docId) {
            validCount++;
            updates.push({ docId, patch: { status: statusKey, lastUpdatedAt: new Date() } });
          } else {
            notFoundCount++;
          }
        });

        if (updates.length === 0) {
          setError('Dosyada geçerli "Vergi No" ve "Durum" sütunu bulunamadı veya eşleşen şirket yok.');
        } else {
          setPreview({ validCount, notFoundCount, invalidStatusCount, updates });
        }

      } catch (err) {
        console.error(err);
        setError('Excel dosyası okunurken hata oluştu. Lütfen formatı kontrol edin.');
      }
    };
    reader.readAsArrayBuffer(uploadedFile);
  };

  const handleImport = async () => {
    if (!preview || preview.updates.length === 0) return;
    setIsImporting(true);
    try {
      await batchPushCrmUpdates(preview.updates);
      setSuccess(`${preview.updates.length} şirketnin durumu başarıyla güncellendi!`);
      setPreview(null);
      setFile(null);
      setTimeout(onClose, 2000);
    } catch (err) {
      console.error(err);
      setError('İçe aktarım sırasında hata oluştu.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 transition-opacity" onClick={!isImporting ? onClose : undefined} />
      
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-xl z-50 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Durum İçe Aktar (Excel)</h2>
          </div>
          <button 
            onClick={onClose}
            disabled={isImporting}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {!file && !success && (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="font-medium text-slate-700">Excel Dosyası Seçin</p>
              <p className="text-xs text-slate-500 mt-1">Sütunlar: "Vergi No" ve "Durum"</p>
            </div>
          )}

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
          />

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2 text-sm text-red-700">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <p className="font-bold text-emerald-800">{success}</p>
            </div>
          )}

          {preview && !success && (
            <div className="mt-2 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Analiz Sonucu</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span className="text-slate-600">Güncellenecek Kayıt:</span>
                    <span className="font-bold text-emerald-600">{preview.validCount}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-slate-600">Bulunamayan Vergi No:</span>
                    <span className="font-medium text-slate-800">{preview.notFoundCount}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-slate-600">Geçersiz Durum:</span>
                    <span className="font-medium text-slate-800">{preview.invalidStatusCount}</span>
                  </li>
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => { setFile(null); setPreview(null); }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
                  disabled={isImporting}
                >
                  İptal
                </button>
                <button
                  onClick={handleImport}
                  disabled={isImporting || preview.updates.length === 0}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  İçeri Aktar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
