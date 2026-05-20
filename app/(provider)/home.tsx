import { View, Text, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import JobCard from '@/components/cards/JobCard';
import { DEMO_JOB_ALERTS } from '@/constants/demoData';

export default function ProviderHome() {
  const { t } = useTranslation();

  return (
    <ScreenWrapper>
      {/* Header */}
      <View className="px-5 pt-8 pb-5">
        <Text className="text-text-muted font-body text-sm">Good morning 👋</Text>
        <Text className="text-primary text-3xl font-heading mt-0.5">CleanPro Services</Text>

        {/* Stats row */}
        <View className="flex-row gap-3 mt-4">
          <View className="flex-1 bg-white border border-gray-100 rounded-2xl px-4 py-3" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
            <Text className="text-primary text-xl font-heading">47</Text>
            <Text className="text-text-muted font-body text-xs">Jobs completed</Text>
          </View>
          <View className="flex-1 bg-white border border-gray-100 rounded-2xl px-4 py-3" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
            <Text className="text-secondary text-xl font-heading">4.8 ★</Text>
            <Text className="text-text-muted font-body text-xs">Avg. rating</Text>
          </View>
          <View className="flex-1 bg-white border border-gray-100 rounded-2xl px-4 py-3" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
            <Text className="text-green-600 text-xl font-heading">$1.2k</Text>
            <Text className="text-text-muted font-body text-xs">This month</Text>
          </View>
        </View>
      </View>

      {/* Section label */}
      <View className="px-5 mb-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-text-main font-body-bold text-base">Job Alerts Near You</Text>
          <View className="bg-secondary/15 px-2.5 py-0.5 rounded-full">
            <Text className="text-secondary font-body-bold text-xs">{DEMO_JOB_ALERTS.length} new</Text>
          </View>
        </View>
        <Text className="text-text-muted font-body text-xs mt-0.5">Miami metro area · tap to apply</Text>
      </View>

      <FlatList
        data={DEMO_JOB_ALERTS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <JobCard job={item} onPress={() => {}} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
      />
    </ScreenWrapper>
  );
}
