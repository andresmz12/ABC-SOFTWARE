import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// During static pre-rendering (expo export --output static) the Node SSR
// renderer evaluates this module without EXPO_PUBLIC_* env vars and without
// browser globals (localStorage / window).  Fall back to safe no-op values so
// the module loads without crashing; real data-fetching happens client-side.
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key';

// True only in a real browser environment (not in Node SSR).
const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const ExpoSecureStoreAdapter = {
  getItem: (key: string): Promise<string | null> => {
    if (!isBrowser && Platform.OS === 'web') {
      // SSR / Node — no browser storage available; return null silently.
      return Promise.resolve(null);
    }
    if (Platform.OS === 'web') {
      return Promise.resolve(localStorage.getItem(key));
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string): Promise<void> => {
    if (!isBrowser && Platform.OS === 'web') {
      return Promise.resolve();
    }
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string): Promise<void> => {
    if (!isBrowser && Platform.OS === 'web') {
      return Promise.resolve();
    }
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
