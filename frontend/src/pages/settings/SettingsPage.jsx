import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Loader2, User, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { userData, currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [profileData, setProfileData] = useState({ firstName: '', lastName: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const isAdmin = userData?.role === 'admin';

  useEffect(() => {
    if (userData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfileData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || ''
      });
    }
  }, [userData]);

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

  useEffect(() => {
    if (isAdmin) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchUsers();
    }
  }, [isAdmin]);

  const updateUser = async (userId, field, value) => {
    setSaving(userId);
    setErrorMsg('');
    try {
      await updateDoc(doc(db, 'users', userId), { [field]: value });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, [field]: value } : u));
    } catch (err) {
      console.error(err);
      setErrorMsg('Güncelleme başarısız! Lütfen tekrar deneyin.');
    } finally {
      setSaving(null);
    }
  };

  const handleUpdateProfile = async () => {
    if (!currentUser?.uid) return;
    setProfileSaving(true);
    setErrorMsg('');
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        firstName: profileData.firstName,
        lastName: profileData.lastName
      });
    } catch (err) {
      console.error(err);
      setErrorMsg('Profil güncellenirken hata oluştu.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
      setUsers(prev => prev.filter(u => u.id !== userId));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
      setErrorMsg('Kullanıcı silinemedi.');
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
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-slate-800">Profilim</h2>
          </div>
          <button
            onClick={handleUpdateProfile}
            disabled={profileSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {profileSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {profileSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">İsim</label>
            <input 
              value={profileData.firstName}
              onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Soyisim</label>
            <input 
              value={profileData.lastName}
              onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
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
            <p className="text-xs text-slate-400 mt-1">İsim ve soyisminizi güncelleyebilirsiniz.</p>
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
            {errorMsg && (
              <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                <span>⚠️</span> {errorMsg}
              </div>
            )}
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
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            {saving === u.id && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                            {u.id !== currentUser?.uid && (
                              deleteConfirmId === u.id ? (
                                <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2 py-1 shadow-sm shrink-0">
                                  <span className="text-xs text-red-600 font-medium whitespace-nowrap">Silinsin mi?</span>
                                  <button
                                    onClick={() => handleDeleteUser(u.id)}
                                    className="text-xs text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded transition-colors"
                                  >
                                    Evet
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="text-xs text-slate-500 hover:text-slate-700 px-1"
                                  >
                                    Hayır
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirmId(u.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Kullanıcıyı Sil"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                </button>
                              )
                            )}
                          </div>
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
