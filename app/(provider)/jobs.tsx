/**
 * Provider — Jobs
 * Browses open job requests posted by clients that match the provider's
 * service areas. Tapping a job navigates to job-detail where they can apply.
 */
import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useShallow } from 'zustand/react/shallow';
import JobCard from '@/components/cards/JobCard';
import EmptyState from '@/components/ui/EmptyState';
import { useAuthStore } from '@/store/authStore';
import { useJobStore } from '@/store/jobStore';
import { useLang } from '@/context/LanguageContext';
import { C } from '@/constants/theme';
import type { JobRequest } from '@/types';

type Filter = 'all' | 'commercial' | 'residential';

export default function ProviderJobs() {
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { user } = useAuthStore(useShallow((s) => ({ user: s.user })));
  const { lang } = useLang();
  const es = lang === 'es';
  const isPending = user?.status === 'pending';

  const { openJobs, fetchOpenJobs, loading, appliedJobs, fetchMyJobs } = useJobStore(
    useShallow((s) => ({
      openJobs: s.openJobs,
      fetchOpenJobs: s.fetchOpenJobs,
      loading: s.loading,
      appliedJobs: s.appliedJobs,
      fetchMyJobs: s.fetchMyJobs,
    })),
  );

  const load = useCallback(async () => {
    if (!user?.id || isPending) return;
    await Promise.all([
      fetchOpenJobs(
        (user.country ?? 'usa') as any,
        user.id,
        user.role as 'company' | 'independent',
      ),
      fetchMyJobs(user.id),
    ]);
  }, [user?.id, user?.country, user?.role, isPending, fetchOpenJobs, fetchMyJobs]);

  // Refresh every time the tab comes into focus so new jobs appear
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const FILTER_LABELS: Record<Filter, string> = es
    ? { all: 'Todos', commercial: 'Comercial', residential: 'Residencial' }
    : { all: 'All', commercial: 'Commercial', residential: 'Residential' };

  const filtered = filter === 'all'
    ? openJobs
    : openJobs.filter((j) => j.service_type === filter);

  const renderItem = useCallback(({ item }: { item: JobRequest }) => {
    const isApplied = appliedJobs.some((aj) => aj.id === item.id);
    return (
      <JobCard
        job={item}
        applied={isApplied}
        onPress={() => router.push({ pathname: '/(provider)/job-detail', params: { jobId: item.id } } as any)}
      />
    );
  }, [router, appliedJobs]);

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 8 }}>
        <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold' }}>
          {es ? 'Trabajos' : 'Jobs'}
        </Text>
        <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
          {isPending
            ? (es ? 'Disponible cuando tu cuenta sea aprobada' : 'Available once your account is approved')
            : `${filtered.length} ${es ? 'trabajos en tu área' : 'jobs in your area'}`}
        </Text>
      </View>

      {isPending ? (
        <View style={{
          margin: 20,
          backgroundColor: '#FFF3CD',
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: C.warning,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Feather name="clock" size={14} color={C.warning} style={{ marginRight: 6 }} />
            <Text style={{ color: C.warning, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
              {es ? 'Pendiente de Aprobación' : 'Pending Approval'}
            </Text>
          </View>
          <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
            {es
              ? 'Podrás ver y aplicar a trabajos una vez que tu cuenta sea aprobada.'
              : "You'll be able to see and apply for jobs once your account is approved."}
          </Text>
        </View>
      ) : (
        <>
          {/* Filter chips */}
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 12, marginBottom: 16 }}>
            {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => {
              const active = filter === f;
              const count = f === 'all' ? openJobs.length : openJobs.filter((j) => j.service_type === f).length;
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilter(f)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 9999,
                    backgroundColor: active ? C.accent : C.surface,
                    borderWidth: 1,
                    borderColor: active ? C.accent : C.line,
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={{
                    color: active ? '#000' : C.textMuted,
                    fontSize: 13,
                    fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular',
                  }}>
                    {FILTER_LABELS[f]}{count > 0 ? ` (${count})` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {loading && !refreshing ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={C.accent} size="large" />
            </View>
          ) : filtered.length === 0 ? (
            <EmptyState
              title={es ? 'Sin trabajos disponibles' : 'No jobs available'}
              subtitle={es
                ? 'Cuando un cliente publique un trabajo en tu área aparecerá aquí.'
                : 'When a client posts a job in your service area it will appear here.'}
              iconName="briefcase"
            />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
              }
            />
          )}
        </>
      )}
    </View>
  );
}
