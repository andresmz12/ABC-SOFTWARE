import { useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import JobCard from '@/components/cards/JobCard';
import { useAuthStore } from '@/store/authStore';
import { useJobStore } from '@/store/jobStore';
import EmptyState from '@/components/ui/EmptyState';
import { DEMO_JOB_ALERTS, CO_DEMO_JOB_ALERTS } from '@/constants/demoData';

export default function ProviderHome() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuthStore();
  const { openJobs, loading, fetchOpenJobs } = useJobStore();
  const isPending = user?.status === 'pending';
  const isColombia = user?.country === 'colombia';
  const isDemo = user?.id === 'demo';

  useEffect(() => {
    if (!isDemo && user?.country) {
      fetchOpenJobs(user.country);
    }
  }, [user?.country, isDemo]);

  const demoAlerts = isColombia ? CO_DEMO_JOB_ALERTS : DEMO_JOB_ALERTS;
  const displayJobs = openJobs.length > 0 ? openJobs : (isDemo ? demoAlerts : []);

  const greeting = isColombia ? 'Buenos días 👋' : 'Good morning 👋';
  const providerName = isDemo
    ? (isColombia ? 'Limpieza Total SAS' : 'CleanPro Services')
    : 'ProVendor';

  const areaLabel = isColombia
    ? 'Área metropolitana · Medellín'
    : 'Miami metro area · tap to apply';

  const alertsLabel = isColombia ? 'Alertas de Trabajo' : 'Job Alerts Near You';

  return (
    <ScreenWrapper>
      {/* Header */}
      <View className="px-5 pt-8 pb-5">
        <Text className="text-text-muted font-body text-sm">{greeting}</Text>
        <View className="flex-row items-center">
          {isColombia && <Text className="text-xl mr-2">🇨🇴</Text>}
          <Text className="text-primary text-3xl font-heading mt-0.5">{providerName}</Text>
        </View>
        {isColombia && (
          <Text className="text-text-muted font-body text-xs mt-0.5">Colombia · COP</Text>
        )}

        {/* Stats row */}
        <View className="flex-row gap-3 mt-4">
          <View className="flex-1 bg-white border border-gray-100 rounded-2xl px-4 py-3" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
            <Text className="text-primary text-xl font-heading">47</Text>
            <Text className="text-text-muted font-body text-xs">{isColombia ? 'Trabajos' : 'Jobs completed'}</Text>
          </View>
          <View className="flex-1 bg-white border border-gray-100 rounded-2xl px-4 py-3" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
            <Text className="text-secondary text-xl font-heading">4.9 ★</Text>
            <Text className="text-text-muted font-body text-xs">{isColombia ? 'Calificación' : 'Avg. rating'}</Text>
          </View>
          <View className="flex-1 bg-white border border-gray-100 rounded-2xl px-4 py-3" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
            <Text className="text-green-600 text-xl font-heading">
              {isColombia ? '$2.8M' : '$1.2k'}
            </Text>
            <Text className="text-text-muted font-body text-xs">{isColombia ? 'Este mes' : 'This month'}</Text>
          </View>
        </View>
      </View>

      {isPending && (
        <View className="mx-5 mb-4 bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <Text className="text-yellow-800 font-body-bold text-sm mb-1">⏳ {t('provider.pendingApproval')}</Text>
          <Text className="text-yellow-700 font-body text-xs">{t('provider.pendingApprovalMessage')}</Text>
        </View>
      )}

      {/* Section label */}
      {!isPending && (
        <View className="px-5 mb-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-text-main font-body-bold text-base">{alertsLabel}</Text>
            <View className="bg-secondary/15 px-2.5 py-0.5 rounded-full">
              <Text className="text-secondary font-body-bold text-xs">{displayJobs.length} new</Text>
            </View>
          </View>
          <Text className="text-text-muted font-body text-xs mt-0.5">{areaLabel}</Text>
        </View>
      )}

      {loading && !isPending && (
        <ActivityIndicator className="my-8" />
      )}

      {!loading && !isPending && displayJobs.length === 0 ? (
        <EmptyState title={t('provider.noJobAlerts')} icon="🔍" />
      ) : !loading ? (
        <FlatList
          data={displayJobs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <JobCard
              job={item}
              onPress={() => router.push({ pathname: '/(provider)/job-detail', params: { jobId: item.id } } as any)}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        />
      ) : null}
    </ScreenWrapper>
  );
}
