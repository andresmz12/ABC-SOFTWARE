/**
 * storage.ts — Platform-aware key-value storage adapter
 *
 * On web:    wraps localStorage in a Promise-based API
 * On native: delegates to @react-native-async-storage/async-storage
 *
 * Usage: import { storage } from '@/lib/storage'
 *        storage.getItem(key), storage.setItem(key, val), storage.removeItem(key)
 */
import { Platform } from 'react-native';

interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const webStorage: StorageAdapter = {
  getItem: (key) => {
    try { return Promise.resolve(localStorage.getItem(key)); }
    catch { return Promise.resolve(null); }
  },
  setItem: (key, value) => {
    try { localStorage.setItem(key, value); } catch {}
    return Promise.resolve();
  },
  removeItem: (key) => {
    try { localStorage.removeItem(key); } catch {}
    return Promise.resolve();
  },
};

// Avoid bundling AsyncStorage at all on web (it has no web support)
const nativeStorage: StorageAdapter =
  Platform.OS !== 'web'
    ? (require('@react-native-async-storage/async-storage').default as StorageAdapter)
    : webStorage; // fallback — should never be reached on native

export const storage: StorageAdapter = Platform.OS === 'web' ? webStorage : nativeStorage;
