// The browser's working copy: survives a refresh, never leaves the device.
// It is a convenience, not the record. The user's file is the record.
import type { EncryptedBlob } from '../../engine/crypto';
import type { Meta } from './conflict';

export type StoredCopy = { meta: Meta; dirty: boolean; fileName?: string } & (
  { kind: 'plain'; profile: unknown } | { kind: 'encrypted'; blob: EncryptedBlob }
);

const DB = 'zakat-helper';
const STORE = 'kv';
const COPY = 'working-copy';
const HANDLE = 'file-handle';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => {
      resolve(req.result);
    };
    req.onerror = () => {
      reject(req.error ?? new Error('IndexedDB open failed'));
    };
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => {
        resolve(req.result as T);
      };
      req.onerror = () => {
        reject(req.error ?? new Error('IndexedDB request failed'));
      };
    });
  } finally {
    db.close();
  }
}

export const loadCopy = () => run<StoredCopy | undefined>('readonly', (s) => s.get(COPY));
export const saveCopy = (c: StoredCopy) => run<unknown>('readwrite', (s) => s.put(c, COPY));
export const clearCopy = () => run<unknown>('readwrite', (s) => s.delete(COPY));

export const loadHandle = () =>
  run<FileSystemFileHandle | undefined>('readonly', (s) => s.get(HANDLE));
export const saveHandle = (h: FileSystemFileHandle | null) =>
  run<unknown>('readwrite', (s) => (h ? s.put(h, HANDLE) : s.delete(HANDLE)));

/** Ask the browser not to evict our storage. Best effort: Safari may still clear it. */
export async function requestPersistence(): Promise<boolean> {
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
