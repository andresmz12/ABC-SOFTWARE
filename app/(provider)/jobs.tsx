import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import EmptyState from '@/components/ui/EmptyState';

type Tab = 'applied' | 'active' | 'completed';

export default function ProviderJobs() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('applied');
  const tabs: Tab[] = ['applied', 'active', 'completed'];

  return (
    <ScreenWrapper>
      <View className="px-5 pt-6 pb-4">
        <Text className="text-primary text-2xl font-heading">{t('provider.myJobs')}</Text>
      </View>
      <View className="flex-row border-b border-gray-200 mx-5">
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 py-3 items-center border-b-2 ${activeTab === tab ? 'border-primary' : 'border-transparent'}`}
          >
            <Text className={`text-sm font-body-medium ${activeTab === tab ? 'text-primary' : 'text-text-muted'}`}>
              {t(`provider.${tab}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <EmptyState
        title={t(`provider.no${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`)}
        icon="📋"
        subtitle="Jobs you've applied to will appear here."
      />
    </ScreenWrapper>
  );
}
