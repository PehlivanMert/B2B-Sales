import React, { useMemo } from 'react';
import { useCrm } from '../../context/CrmContext';
import { useAgencies } from '../../context/AgenciesContext';
import AgencyTable from '../../components/agencies/AgencyTable';
import { Loader2 } from 'lucide-react';

export default function AgenciesPage() {
  const { crmData, crmLoading } = useCrm();
  const { agencies: baseAgencies, agenciesLoading } = useAgencies();

  // Merge Base Data + CRM Data
  const agencies = useMemo(() => {
    if (!baseAgencies.length) return [];
    return baseAgencies.map(agency => ({
      ...agency,
      ...(crmData[agency.docId] || {})
    }));
  }, [baseAgencies, crmData]);

  if (agenciesLoading || crmLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)]">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
        <p className="text-slate-500 font-medium">Acente verileri yükleniyor... (Bu işlem ilk seferde biraz sürebilir)</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)]">
        <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-200 text-center max-w-lg">
          <p className="font-semibold mb-2">Hata Oluştu</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">TÜRSAB Acenteleri</h1>
          <p className="text-sm text-slate-500 mt-1">Sistemdeki tüm kayıtlı seyahat acentelerini filtreleyin ve yönetin.</p>
        </div>
      </div>

      {/* The table will take up the remaining height and scroll internally */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <AgencyTable data={agencies} />
      </div>
    </div>
  );
}
