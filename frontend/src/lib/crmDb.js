/**
 * crmDb.js — IndexedDB yardımcı katmanı (agency_crm cache)
 *
 * Stores:
 *  - 'agency_crm' : keyPath='docId', CRM kayıtları
 *  - 'meta'       : key-value, lastSyncedAt vb. metadata
 *
 * Timestamp serileştirme:
 *  Firestore Timestamp nesneleri IndexedDB'de { _ts: ms } olarak saklanır.
 *  Okunurken { toDate: () => new Date(ms), toMillis: () => ms } şeklinde
 *  geri oluşturulur — mevcut .toDate() kontrollerine uyumlu.
 */

const DB_NAME      = 'b2b_crm_db';
const DB_VERSION   = 2;
const STORE_CRM    = 'agency_crm';
const STORE_META   = 'meta';
const STORE_QUEUE  = 'pending_writes';

// Singleton promise
let _db = null;

function openDb() {
  if (_db) return _db;
  _db = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_CRM)) {
        db.createObjectStore(STORE_CRM, { keyPath: 'docId' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META);
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess  = () => resolve(req.result);
    req.onerror    = () => { _db = null; reject(req.error); };
  });
  return _db;
}

// ── Serialization ─────────────────────────────────────────────────────────────

/** Firestore Timestamp veya Date → { _ts: ms } */
function serializeValue(v) {
  if (v && typeof v.toMillis === 'function') return { _ts: v.toMillis() };
  if (v instanceof Date)                     return { _ts: v.getTime()  };
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const out = {};
    for (const k of Object.keys(v)) out[k] = serializeValue(v[k]);
    return out;
  }
  return v;
}

/** { _ts: ms } → { toDate, toMillis } — mevcut .toDate() kontrollerine uyumlu */
function deserializeValue(v) {
  if (v && typeof v === 'object' && '_ts' in v) {
    const ms = v._ts;
    return { toDate: () => new Date(ms), toMillis: () => ms, seconds: Math.floor(ms / 1000) };
  }
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const out = {};
    for (const k of Object.keys(v)) out[k] = deserializeValue(v[k]);
    return out;
  }
  return v;
}

function serialize(data)   { return serializeValue(data);   }
function deserialize(data) { return deserializeValue(data); }

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Tüm CRM kayıtlarını { [docId]: data } formatında döner.
 * IndexedDB boşsa {} döner.
 */
export async function getAllCrmEntries() {
  const db  = await openDb();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_CRM, 'readonly');
    const req = tx.objectStore(STORE_CRM).getAll();
    req.onsuccess = () => {
      const map = {};
      req.result.forEach(({ docId, ...rest }) => {
        map[docId] = deserialize(rest);
      });
      resolve(map);
    };
    req.onerror = () => reject(req.error);
  });
}

/** Belge sayısını döner (cache dolu mu kontrolü için). */
export async function getCrmEntryCount() {
  const db  = await openDb();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_CRM, 'readonly');
    const req = tx.objectStore(STORE_CRM).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

/**
 * Birden fazla CRM kaydını IndexedDB'ye yazar (batch).
 * @param {Array<{ docId: string, [key]: any }>} entries
 */
export async function putCrmEntries(entries) {
  if (!entries.length) return;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_CRM, 'readwrite');
    const store = tx.objectStore(STORE_CRM);
    entries.forEach(({ docId, ...data }) => {
      store.put({ docId, ...serialize(data) });
    });
    tx.oncomplete = resolve;
    tx.onerror    = () => reject(tx.error);
  });
}

/**
 * Tek bir CRM kaydını mevcut değerlerle birleştirerek günceller.
 * @param {string} docId
 * @param {object} patch
 */
export async function patchCrmEntry(docId, patch) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_CRM, 'readwrite');
    const store = tx.objectStore(STORE_CRM);
    const getReq = store.get(docId);
    getReq.onsuccess = () => {
      const existing = getReq.result || { docId };
      store.put({ ...existing, ...serialize(patch), docId });
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/** Son Firestore sync zamanını milliseconds cinsinden döner (yoksa null). */
export async function getLastSyncedAt() {
  const db  = await openDb();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_META, 'readonly');
    const req = tx.objectStore(STORE_META).get('lastSyncedAt');
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror   = () => reject(req.error);
  });
}

/** Son sync zamanını milliseconds olarak kaydeder. */
export async function setLastSyncedAt(ms) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, 'readwrite');
    tx.objectStore(STORE_META).put(ms, 'lastSyncedAt');
    tx.oncomplete = resolve;
    tx.onerror    = () => reject(tx.error);
  });
}

/** agency_crm store + meta tamamen temizler (force full resync için). */
export async function clearCrmDb() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_CRM, STORE_META], 'readwrite');
    tx.objectStore(STORE_CRM).clear();
    tx.objectStore(STORE_META).clear();
    tx.oncomplete = resolve;
    tx.onerror    = () => reject(tx.error);
  });
}

// ── Offline Sync Queue API ────────────────────────────────────────────────────

/**
 * Çevrimdışı yapılan güncellemeyi kuyruğa ekler.
 * @param {string} docId - agency_crm id'si
 * @param {object} patch - yapılan değişiklikler
 */
export async function enqueuePendingWrite(docId, patch) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    const store = tx.objectStore(STORE_QUEUE);
    store.add({
      docId,
      patch: serialize(patch),
      createdAt: Date.now()
    });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Kuyruktaki tüm bekleyen yazmaları getirir.
 */
export async function getAllPendingWrites() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readonly');
    const req = tx.objectStore(STORE_QUEUE).getAll();
    req.onsuccess = () => {
      const items = req.result.map(item => ({
        ...item,
        patch: deserialize(item.patch)
      }));
      // En eski olan en önde gelsin diye sıralayalım (her ihtimale karşı)
      items.sort((a, b) => a.createdAt - b.createdAt);
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Başarıyla senkronize edilen kuyruk öğesini siler.
 * @param {number} id - pending write id'si
 */
export async function clearPendingWrite(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    tx.objectStore(STORE_QUEUE).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

