import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'expo-router';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import LanguageToggle from '@/components/ui/LanguageToggle';

export default function ClientProfile() {
  const { t } = useTranslation();
  const { user, signOut } = useAuthStore();
  const router = useRouter();

  return (
    <ScreenWrapper scroll className="px-5">
      <View className="pt-6 pb-4">
        <Text className="text-primary text-2xl font-heading">{t('profile.title')}</Text>
      </View>
      <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
        <View className="w-16 h-16 bg-secondary rounded-full items-center justify-center mb-3">
          <Text className="text-white text-2xl font-heading">{user?.email?.[0]?.toUpperCase()}</Text>
        </View>
        <Text className="text-text-main font-body-bold text-lg">{user?.email}</Text>
        <Text className="text-text-muted font-body text-sm">Client</Text>
      </View>
      <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
        <Text className="text-text-main font-body-bold mb-3">{t('language.selectLanguage')}</Text>
        <LanguageToggle />
      </View>
      <TouchableOpacity
        onPress={async () => { await signOut(); router.replace('/(auth)/welcome'); }}
        className="bg-red-50 border border-red-200 rounded-2xl p-4 items-center"
      >
        <Text className="text-danger font-body-bold">{t('auth.signOut')}</Text>
      </TouchableOpacity>
    </ScreenWrapper>
  );
}
