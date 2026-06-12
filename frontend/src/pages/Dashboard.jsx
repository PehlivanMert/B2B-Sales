import React, { useMemo } from 'react';
import { useCrm } from '../context/CrmContext';
import { useAgencies } from '../context/AgenciesContext';
import { Loader2, Users, FileCheck, Building, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function Dashboard() {
  const { crmData, crmLoading } = useCrm();
  const { agencies: baseAgencies, agenciesLoading } = useAgencies();

  // Merge static agency data with live CRM data
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
    // Count agencies that had a CRM status update this month
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    let updatedThisMonth = 0;

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

      // Count agencies whose CRM record was updated this month
      if (a.lastUpdatedAt?.toDate) {
        const d = a.lastUpdatedAt.toDate();
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          updatedThisMonth++;
        }
      }

      if (a.city) {
        cityCounts[a.city] = (cityCounts[a.city] || 0) + 1;
      }
    });

    const topCities = Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { total, contracted, updatedThisMonth, topCities, statusCounts };
  }, [agencies]);

  if (agenciesLoading || crmLoading) {
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
            <p className="text-sm font-medium text-slate-500 mb-1">Bu Ay Güncellenenler</p>
            <p className="text-3xl font-bold text-purple-600">{metrics.updatedThisMonth.toLocaleString('tr-TR')}</p>
            <p className="text-xs text-slate-400 mt-1">CRM kaydı güncellenen acente</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* En Çok Acentesi Olan İller */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">En Çok Acentesi Olan 5 İl</h3>
          <div className="h-72 w-full mt-4" style={{ minWidth: 0, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={metrics.topCities.map(([city, count]) => ({ city, count }))}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" />
                <YAxis dataKey="city" type="category" width={80} />
                <RechartsTooltip cursor={{fill: '#f1f5f9'}} formatter={(value) => value.toLocaleString('tr-TR')} />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Müşteri Durumu Dağılımı */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Müşteri Durumu Dağılımı</h3>
          <div className="h-72 w-full mt-4" style={{ minWidth: 0, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={Object.entries(statusCounts).map(([key, value]) => ({ name: statusLabels[key].label, value, color: statusLabels[key].color.replace('bg-', '') }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {Object.entries(statusCounts).map(([key, value], index) => {
                    const colors = {
                      lead: '#eab308',
                      contacted: '#3b82f6',
                      contracted: '#10b981',
                      not_interested: '#ef4444',
                      blacklisted: '#64748b'
                    };
                    return <Cell key={`cell-${index}`} fill={colors[key]} />;
                  })}
                </Pie>
                <RechartsTooltip formatter={(value) => value.toLocaleString('tr-TR')} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
