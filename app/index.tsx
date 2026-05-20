import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { View, ActivityIndicator } from 'react-native';

// This is a screen rendered inside expo-router's NavigationContainer,
// so useRouter() and auth redirects are safe here.
export default function Index() {
  const router = useRouter();
  const { user, loading, initialize } = useAuthStore();

  // Initialize auth session on first mount.
  // Moved here from _layout.tsx so it runs inside the navigator context.
  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/(auth)/welcome');
    } else if (user.role === 'client') {
      router.replace('/(client)/home');
    } else if (user.role === 'company' || user.role === 'independent') {
      router.replace('/(provider)/home');
    } else if (user.role === 'admin') {
      router.replace('/(admin)/dashboard');
    }
  }, [user, loading]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F9FC' }}>
      <ActivityIndicator size="large" color="#1B3A6B" />
    </View>
  );
}
