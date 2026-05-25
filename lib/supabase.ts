import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { storage } from '@/lib/storage';

// process.env.EXPO_PUBLIC_* values are inlined at bundle time.
// The ?? fallbacks prevent createClient from throwing during local dev
// without a .env file; Vercel supplies real values at build time.
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Uses platform-aware storage adapter:
    //   Web  → storage.web.ts  → localStorage (no AsyncStorage import in web bundle)
    //   Native → storage.ts    → AsyncStorage
    storage: storage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
