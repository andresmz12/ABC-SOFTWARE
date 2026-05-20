import { View, Text, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useJobStore } from '@/store/jobStore';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import JobCard from '@/components/cards/JobCard';

export default function ProviderHome() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { openJobs } = useJobStore();
  const isPending = user?.status === 'pending';

  return (
    <ScreenWrapper>
      <View className="px-5 pt-6 pb-4">
        <Text className="text-primary text-2xl font-heading">ProVendor</Text>
        <Text className="text-text-muted font-body text-sm">{t('provider.jobAlerts')}</Text>
      </View>

      {isPending && (
        <View className="mx-5 mb-4 bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <Text className="text-yellow-800 font-body-bold text-sm mb-1">⏳ {t('provider.pendingApproval')}</Text>
          <Text className="text-yellow-700 font-body text-xs">{t('provider.pendingApprovalMessage')}</Text>
        </View>
      )}

      {!isPending && openJobs.length === 0 ? (
        <EmptyState title={t('provider.noJobAlerts')} icon="🔍" />
      ) : (
        <FlatList
          data={openJobs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <JobCard job={item} onPress={() => {}} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          ListEmptyComponent={isPending ? null : undefined}
        />
      )}
    </ScreenWrapper>
  );
}
