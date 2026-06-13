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
    const repStatsMap = {}; // Temsilci bazlı istatistikler

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

          // Temsilci analitiği
          if (a.lastUpdatedBy) {
            const rep = a.lastUpdatedBy;
            if (!repStatsMap[rep]) {
              repStatsMap[rep] = { name: rep, total: 0, lead: 0, contacted: 0, contracted: 0, not_interested: 0, blacklisted: 0 };
            }
            repStatsMap[rep].total++;
            if (repStatsMap[rep][status] !== undefined) {
              repStatsMap[rep][status]++;
            }
          }
        }
      }

      if (a.city) {
        cityCounts[a.city] = (cityCounts[a.city] || 0) + 1;
      }
    });

    const topCities = Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topReps = Object.values(repStatsMap).sort((a, b) => b.total - a.total);

    return { total, contracted, updatedThisMonth, topCities, statusCounts, topReps };
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

      {/* Satış Temsilcisi Performansı (Bu Ay) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Satış Temsilcisi Performansı (Bu Ay)</h3>
        {metrics.topReps.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">Bu ay henüz işlem yapılmamış.</p>
        ) : (
          <div className="h-80 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={metrics.topReps}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip cursor={{ fill: '#f1f5f9' }} />
                <Legend />
                <Bar dataKey="contracted" name="Sözleşmeli" stackId="a" fill="#10b981" />
                <Bar dataKey="contacted" name="İletişime Geçildi" stackId="a" fill="#3b82f6" />
                <Bar dataKey="lead" name="Potansiyel" stackId="a" fill="#eab308" />
                <Bar dataKey="not_interested" name="İlgilenmiyor" stackId="a" fill="#ef4444" />
                <Bar dataKey="blacklisted" name="Kara Liste" stackId="a" fill="#64748b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
