import { useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, SafeAreaView } from 'react-native';
import { useLang } from '@/context/LanguageContext';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import JobCard from '@/components/cards/JobCard';
import { useAuthStore } from '@/store/authStore';
import { useJobStore } from '@/store/jobStore';
import EmptyState from '@/components/ui/EmptyState';
import { C } from '@/constants/theme';

export default function ProviderHome() {
  const { t } = useLang();
  const router = useRouter();
  const { user } = useAuthStore();
  const { openJobs, loading, fetchOpenJobs } = useJobStore();
  const isPending = user?.status === 'pending';
  const isColombia = user?.country === 'colombia';

  useEffect(() => {
    if (user?.country && !isPending) {
      fetchOpenJobs(user.country);
    }
  }, [user?.country, isPending]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 16 }}>
        <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
          {isColombia ? 'Buenos días' : 'Good morning'}
        </Text>
        <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', marginTop: 2 }}>
          {isColombia ? 'Alertas de Trabajo' : 'Job Alerts'}
        </Text>
        {!isPending && openJobs.length > 0 && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 8,
            backgroundColor: C.surface,
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 4,
            alignSelf: 'flex-start',
            borderWidth: 1,
            borderColor: C.line,
          }}>
            <Feather name="map-pin" size={12} color={C.textMuted} />
            <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginLeft: 4 }}>
              {isColombia ? 'Tu área de servicio' : 'Your service area'}
            </Text>
          </View>
        )}
      </View>

      {isPending && (
        <View style={{
          marginHorizontal: 20,
          marginBottom: 16,
          backgroundColor: '#2a1e0a',
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: C.warning,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Feather name="clock" size={14} color={C.warning} style={{ marginRight: 6 }} />
            <Text style={{ color: C.warning, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
              {t('provider.pendingApproval')}
            </Text>
          </View>
          <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
            {t('provider.pendingApprovalMessage')}
          </Text>
        </View>
      )}

      {loading && !isPending ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent} size="large" />
        </View>
      ) : !isPending && openJobs.length === 0 ? (
        <EmptyState
          title={t('provider.noJobAlerts')}
          subtitle={isColombia
            ? 'No hay trabajos disponibles en tu área por ahora.'
            : 'No jobs available in your area right now.'}
          iconName="search"
        />
      ) : !isPending ? (
        <FlatList
          data={openJobs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <JobCard
              job={item}
              onPress={() => router.push({ pathname: '/(provider)/job-detail', params: { jobId: item.id } } as any)}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      ) : null}
    </SafeAreaView>
  );
}
