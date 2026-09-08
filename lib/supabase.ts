import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { storage } from '@/lib/storage';

// process.env.EXPO_PUBLIC_* values are inlined into the JS bundle at BUILD
// time (not read at runtime). The ?? fallbacks prevent createClient from
// throwing during local dev without a .env file. Whatever host builds the
// web bundle (Vercel, Railway, EAS, ...) must supply the real values as
// build-time env vars, or the deployed app will silently talk to a
// placeholder project.
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key';

if (supabaseUrl.includes('placeholder')) {
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL/EXPO_PUBLIC_SUPABASE_ANON_KEY were not set at build time — using placeholders. Set them in the build environment before running `npm run build`.'
  );
}

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
