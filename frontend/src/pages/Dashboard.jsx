import React from 'react';

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500 mb-1">Toplam Acente</p>
          <p className="text-3xl font-bold text-slate-800">17,144</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500 mb-1">Aktif Sözleşmeler</p>
          <p className="text-3xl font-bold text-emerald-600">0</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500 mb-1">Bu Ay Eklenenler</p>
          <p className="text-3xl font-bold text-blue-600">0</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex items-center justify-center min-h-[400px]">
        <p className="text-slate-400">Grafikler ve Özet Raporlar Burada Yer Alacak</p>
      </div>
    </div>
  );
}
