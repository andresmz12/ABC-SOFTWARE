import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import EmptyState from '@/components/ui/EmptyState';

export default function ProviderDocuments() {
  const { t } = useTranslation();
  return (
    <ScreenWrapper>
      <View className="px-5 pt-6 pb-4">
        <Text className="text-primary text-2xl font-heading">{t('documents.title')}</Text>
        <Text className="text-text-muted font-body text-sm">{t('documents.subtitle')}</Text>
      </View>
      <EmptyState title={t('provider.noDocuments')} icon="📄" subtitle={t('provider.uploadPrompt')} />
    </ScreenWrapper>
  );
}
