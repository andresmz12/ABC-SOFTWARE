import '../global.css';
import '../lib/i18n';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
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
import i18n from '@/lib/i18n';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [langKey, setLangKey] = useState(i18n.language);

  useEffect(() => {
    const handler = (lng: string) => setLangKey(lng);
    i18n.on('languageChanged', handler);
    return () => i18n.off('languageChanged', handler);
  }, []);

  useEffect(() => {
    Promise.all([
      Font.loadAsync({
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
      }),
      initializeStripe(),
      useSettingsStore.getState().loadSettings(),
    ])
      .catch(() => {})
      .finally(() => {
        SplashScreen.hideAsync().catch(() => {});
      });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <SafeAreaProvider>
        <Stack key={langKey} screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
