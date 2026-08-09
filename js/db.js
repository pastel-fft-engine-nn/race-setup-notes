/**
 * IndexedDB ラッパー（ミニ四駆セッティング帳）
 * 完全ローカル保存。写真・動画もBlobとして保存。
 */

const DB_NAME = 'Mini4WDSettings';
const DB_VERSION = 1;
const STORE = 'records';

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      db = req.result;
      resolve(db);
    };
    req.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains(STORE)) {
        const store = database.createObjectStore(STORE, { keyPath: 'id', autoIncrement: false });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('location', 'location', { unique: false });
        store.createIndex('motorType', 'motorType', { unique: false });
        store.createIndex('classType', 'classType', { unique: false }); // オープン/ストック
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/** 全件取得（新しい順） */
async function getAllRecords() {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      const list = req.result || [];
      list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0));
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

/** IDで1件取得 */
async function getRecord(id) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

/** 保存（新規 or 更新） */
async function saveRecord(record) {
  const database = await openDB();
  if (!record.id) {
    record.id = crypto.randomUUID();
    record.createdAt = Date.now();
  }
  record.updatedAt = Date.now();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).put(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

/** 削除 */
async function deleteRecord(id) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** フィルター用のユニーク値を集計 */
async function getFilterOptions() {
  const list = await getAllRecords();
  const locations = [...new Set(list.map(r => r.location).filter(Boolean))].sort();
  const motors = [...new Set(list.map(r => r.motorType).filter(Boolean))].sort();
  return { locations, motors };
}

/** ファイルをBase64風に扱いやすい形で保存するため、BlobをArrayBufferに */
async function fileToArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/** ArrayBufferからBlob URLを作る（表示用） */
function bufferToObjectURL(buffer, mimeType) {
  const blob = new Blob([buffer], { type: mimeType });
  return URL.createObjectURL(blob);
}
