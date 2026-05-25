import { useEffect } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { registerForPushNotifications, savePushToken } from '@/lib/notifications';
import { getUserProfile } from '@/lib/userUtils';

export const useAuth = () => {
  const { user, session, loading, setUser, setSession, initialize, signOut } = useAuthStore();

  useEffect(() => {
    // initialize() handles the initial session load (getSession + profile lookup).
    // It uses the priority-ordered lookup: admins → companies → independents → clients.
    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        // Always sync the raw session object
        setSession(newSession);

        if (event === 'SIGNED_IN' && newSession?.user) {
          // Only reload profile on an explicit sign-in action.
          // INITIAL_SESSION fires on page refresh and would race with initialize() —
          // skip it here; initialize() already handles the refresh case.
          const profile = await getUserProfile(newSession.user.id);
          if (profile) {
            setUser({ ...profile, email: newSession.user.email ?? '' } as any);
          }

          // Push notifications are native-only
          if (Platform.OS !== 'web') {
            try {
              const token = await registerForPushNotifications();
              if (token) await savePushToken(newSession.user.id, token);
            } catch (e) {
              console.warn('[useAuth] push notification registration failed:', e);
            }
          }
        } else if (event === 'SIGNED_OUT' || !newSession?.user) {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, session, loading, signOut };
};
