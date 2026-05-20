import '../global.css';
import '../lib/i18n';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// Use expo-router's SplashScreen wrapper — it integrates with the navigation
// context (react-navigation v7 NavigationContent) so preventAutoHideAsync does
// not throw "Couldn't find the prevent remove context".
import { Slot, SplashScreen } from 'expo-router';
import * as Font from 'expo-font';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { initializeStripe } from '@/lib/stripe';
import { useAuthStore } from '@/store/authStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    Promise.all([
      Font.loadAsync({
        PlayfairDisplay_400Regular,
        PlayfairDisplay_700Bold,
        DMSans_400Regular,
        DMSans_500Medium,
        DMSans_700Bold,
      }),
      initializeStripe(),
      initialize(),
    ]).then(() => {
      SplashScreen.hideAsync();
    });
  }, []);

  // Never return null — tearing down the layout unmounts NavigationContainer
  // and causes child screens that call useRouter() to throw
  // "Couldn't find the prevent remove context".
  // The splash screen covers the UI until the Promise.all above resolves.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Slot />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
