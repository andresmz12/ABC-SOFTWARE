/**
 * storage.web.ts — Web implementation of the storage adapter
 * Loaded automatically by webpack/Expo web bundler in place of storage.ts
 * Uses browser localStorage, wrapped in Promises to match the AsyncStorage API.
 */

export const storage = {
  getItem: (key: string): Promise<string | null> => {
    try { return Promise.resolve(localStorage.getItem(key)); }
    catch { return Promise.resolve(null); }
  },
  setItem: (key: string, value: string): Promise<void> => {
    try { localStorage.setItem(key, value); } catch {}
    return Promise.resolve();
  },
  removeItem: (key: string): Promise<void> => {
    try { localStorage.removeItem(key); } catch {}
    return Promise.resolve();
  },
};
