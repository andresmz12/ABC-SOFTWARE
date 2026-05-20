import '../global.css';
import '../lib/i18n';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Slot } from 'expo-router';
// Use the raw expo-splash-screen package here.
// expo-router's SplashScreen re-export uses usePreventRemove (react-navigation v7)
// which requires a NavigationContent context that doesn't exist at this layout
// level — it only exists inside a Stack/Tabs navigator. Using the raw package
// avoids that context dependency entirely.
import * as SplashScreen from 'expo-splash-screen';
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

// Prevent the splash screen from auto-hiding before assets load.
// Called at module scope so it fires before any component renders.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    // Only load fonts and init Stripe here — no navigation or auth.
    // Auth initialization is done in app/index.tsx, which is a screen
    // rendered inside expo-router's NavigationContainer, so useRouter()
    // and auth redirects work correctly there.
    Promise.all([
      Font.loadAsync({
        PlayfairDisplay_400Regular,
        PlayfairDisplay_700Bold,
        DMSans_400Regular,
        DMSans_500Medium,
        DMSans_700Bold,
      }),
      initializeStripe(),
    ])
      .catch(() => {})
      .finally(() => {
        SplashScreen.hideAsync().catch(() => {});
      });
  }, []);

  // Always render the Slot — never return null.
  // Returning null would unmount the NavigationContainer and cause every
  // child screen that calls useRouter() to throw "NavigationContent not found".
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Slot />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
