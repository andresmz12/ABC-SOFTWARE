import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { View, ActivityIndicator } from 'react-native';
import { C } from '@/constants/theme';

// Maximum time we show the loading spinner before bailing to the welcome
// screen.  Acts as a second safety net after the 5-second store timeout.
const LOADING_DEADLINE_MS = 3000;

export default function Index() {
  const router = useRouter();
  const { user, loading, initialize } = useAuthStore();
  const deadlineRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Kick off auth initialisation once.
  useEffect(() => {
    initialize();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Hard deadline: if loading hasn't cleared in LOADING_DEADLINE_MS, force it
  // off and let the redirect effect below send the user to the welcome screen.
  useEffect(() => {
    if (!loading) {
      if (deadlineRef.current) {
        clearTimeout(deadlineRef.current);
        deadlineRef.current = null;
      }
      return;
    }

    deadlineRef.current = setTimeout(() => {
      const state = useAuthStore.getState();
      if (state.loading) {
        console.warn('[index] auth deadline reached — forcing loading: false');
        useAuthStore.getState().setLoading(false);
      }
    }, LOADING_DEADLINE_MS);

    return () => {
      if (deadlineRef.current) {
        clearTimeout(deadlineRef.current);
        deadlineRef.current = null;
      }
    };
  }, [loading]);

  // Redirect once auth state is resolved.
  // A short delay lets Zustand state settle across all subscribers before
  // navigation fires — prevents wrong-screen flashes on F5 reload.
  useEffect(() => {
    if (loading) return;
    const tid = setTimeout(() => {
      if (!user) {
        router.replace('/(auth)/welcome');
      } else if (user.role === 'client') {
        router.replace('/(client)/home');
      } else if (user.role === 'company' || user.role === 'independent') {
        router.replace('/(provider)/home');
      } else if (user.role === 'admin') {
        router.replace('/(admin)/dashboard');
      } else {
        // Unknown role — fall back to welcome rather than staying on the spinner.
        router.replace('/(auth)/welcome');
      }
    }, 100);
    return () => clearTimeout(tid);
  }, [user, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background }}>
      <ActivityIndicator size="large" color={C.accent} />
    </View>
  );
}
