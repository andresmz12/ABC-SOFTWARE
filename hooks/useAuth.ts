import { useEffect } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { registerForPushNotifications, savePushToken } from '@/lib/notifications';
import { getUserProfile } from '@/lib/userUtils';

export const useAuth = () => {
  const { user, session, loading, setUser, setSession, initialize, signOut } = useAuthStore();

  useEffect(() => {
    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session?.user) {
          // Use profile tables (clients / companies / independents / admins)
          // rather than the non-existent users table
          const profile = await getUserProfile(session.user.id);
          if (profile) {
            setUser({ ...profile, email: session.user.email ?? '' } as any);
          }

          // Push notifications are only available on native (not web)
          if (event === 'SIGNED_IN' && Platform.OS !== 'web') {
            try {
              const token = await registerForPushNotifications();
              if (token) await savePushToken(session.user.id, token);
            } catch (e) {
              console.warn('[useAuth] push notification registration failed:', e);
            }
          }
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, session, loading, signOut };
};
