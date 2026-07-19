import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { collection, getDocs, query, where, orderBy, startAfter, limit, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  getAllCompanyCrmEntries, getCompanyCrmEntryCount, putCompanyCrmEntries,
  patchCompanyCrmEntry, getCompanyLastSyncedAt, setCompanyLastSyncedAt, clearCompanyCrmDb,
  enqueuePendingWrite, getAllPendingWrites, clearPendingWrite
} from '../lib/crmDb';
import { doc, writeBatch, setDoc } from 'firebase/firestore';

const CompanyCrmContext = createContext(null);

// Firestore'dan sayfalı yükleme için batch boyutu
const PAGE_SIZE = 500;
// Tab'a geri dönüldüğünde delta sync tetikleme eşiği (ms)
const VISIBILITY_THRESHOLD_MS = 5 * 60 * 1000; // 5 dakika

// ── Sync Fonksiyonları ────────────────────────────────────────────────────────

/**
 * Tüm company_crm koleksiyonunu 500'lük sayfalar halinde çeker,
 * IndexedDB'ye yazar ve React state'i günceller.
 */
async function fullSync(setCrmData, setSyncInfo) {
  const col = collection(db, 'company_crm');
  let lastDoc = null;
  let allData = {};
  let totalFetched = 0;

  try {
    do {
      const q = lastDoc
        ? query(col, orderBy('__name__'), startAfter(lastDoc), limit(PAGE_SIZE))
        : query(col, orderBy('__name__'), limit(PAGE_SIZE));

      const snap = await getDocs(q);
      const entries = [];
      snap.docs.forEach(d => {
        allData[d.id] = d.data();
        entries.push({ docId: d.id, ...d.data() });
      });
      await putCompanyCrmEntries(entries);
      totalFetched += snap.docs.length;
      lastDoc = snap.docs[snap.docs.length - 1] ?? null;
    } while (lastDoc && totalFetched % PAGE_SIZE === 0);

    const now = Date.now();
    await setCompanyLastSyncedAt(now);
    setCrmData(allData);
    setSyncInfo({ time: now, delta: totalFetched, type: 'full' });
  } catch (err) {
    console.error('CompanyCompanyCrmContext fullSync hatası:', err);
  }
}

/**
 * Son sync'ten bu yana değişen belgeler için Firestore sorgusu çalıştırır.
 * Firestore index yoksa fullSync'e düşer.
 *
 * Multi-user tutarlılık: Her kullanıcı, diğer kullanıcıların
 * lastSyncedAt'dan sonra yaptığı değişiklikleri bu fonksiyon ile alır.
 */
async function deltaSync(lastSyncedAt, setCrmData, setSyncInfo) {
  try {
    const ts = Timestamp.fromMillis(lastSyncedAt);
    const q  = query(
      collection(db, 'company_crm'),
      where('lastUpdatedAt', '>=', ts),
      orderBy('lastUpdatedAt', 'asc'),
    );
    const snap = await getDocs(q);
    const now = Date.now();

    if (!snap.empty) {
      const entries = [];
      const patches = {};
      snap.docs.forEach(d => {
        patches[d.id] = d.data();
        entries.push({ docId: d.id, ...d.data() });
      });
      await putCompanyCrmEntries(entries);
      setCrmData(prev => ({ ...prev, ...patches }));
      setSyncInfo({ time: now, delta: snap.docs.length, type: 'delta' });
    } else {
      setSyncInfo(prev => ({ ...prev, time: now, delta: 0, type: 'delta' }));
    }

    await setCompanyLastSyncedAt(now);
  } catch (err) {
    // Index yoksa veya başka hata — full sync'e düş
    if (err.code === 'failed-precondition' || err.code === 'unimplemented') {
      console.warn('CompanyCompanyCrmContext: Delta sync index yok, full sync çalışıyor. Firestore konsolundan index oluşturun:', err.message);
    } else {
      console.error('CompanyCompanyCrmContext deltaSync hatası, full sync\'e düşülüyor:', err);
    }
    await fullSync(setCrmData, setSyncInfo);
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function CompanyCrmProvider({ children }) {
  const [crmData,   setCrmData]   = useState({});
  const [crmLoading, setCrmLoading] = useState(true);
  // { time: ms, delta: number, type: 'full'|'delta' }
  const [syncInfo, setSyncInfo] = useState(null);

  // Offline queue state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingWritesCount, setPendingWritesCount] = useState(0);

  const hiddenAt = useRef(null); // Tab gizlenme zamanı

  // ── İlk yükleme ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      // 1. IndexedDB'den anında yükle
      const [count, cached, lastSyncedAt] = await Promise.all([
        getCompanyCrmEntryCount(),
        getAllCompanyCrmEntries(),
        getCompanyLastSyncedAt(),
      ]);

      if (count > 0) {
        setCrmData(cached);
        setCrmLoading(false);
        // Arka planda delta sync — diğer kullanıcıların değişikliklerini al
        deltaSync(lastSyncedAt, setCrmData, setSyncInfo);
      } else {
        // Cache yok — full sync (ilk kez)
        await fullSync(setCrmData, setSyncInfo);
        setCrmLoading(false);
      }
    }
    init();
  }, []);

  // ── Page Visibility API — Tab'a dönünce delta sync ────────────────────────
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        hiddenAt.current = Date.now();
      } else {
        const away = hiddenAt.current ? Date.now() - hiddenAt.current : 0;
        if (away >= VISIBILITY_THRESHOLD_MS) {
          getCompanyLastSyncedAt().then(lastSyncedAt => {
            if (lastSyncedAt) deltaSync(lastSyncedAt, setCrmData, setSyncInfo);
          });
        }
        hiddenAt.current = null;
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // ── updateCrmEntry — Tek belge lokal patch ────────────────────────────────
  const updateCrmEntry = useCallback((docId, patch) => {
    setCrmData(prev => ({ ...prev, [docId]: { ...(prev[docId] || {}), ...patch } }));
    patchCompanyCrmEntry(docId, patch).catch(console.error);
  }, []);

  // ── batchUpdateCrmEntries — Çok belge lokal patch ─────────────────────────
  const batchUpdateCrmEntries = useCallback((entries) => {
    setCrmData(prev => {
      const next = { ...prev };
      entries.forEach(({ docId, patch }) => {
        next[docId] = { ...(next[docId] || {}), ...patch };
      });
      return next;
    });
    // IndexedDB async patch — state ile race condition yok
    Promise.all(entries.map(({ docId, patch }) => patchCompanyCrmEntry(docId, patch)))
      .catch(console.error);
  }, []);

  // ── Kuyruk Flush (Online olunca Firestore'a aktar) ────────────────────────
  const flushPendingWrites = async () => {
    const writes = await getAllPendingWrites('company_crm');
    if (writes.length === 0) return;

    try {
      // Batch limiti 500
      const chunks = [];
      for (let i = 0; i < writes.length; i += 500) {
        chunks.push(writes.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const b = writeBatch(db);
        chunk.forEach(w => {
          b.set(doc(db, 'company_crm', w.docId), w.patch, { merge: true });
        });
        await b.commit();
        for (const w of chunk) {
          await clearPendingWrite(w.id);
        }
      }
      setPendingWritesCount(0);
      
      // Flush sonrası lastSyncedAt güncelle ki tekrar okunmasın
      await setCompanyLastSyncedAt(Date.now());
    } catch (err) {
      console.error('Kuyruk flush hatası:', err);
    }
  };

  // ── Offline / Online Listener ─────────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); flushPendingWrites(); };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // İlk açılışta kuyrukta bir şey var mı kontrol et
    getAllPendingWrites('company_crm').then(writes => setPendingWritesCount(writes.length));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── Tek belge kaydet (Ağ durumuna göre Firestore veya Kuyruk) ────────────
  const pushCrmUpdate = async (docId, patch) => {
    // 1. Her zaman lokal state ve cache'i anında güncelle
    updateCrmEntry(docId, patch);

    // 2. Ağ durumuna göre Firestore veya IndexedDB kuyruğu
    if (navigator.onLine) {
      try {
        await setDoc(doc(db, 'company_crm', docId), patch, { merge: true });
      } catch (err) {
        // Hata alırsak kuyruğa at
        await enqueuePendingWrite(docId, patch, 'company_crm');
        setPendingWritesCount(prev => prev + 1);
      }
    } else {
      await enqueuePendingWrite(docId, patch, 'company_crm');
      setPendingWritesCount(prev => prev + 1);
    }
  };

  // ── Toplu kaydet (Ağ durumuna göre Firestore veya Kuyruk) ─────────────────
  const batchPushCrmUpdates = async (entries) => {
    // entries: [{ docId, patch }]
    batchUpdateCrmEntries(entries);

    if (navigator.onLine) {
      try {
        const chunks = [];
        for (let i = 0; i < entries.length; i += 500) {
          chunks.push(entries.slice(i, i + 500));
        }
        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach(({ docId, patch }) => {
            batch.set(doc(db, 'company_crm', docId), patch, { merge: true });
          });
          await batch.commit();
        }
      } catch (err) {
        // Hata durumunda kuyruğa
        for (const { docId, patch } of entries) {
          await enqueuePendingWrite(docId, patch, 'company_crm');
        }
        setPendingWritesCount(prev => prev + entries.length);
      }
    } else {
      for (const { docId, patch } of entries) {
        await enqueuePendingWrite(docId, patch, 'company_crm');
      }
      setPendingWritesCount(prev => prev + entries.length);
    }
  };

  // ── refreshCrmData — Manuel yenileme (IndexedDB temizle + full sync) ──────
  const refreshCrmData = useCallback(async () => {
    setCrmLoading(true);
    await clearCompanyCrmDb();
    await fullSync(setCrmData, setSyncInfo);
    setCrmLoading(false);
  }, []);

  return (
    <CompanyCrmContext.Provider value={{
      crmData, crmLoading, syncInfo,
      updateCrmEntry, batchUpdateCrmEntries, refreshCrmData,
      isOnline, pendingWritesCount, pushCrmUpdate, batchPushCrmUpdates
    }}>
      {children}
    </CompanyCrmContext.Provider>
  );
}

export function useCompanyCrm() {
  const ctx = useContext(CompanyCrmContext);
  if (!ctx) throw new Error('useCompanyCrm() must be used within a <CompanyCrmProvider>');
  return ctx;
}
