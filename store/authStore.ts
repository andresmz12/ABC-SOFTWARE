import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
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

// Guard so we only start one listener regardless of how many times initialize() is called.
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
    // Subscribe to auth state changes once — keeps session in sync with token
    // refreshes and handles remote sign-out automatically.
    if (!authListenerStarted) {
      authListenerStarted = true;
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'TOKEN_REFRESHED' && session) {
          // Silently update the session reference so API calls keep working.
          set({ session });
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, session: null });
        }
      });
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      set({ user: userData, session, loading: false });
    } else {
      set({ loading: false });
    }
  },
}));
