import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import ScreenWrapper from '@/components/layout/ScreenWrapper';

export default function ClientHome() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const router = useRouter();

  return (
    <ScreenWrapper scroll className="px-5">
      <View className="pt-8 pb-6">
        <Text className="text-text-muted font-body text-sm">Welcome back 👋</Text>
        <Text className="text-primary text-3xl font-heading mt-1">{t('client.findProfessional')}</Text>
      </View>

      <TouchableOpacity
        onPress={() => router.push('/(client)/post-job' as any)}
        className="bg-primary rounded-2xl p-6 mb-4"
      >
        <Text className="text-secondary font-body text-sm mb-1">Ready to clean?</Text>
        <Text className="text-white text-xl font-heading">{t('client.postJobCTA')}</Text>
        <Text className="text-white/70 font-body text-sm mt-2">{t('client.postJobSubtitle')}</Text>
        <View className="bg-secondary rounded-xl py-3 px-5 mt-4 self-start">
          <Text className="text-white font-body-bold text-sm">Get Started →</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push('/(client)/browse-providers' as any)}
        className="bg-accent border border-primary/20 rounded-2xl p-5"
      >
        <Text className="text-primary font-body-bold text-base">{t('client.browseProviders')}</Text>
        <Text className="text-text-muted font-body text-sm mt-1">{t('client.browseSubtitle')}</Text>
      </TouchableOpacity>
    </ScreenWrapper>
  );
}
