import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const router = useRouter();
  const { user, loading } = useAuthStore();

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
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" color="#1B3A6B" />
    </View>
  );
}
