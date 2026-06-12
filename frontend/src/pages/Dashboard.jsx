import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Loader2, Users, FileCheck, Building } from 'lucide-react';

export default function Dashboard() {
  const [baseAgencies, setBaseAgencies] = useState([]);
  const [crmData, setCrmData] = useState({});
  const [loading, setLoading] = useState(true);

  // 1. Fetch static JSON data
  useEffect(() => {
    async function fetchBaseData() {
      try {
        setLoading(true);
        const res = await fetch('/agencies.json');
        if (!res.ok) throw new Error('Acente verisi bulunamadı');
        const data = await res.json();
        setBaseAgencies(data);
      } catch (err) {
        console.error('Error fetching static agencies:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchBaseData();
  }, []);

  // 2. Listen to CRM changes
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'agency_crm'),
      (snapshot) => {
        const crmUpdates = {};
        snapshot.forEach((doc) => {
          crmUpdates[doc.id] = doc.data();
        });
        setCrmData(crmUpdates);
      },
      (err) => {
        console.error('Error fetching CRM data:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  // 3. Merge and compute
  const agencies = useMemo(() => {
    if (!baseAgencies.length) return [];
    return baseAgencies.map(agency => ({
      ...agency,
      ...(crmData[agency.docId] || {})
    }));
  }, [baseAgencies, crmData]);

  const metrics = useMemo(() => {
    const total = agencies.length;
    let contracted = 0;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    let addedThisMonth = 0;
    
    const cityCounts = {};
    const statusCounts = {
      lead: 0,
      contacted: 0,
      contracted: 0,
      not_interested: 0,
      blacklisted: 0
    };

    agencies.forEach(a => {
      const status = a.status || 'lead';
      
      if (status === 'contracted') contracted++;
      
      if (statusCounts[status] !== undefined) {
        statusCounts[status]++;
      }
      
      // We don't have created_at for all, so we use CRM notes as a proxy if needed, or assume static data is baseline
      // Let's check if CRM data has a created_at
      if (crmData[a.docId]?.createdAt?.toDate) {
        const d = crmData[a.docId].createdAt.toDate();
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          addedThisMonth++;
        }
      }

      if (a.city) {
        cityCounts[a.city] = (cityCounts[a.city] || 0) + 1;
      }
    });

    const topCities = Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { total, contracted, addedThisMonth, topCities, statusCounts };
  }, [agencies, crmData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)]">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
        <p className="text-slate-500 font-medium">Dashboard verileri yükleniyor...</p>
      </div>
    );
  }

  const { statusCounts } = metrics;
  const statusLabels = {
    lead: { label: 'Potansiyel', color: 'bg-yellow-500' },
    contacted: { label: 'İletişime Geçildi', color: 'bg-blue-500' },
    contracted: { label: 'Sözleşmeli', color: 'bg-emerald-500' },
    not_interested: { label: 'İlgilenmiyor', color: 'bg-red-500' },
    blacklisted: { label: 'Kara Liste', color: 'bg-slate-500' }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-4 bg-blue-50 rounded-xl">
            <Building className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Toplam Acente</p>
            <p className="text-3xl font-bold text-slate-800">{metrics.total.toLocaleString('tr-TR')}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-4 bg-emerald-50 rounded-xl">
            <FileCheck className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Aktif Sözleşmeler</p>
            <p className="text-3xl font-bold text-emerald-600">{metrics.contracted.toLocaleString('tr-TR')}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-4 bg-purple-50 rounded-xl">
            <Users className="w-8 h-8 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Bu Ay Eklenenler</p>
            <p className="text-3xl font-bold text-purple-600">{metrics.addedThisMonth.toLocaleString('tr-TR')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* En Çok Acentesi Olan İller */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">En Çok Acentesi Olan 5 İl</h3>
          <div className="space-y-4">
            {metrics.topCities.map(([city, count], index) => {
              const maxCount = metrics.topCities[0][1];
              const percentage = (count / maxCount) * 100;
              return (
                <div key={city} className="flex items-center gap-3">
                  <div className="w-6 font-semibold text-slate-400 text-sm">{index + 1}.</div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700">{city}</span>
                      <span className="text-slate-500 font-medium">{count.toLocaleString('tr-TR')}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-1000" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Müşteri Durumu Dağılımı */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Müşteri Durumu Dağılımı</h3>
          <div className="space-y-4">
            {Object.entries(statusCounts).map(([statusKey, count]) => {
              if (count === 0 && statusKey !== 'lead') return null; // hide empty statuses except lead
              const percentage = (count / Math.max(metrics.total, 1)) * 100;
              const { label, color } = statusLabels[statusKey];
              return (
                <div key={statusKey}>
                  <div className="flex justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${color}`}></div>
                      <span className="font-medium text-slate-700">{label}</span>
                    </div>
                    <span className="text-slate-500 font-medium">{count.toLocaleString('tr-TR')} ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className={`${color} h-2 rounded-full transition-all duration-1000`} 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
