import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import EmptyState from '@/components/ui/EmptyState';

export default function BrowseProviders() {
  const { t } = useTranslation();
  return (
    <ScreenWrapper>
      <View className="px-5 pt-6 pb-4">
        <Text className="text-primary text-2xl font-heading">{t('client.browseProviders')}</Text>
        <Text className="text-text-muted font-body text-sm">{t('client.browseSubtitle')}</Text>
      </View>
      <EmptyState title="No providers found" icon="🔍" subtitle="Try adjusting your filters." />
    </ScreenWrapper>
  );
}
