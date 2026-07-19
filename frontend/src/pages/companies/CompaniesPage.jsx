import { useMemo } from 'react';
import { useCompanyCrm } from '../../context/CompanyCrmContext';
import { useCompanies } from '../../context/CompaniesContext';
import CompanyTable from '../../components/companies/CompanyTable';
import { Loader2 } from 'lucide-react';

export default function CompaniesPage() {
  const { crmData, crmLoading, error: crmError } = useCompanyCrm();
  const { companies: baseCompanies, companiesLoading, error: companiesError } = useCompanies();
  const error = crmError || companiesError;

  // Merge Base Data + CRM Data
  const companies = useMemo(() => {
    if (!baseCompanies.length) return [];
    return baseCompanies.map(company => ({
      ...company,
      ...(crmData[company.docId] || {})
    }));
  }, [baseCompanies, crmData]);

  if (companiesLoading || crmLoading) {
    return (
      <div className="app-content-height flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
        <p className="text-slate-500 font-medium">Şirket verileri yükleniyor... (Bu işlem ilk seferde biraz sürebilir)</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-content-height flex flex-col items-center justify-center">
        <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-200 text-center max-w-lg">
          <p className="font-semibold mb-2">Hata Oluştu</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Sanayi Şirketleri</h1>
          <p className="text-sm text-slate-500 mt-1">Sistemdeki tüm kayıtlı sanayi şirketlerini filtreleyin ve yönetin.</p>
        </div>
      </div>

      {/* The table will take up the remaining height and scroll internally */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
        <CompanyTable data={companies} />
      </div>
    </div>
  );
}
