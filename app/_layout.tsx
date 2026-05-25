import '../global.css';
import { useEffect, useRef, useCallback } from 'react';
import {
  Platform,
  AppState, AppStateStatus,
  Alert, TouchableWithoutFeedback, View,
} from 'react-native';
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

// ─── Cross-platform alert ─────────────────────────────────────────────────────
// Alert.alert is React Native only; on web we use window.alert / window.confirm.
function platformAlert(
  title: string,
  message: string,
  buttons?: Array<{ text: string; style?: string; onPress?: () => void }>,
) {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 1) {
      // Use confirm() so the user can click Cancel or OK
      const ok = window.confirm(`${title}\n\n${message}`);
      if (ok) {
        const confirmBtn = buttons.find((b) => b.style !== 'cancel');
        confirmBtn?.onPress?.();
      }
    } else {
      window.alert(`${title}\n\n${message}`);
      // Fire the only button's callback (if any) after dismiss
      buttons?.[0]?.onPress?.();
    }
  } else {
    Alert.alert(title, message, buttons as any);
  }
}

export default function RootLayout() {
  const router = useRouter();
  const { user } = useAuthStore();

  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backgroundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Start with 'active' — safe default on both platforms
  const appStateRef     = useRef<AppStateStatus>('active');
  // Ref keeps the latest resetInactivityTimer so callbacks never go stale
  const resetTimerRef   = useRef<() => void>(() => {});

  // ── Boot: fonts + settings ────────────────────────────────────────────────
  useEffect(() => {
    initializeStripe().catch((e) => console.error('[stripe] initializeStripe failed:', e));
    Promise.all([
      Font.loadAsync({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold }),
      useSettingsStore.getState().loadSettings(),
    ])
      .catch(() => {})
      .finally(() => { SplashScreen.hideAsync().catch(() => {}); });
  }, []);

  // ── Timer helpers ─────────────────────────────────────────────────────────

  const clearInactivityTimers = useCallback(() => {
    if (inactivityTimer.current) { clearTimeout(inactivityTimer.current); inactivityTimer.current = null; }
    if (warningTimer.current)    { clearTimeout(warningTimer.current);    warningTimer.current = null; }
  }, []);

  const handleAutoLogout = useCallback(async () => {
    clearInactivityTimers();
    if (backgroundTimer.current) { clearTimeout(backgroundTimer.current); backgroundTimer.current = null; }
    const { user: currentUser, signOut } = useAuthStore.getState();
    if (!currentUser) return;
    const es = currentUser.country === 'colombia';
    await signOut();
    // On web, router.replace can fail after signOut — use hard redirect
    if (Platform.OS === 'web') {
      (window as any).location.href = '/';
    } else {
      router.replace('/(auth)/welcome');
    }
    platformAlert(
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
    warningTimer.current = setTimeout(() => {
      platformAlert(
        es ? 'Aviso de Sesión' : 'Session Warning',
        es
          ? 'Tu sesión expirará en 2 minutos por inactividad. Toca en cualquier lugar para continuar.'
          : 'Your session will expire in 2 minutes due to inactivity. Tap anywhere to continue.',
        [
          { text: es ? 'Cancelar' : 'Cancel', style: 'cancel' },
          { text: es ? 'Continuar' : 'Continue', onPress: () => resetTimerRef.current() },
        ],
      );
    }, WARNING_MS);
    inactivityTimer.current = setTimeout(() => { handleAutoLogout(); }, INACTIVITY_MS);
  }, [clearInactivityTimers, handleAutoLogout]);

  // Keep ref in sync so callbacks always call the latest version
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

  // ── Activity tracking ─────────────────────────────────────────────────────
  // On web: attach DOM event listeners (no TouchableWithoutFeedback needed —
  //   TWOF on web can block pointer events on child elements).
  // On native: TouchableWithoutFeedback in the JSX handles it.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const reset = () => resetTimerRef.current();
    const evts = ['click', 'keydown', 'touchstart', 'scroll', 'mousemove'] as const;
    evts.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => evts.forEach((e) => window.removeEventListener(e, reset));
  }, []);

  // ── Background / foreground detection ────────────────────────────────────
  // On web: document.visibilitychange API.
  // On native: AppState API.
  useEffect(() => {
    if (Platform.OS === 'web') {
      const onVisibility = () => {
        if (document.hidden) {
          backgroundTimer.current = setTimeout(() => { handleAutoLogout(); }, BACKGROUND_MS);
        } else {
          if (backgroundTimer.current) { clearTimeout(backgroundTimer.current); backgroundTimer.current = null; }
          resetTimerRef.current();
        }
      };
      document.addEventListener('visibilitychange', onVisibility);
      return () => document.removeEventListener('visibilitychange', onVisibility);
    }

    // Native: AppState
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

  // ── Render ────────────────────────────────────────────────────────────────

  const innerView = (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );

  return (
    <LanguageProvider>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#F5F7FA' }}>
        <SafeAreaProvider>
          {/*
           * On web: plain View — activity tracking is done via DOM event
           *   listeners above. TouchableWithoutFeedback on web can swallow
           *   pointer events and break all interactions.
           * On native: TouchableWithoutFeedback resets the inactivity timer
           *   on any tap anywhere in the app.
           */}
          {Platform.OS !== 'web' ? (
            <TouchableWithoutFeedback onPress={() => resetTimerRef.current()} accessible={false}>
              {innerView}
            </TouchableWithoutFeedback>
          ) : innerView}
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </LanguageProvider>
  );
}
