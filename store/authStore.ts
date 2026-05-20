import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User, UserRole, Country } from '@/types';

interface AuthState {
  user: User | null;
  session: any | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: any | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  enterDemoMode: (role: UserRole, country?: Country) => void;
}

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
  enterDemoMode: (role: UserRole, country: Country = 'usa') => {
    set({
      user: {
        id: 'demo',
        email: 'demo@provendor.app',
        role,
        status: 'approved',
        country,
        preferred_language: country === 'colombia' ? 'es' : 'en',
        created_at: new Date().toISOString(),
      },
      loading: false,
    });
  },
}));
