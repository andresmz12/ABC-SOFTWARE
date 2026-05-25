import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { getUserProfile } from '@/lib/userUtils';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  session: any | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: any | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

let authListenerStarted = false;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
  initialize: async () => {
    const INIT_TIMEOUT_MS = 5000;
    let settled = false;

    const settle = (state: Partial<AuthState>) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      set(state);
    };

    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        console.warn('[authStore] initialize() timed out — dropping loading flag');
        set({ loading: false });
      }
    }, INIT_TIMEOUT_MS);

    try {
      if (!authListenerStarted) {
        authListenerStarted = true;
        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'TOKEN_REFRESHED' && session) {
            set({ session });
          } else if (event === 'SIGNED_OUT') {
            set({ user: null, session: null });
          }
        });
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const uid = session.user.id;
        const email = session.user.email ?? '';

        // First try the legacy `users` table (if it exists in this deployment)
        const { data: usersRow, error: usersErr } = await supabase
          .from('users')
          .select('*')
          .eq('id', uid)
          .maybeSingle();

        if (usersRow) {
          // users table exists and has the row — use it directly
          settle({ user: { ...usersRow, email } as User, session, loading: false });
          return;
        }

        // `users` table missing or row absent — fall back to profile tables
        if (usersErr) {
          console.info('[authStore] users table not found, trying profile tables');
        }

        const profile = await getUserProfile(uid);
        if (!profile) {
          await supabase.auth.signOut();
          settle({ user: null, session: null, loading: false });
          return;
        }

        settle({
          user: {
            id: uid,
            email,
            role: profile.role,
            status: profile.status as any,
            country: profile.country as any,
            preferred_language: profile.preferred_language as any,
            push_token: profile.push_token,
            created_at: profile.created_at ?? new Date().toISOString(),
          } as User,
          session,
          loading: false,
        });
      } else {
        settle({ loading: false });
      }
    } catch (err) {
      console.warn('[authStore] initialize() error:', err);
      settle({ loading: false });
    }
  },
}));
