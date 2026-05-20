import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import EmptyState from '@/components/ui/EmptyState';

export default function AdminProviders() {
  const { t } = useTranslation();
  return (
    <ScreenWrapper>
      <View className="px-5 pt-6 pb-4">
        <Text className="text-primary text-2xl font-heading">{t('admin.providers')}</Text>
      </View>
      <EmptyState title={t('admin.noProviders')} icon="🏢" />
    </ScreenWrapper>
  );
}
