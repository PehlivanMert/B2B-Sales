import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import AgencyTable from '../../components/agencies/AgencyTable';
import { Loader2 } from 'lucide-react';

export default function AgenciesPage() {
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchAgencies() {
      try {
        setLoading(true);
        // We fetch all agencies for client-side filtering and virtualized display
        // Since there are ~17k docs, this takes one big read initially.
        // In a real prod environment we might want to store this as a compressed JSON 
        // in Firebase Storage to save reads, but Firestore can handle this easily for internal usage.
        const q = query(collection(db, 'agencies'), orderBy('id', 'asc'));
        const querySnapshot = await getDocs(q);
        
        const fetchedAgencies = [];
        querySnapshot.forEach((doc) => {
          fetchedAgencies.push({ ...doc.data(), docId: doc.id });
        });
        
        setAgencies(fetchedAgencies);
      } catch (err) {
        console.error('Error fetching agencies:', err);
        setError('Veriler yüklenirken bir hata oluştu. Lütfen Firebase bağlantınızı kontrol edin.');
      } finally {
        setLoading(false);
      }
    }

    fetchAgencies();
  }, []);

  if (loading) {
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
