import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import { useAuthStore } from '@/store/authStore';
import { useRegistrationStore } from '@/store/registrationStore';
import type { UserRole } from '@/types';

export default function Welcome() {
  const router = useRouter();
  const { t } = useTranslation();
  const enterDemoMode = useAuthStore((s) => s.enterDemoMode);
  const reset = useRegistrationStore((s) => s.reset);

  const demoRoutes: Record<string, string> = {
    company: '/(provider)/home',
    client: '/(client)/home',
    admin: '/(admin)/dashboard',
  };

  const handleCreateAccount = () => {
    reset();
    router.push('/(auth)/register/country-select' as any);
  };

  return (
    <ScreenWrapper scroll className="px-6">
      <View className="items-center py-16">
        <View className="w-24 h-24 bg-primary rounded-3xl items-center justify-center mb-6 shadow-md">
          <Text className="text-white text-4xl font-heading">P</Text>
        </View>
        <Text className="text-primary text-5xl font-heading mb-3">ProVendor</Text>
        <Text className="text-text-muted font-body text-center text-base leading-7 px-4">
          {t('auth.welcomeSubtitle')}
        </Text>
      </View>

      <View className="gap-3 mb-6">
        <TouchableOpacity
          onPress={handleCreateAccount}
          className="bg-primary rounded-2xl py-4 items-center shadow-sm"
        >
          <Text className="text-white font-body-bold text-base">{t('auth.signUp')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/login')}
          className="bg-white border border-primary/30 rounded-2xl py-4 items-center"
        >
          <Text className="text-primary font-body-bold text-base">{t('auth.signIn')}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Demo Mode ── UI review only, bypasses auth ── */}
      <View className="border-t border-dashed border-gray-200 mt-2 pt-5 pb-8">
        <Text className="text-xs text-text-muted text-center mb-3 font-body">
          🔍 Skip Auth — Demo Mode
        </Text>
        <View className="flex-row gap-2">
          {(
            [
              { role: 'company' as UserRole, label: 'Provider 🇺🇸', icon: '🏢' },
              { role: 'client' as UserRole, label: 'Client', icon: '🏠' },
              { role: 'admin' as UserRole, label: 'Admin', icon: '⚙️' },
            ] as const
          ).map(({ role, label, icon }) => (
            <TouchableOpacity
              key={role}
              onPress={() => {
                enterDemoMode(role);
                router.replace(demoRoutes[role] as any);
              }}
              className="flex-1 border border-dashed border-gray-300 rounded-xl py-3 items-center active:bg-accent"
            >
              <Text className="text-xl">{icon}</Text>
              <Text className="text-text-muted font-body text-xs mt-1">{label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => {
              enterDemoMode('company', 'colombia');
              router.replace('/(provider)/home' as any);
            }}
            className="flex-1 border border-dashed border-yellow-300 rounded-xl py-3 items-center active:bg-accent"
          >
            <Text className="text-xl">🏢</Text>
            <Text className="text-text-muted font-body text-xs mt-1">Provider 🇨🇴</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenWrapper>
  );
}
