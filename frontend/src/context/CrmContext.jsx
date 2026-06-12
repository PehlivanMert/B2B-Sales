import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

const CrmContext = createContext(null);

/**
 * CrmProvider — agency_crm koleksiyonunu tüm uygulama için TEK bir
 * onSnapshot listener ile dinler. Dashboard, AgenciesPage ve MapPage
 * ayrı ayrı listener açmak yerine bu context'i kullanır.
 * Bu sayede aynı veri için 3 ayrı Firestore okuma yerine sadece 1 okuma yapılır.
 */
export function CrmProvider({ children }) {
  const [crmData, setCrmData] = useState({});
  const [crmLoading, setCrmLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'agency_crm'),
      (snapshot) => {
        const updates = {};
        snapshot.forEach((doc) => {
          updates[doc.id] = doc.data();
        });
        setCrmData(updates);
        setCrmLoading(false);
      },
      (err) => {
        console.error('CrmContext: agency_crm dinleme hatası:', err);
        setCrmLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <CrmContext.Provider value={{ crmData, crmLoading }}>
      {children}
    </CrmContext.Provider>
  );
}

/** Hook: Herhangi bir bileşende CRM verisine erişmek için kullanılır */
export function useCrm() {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error('useCrm() must be used within a <CrmProvider>');
  return ctx;
}
