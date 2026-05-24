import '../global.css';
import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, Alert, TouchableWithoutFeedback, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { initializeStripe } from '@/lib/stripe';
import { useSettingsStore } from '@/store/settingsStore';
import { LanguageProvider } from '@/context/LanguageContext';
import { useAuthStore } from '@/store/authStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

const INACTIVITY_MS = 15 * 60 * 1000;
const WARNING_MS    = INACTIVITY_MS - 2 * 60 * 1000; // warn 2 min before logout
const BACKGROUND_MS = 30 * 60 * 1000;

export default function RootLayout() {
  const router = useRouter();
  const { user } = useAuthStore();

  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backgroundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef     = useRef<AppStateStatus>(AppState.currentState);
  // Ref keeps the latest resetInactivityTimer so Alert callbacks never go stale
  const resetTimerRef   = useRef<() => void>(() => {});

  useEffect(() => {
    // Run Stripe initialization independently so its errors are surfaced and
    // never silently swallowed by a shared Promise.all catch.
    initializeStripe().catch((e) => console.error('[stripe] initializeStripe failed:', e));

    Promise.all([
      Font.loadAsync({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold }),
      useSettingsStore.getState().loadSettings(),
    ])
      .catch(() => {})
      .finally(() => { SplashScreen.hideAsync().catch(() => {}); });
  }, []);

  const clearInactivityTimers = useCallback(() => {
    if (inactivityTimer.current) { clearTimeout(inactivityTimer.current); inactivityTimer.current = null; }
    if (warningTimer.current)    { clearTimeout(warningTimer.current);    warningTimer.current = null; }
  }, []);

  const handleAutoLogout = useCallback(async () => {
    clearInactivityTimers();
    if (backgroundTimer.current) { clearTimeout(backgroundTimer.current); backgroundTimer.current = null; }
    // Read current state at call time — avoids stale closure on user
    const { user: currentUser, signOut } = useAuthStore.getState();
    if (!currentUser) return;
    const es = currentUser.country === 'colombia';
    await signOut();
    router.replace('/(auth)/welcome');
    Alert.alert(
      es ? 'Sesión Expirada' : 'Session Expired',
      es
        ? 'Has sido desconectado por inactividad.'
        : 'You have been logged out due to inactivity.',
    );
  }, [router, clearInactivityTimers]);

  const resetInactivityTimer = useCallback(() => {
    const { user: currentUser } = useAuthStore.getState();
    if (!currentUser) return;
    clearInactivityTimers();
    const es = currentUser.country === 'colombia';
    // Warning 2 minutes before logout
    warningTimer.current = setTimeout(() => {
      Alert.alert(
        es ? 'Aviso de Sesión' : 'Session Warning',
        es
          ? 'Tu sesión expirará en 2 minutos por inactividad. Toca en cualquier lugar para continuar.'
          : 'Your session will expire in 2 minutes due to inactivity. Tap anywhere to continue.',
        [{ text: es ? 'Continuar' : 'Continue', onPress: () => resetTimerRef.current() }],
      );
    }, WARNING_MS);
    inactivityTimer.current = setTimeout(() => { handleAutoLogout(); }, INACTIVITY_MS);
  }, [clearInactivityTimers, handleAutoLogout]);

  // Keep ref in sync so Alert callbacks always call the latest version
  useEffect(() => {
    resetTimerRef.current = resetInactivityTimer;
  }, [resetInactivityTimer]);

  // Start / stop inactivity timer based on auth state
  useEffect(() => {
    if (user) {
      resetInactivityTimer();
    } else {
      clearInactivityTimers();
    }
    return () => { clearInactivityTimers(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Background timeout: sign out if app stays backgrounded > 30 min
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appStateRef.current === 'active' && nextState === 'background') {
        backgroundTimer.current = setTimeout(() => { handleAutoLogout(); }, BACKGROUND_MS);
      } else if (nextState === 'active') {
        if (backgroundTimer.current) { clearTimeout(backgroundTimer.current); backgroundTimer.current = null; }
        resetTimerRef.current();
      }
      appStateRef.current = nextState;
    });
    return () => { sub.remove(); };
  }, [handleAutoLogout]);

  return (
    <LanguageProvider>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
        <SafeAreaProvider>
          <TouchableWithoutFeedback onPress={() => resetTimerRef.current()} accessible={false}>
            <View style={{ flex: 1 }}>
              <Stack screenOptions={{ headerShown: false }} />
            </View>
          </TouchableWithoutFeedback>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </LanguageProvider>
  );
}
