import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import LanguageToggle from '@/components/ui/LanguageToggle';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types';

export default function Welcome() {
  const router = useRouter();
  const { t } = useTranslation();
  const enterDemoMode = useAuthStore((s) => s.enterDemoMode);

  const roles = [
    { key: 'company',     label: t('roles.company'),      desc: t('roles.companyDescription'),     route: '/(auth)/register/company/step1', icon: '🏢' },
    { key: 'independent', label: t('roles.independent'),  desc: t('roles.independentDescription'), route: '/(auth)/register/independent/step1', icon: '🧹' },
    { key: 'client',      label: t('roles.client'),       desc: t('roles.clientDescription'),      route: '/(auth)/register/client', icon: '🏠' },
  ] as const;

  return (
    <ScreenWrapper scroll className="px-6">
      <View className="flex-row justify-end pt-4 pb-2">
        <LanguageToggle />
      </View>

      <View className="items-center py-10">
        <View className="w-20 h-20 bg-primary rounded-2xl items-center justify-center mb-4">
          <Text className="text-white text-3xl font-heading">P</Text>
        </View>
        <Text className="text-primary text-4xl font-heading mb-2">ProVendor</Text>
        <Text className="text-text-muted font-body text-center text-base leading-6">
          {t('auth.welcomeSubtitle')}
        </Text>
      </View>

      <Text className="text-text-main font-body-bold text-lg mb-4 text-center">{t('roles.selectRole')}</Text>

      {roles.map((role) => (
        <TouchableOpacity
          key={role.key}
          onPress={() => router.push(role.route as any)}
          className="bg-white border border-gray-200 rounded-2xl p-5 mb-3 shadow-sm active:bg-accent"
        >
          <View className="flex-row items-center mb-2">
            <Text className="text-2xl mr-3">{role.icon}</Text>
            <Text className="text-primary font-body-bold text-lg">{role.label}</Text>
          </View>
          <Text className="text-text-muted font-body text-sm leading-5">{role.desc}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        onPress={() => router.push('/(auth)/login')}
        className="py-5 items-center"
      >
        <Text className="text-text-muted font-body">
          {t('auth.alreadyHaveAccount')}{' '}
          <Text className="text-primary font-body-bold">{t('auth.signIn')}</Text>
        </Text>
      </TouchableOpacity>

      {/* ── Demo Mode ── UI review only, bypasses auth ── */}
      <View className="border-t border-dashed border-gray-200 mt-2 pt-5 pb-8">
        <Text className="text-xs text-text-muted text-center mb-3 font-body">
          🔍 Skip Auth — Demo Mode
        </Text>
        <View className="flex-row gap-2">
          {(
            [
              { role: 'company'  as UserRole, label: 'Provider', icon: '🏢' },
              { role: 'client'   as UserRole, label: 'Client',   icon: '🏠' },
              { role: 'admin'    as UserRole, label: 'Admin',    icon: '⚙️' },
            ] as const
          ).map(({ role, label, icon }) => (
            <TouchableOpacity
              key={role}
              onPress={() => enterDemoMode(role)}
              className="flex-1 border border-dashed border-gray-300 rounded-xl py-3 items-center active:bg-accent"
            >
              <Text className="text-xl">{icon}</Text>
              <Text className="text-text-muted font-body text-xs mt-1">{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScreenWrapper>
  );
}
