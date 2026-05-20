import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import EmptyState from '@/components/ui/EmptyState';

type Tab = 'open' | 'in_progress' | 'completed';

export default function MyRequests() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('open');

  return (
    <ScreenWrapper>
      <View className="px-5 pt-6 pb-4">
        <Text className="text-primary text-2xl font-heading">{t('client.myRequests')}</Text>
      </View>
      <View className="flex-row border-b border-gray-200 mx-5">
        {(['open', 'in_progress', 'completed'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 py-3 items-center border-b-2 ${activeTab === tab ? 'border-primary' : 'border-transparent'}`}
          >
            <Text className={`text-xs font-body-medium ${activeTab === tab ? 'text-primary' : 'text-text-muted'}`}>
              {t(`status.${tab}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <EmptyState title={t('client.noRequests')} icon="📋" subtitle={t('client.postFirstJob')} />
    </ScreenWrapper>
  );
}
