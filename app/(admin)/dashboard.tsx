import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import ScreenWrapper from '@/components/layout/ScreenWrapper';

export default function AdminDashboard() {
  const { t } = useTranslation();

  const STATS = [
    { label: t('admin.pendingApprovals'), value: '0', icon: '⏳', color: 'bg-yellow-50 border-yellow-200' },
    { label: t('admin.activeJobs'), value: '0', icon: '💼', color: 'bg-blue-50 border-blue-200' },
    { label: t('admin.totalClients'), value: '0', icon: '👥', color: 'bg-green-50 border-green-200' },
    { label: t('admin.totalRevenue'), value: '$0', icon: '💰', color: 'bg-purple-50 border-purple-200' },
  ];

  return (
    <ScreenWrapper scroll className="px-5">
      <View className="pt-8 pb-6">
        <Text className="text-primary text-3xl font-heading">{t('admin.dashboard')}</Text>
        <Text className="text-text-muted font-body">{t('admin.overview')}</Text>
      </View>
      <View className="flex-row flex-wrap gap-3 mb-6">
        {STATS.map((stat) => (
          <View key={stat.label} className={`${stat.color} border rounded-2xl p-4 flex-1 min-w-[45%]`}>
            <Text className="text-2xl mb-2">{stat.icon}</Text>
            <Text className="text-text-main font-heading text-2xl">{stat.value}</Text>
            <Text className="text-text-muted font-body text-xs mt-1">{stat.label}</Text>
          </View>
        ))}
      </View>
    </ScreenWrapper>
  );
}
