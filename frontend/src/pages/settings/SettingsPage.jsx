import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Loader2, User, Shield, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
  const { userData, currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(null);

  const isAdmin = userData?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const fetched = [];
      snap.forEach(d => fetched.push({ id: d.id, ...d.data() }));
      setUsers(fetched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userId, field, value) => {
    setSaving(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { [field]: value });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, [field]: value } : u));
    } catch (err) {
      console.error(err);
      alert('Güncelleme başarısız!');
    } finally {
      setSaving(null);
    }
  };

  if (!userData) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Ayarlar</h1>
        <p className="text-sm text-slate-500 mt-1">Profil bilgilerinizi ve sistem ayarlarını yönetin.</p>
      </div>

      {/* Profil Section */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
          <User className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-slate-800">Profilim</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">İsim</label>
            <input 
              disabled
              value={userData.firstName || ''}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Soyisim</label>
            <input 
              disabled
              value={userData.lastName || ''}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-posta</label>
            <input 
              disabled
              value={currentUser.email || ''}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Yetki Rolü</label>
            <div className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 font-medium">
              <Shield className={`w-4 h-4 ${isAdmin ? 'text-emerald-500' : 'text-slate-400'}`} />
              {userData.role === 'admin' ? 'Yönetici (Admin)' : userData.role === 'manager' ? 'Müdür' : 'Satış Temsilcisi'}
            </div>
            <p className="text-xs text-slate-400 mt-1">Sadece yöneticiler profil güncelleyebilir.</p>
          </div>
        </div>
      </div>

      {/* Kullanıcı Yönetimi (Sadece Admin) */}
      {isAdmin && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
            <Shield className="w-5 h-5 text-emerald-600" />
            <h2 className="font-semibold text-slate-800">Kullanıcı Yönetimi (Admin)</h2>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                      <th className="pb-3 pr-4">E-posta</th>
                      <th className="pb-3 pr-4">İsim</th>
                      <th className="pb-3 pr-4">Soyisim</th>
                      <th className="pb-3 pr-4">Rol</th>
                      <th className="pb-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(u => (
                      <tr key={u.id} className="text-sm text-slate-700">
                        <td className="py-3 pr-4">{u.email}</td>
                        <td className="py-3 pr-4">
                          <input 
                            value={u.firstName || ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              setUsers(prev => prev.map(usr => usr.id === u.id ? { ...usr, firstName: v } : usr));
                            }}
                            onBlur={(e) => updateUser(u.id, 'firstName', e.target.value)}
                            className="px-2 py-1 border border-slate-200 rounded focus:border-blue-500 focus:outline-none"
                            placeholder="İsim"
                          />
                        </td>
                        <td className="py-3 pr-4">
                          <input 
                            value={u.lastName || ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              setUsers(prev => prev.map(usr => usr.id === u.id ? { ...usr, lastName: v } : usr));
                            }}
                            onBlur={(e) => updateUser(u.id, 'lastName', e.target.value)}
                            className="px-2 py-1 border border-slate-200 rounded focus:border-blue-500 focus:outline-none"
                            placeholder="Soyisim"
                          />
                        </td>
                        <td className="py-3 pr-4">
                          <select
                            value={u.role || 'sales_rep'}
                            onChange={(e) => updateUser(u.id, 'role', e.target.value)}
                            className="px-2 py-1.5 border border-slate-200 rounded focus:border-blue-500 focus:outline-none text-sm"
                          >
                            <option value="admin">Yönetici</option>
                            <option value="manager">Müdür</option>
                            <option value="sales_rep">Satış Temsilcisi</option>
                          </select>
                        </td>
                        <td className="py-3">
                          {saving === u.id && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
