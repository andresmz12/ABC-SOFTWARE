import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { useLang } from '@/context/LanguageContext';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useShallow } from 'zustand/react/shallow';
import JobCard from '@/components/cards/JobCard';
import { useAuthStore } from '@/store/authStore';
import { useJobStore } from '@/store/jobStore';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { C } from '@/constants/theme';

export default function ProviderHome() {
  const { lang } = useLang();
  const es = lang === 'es';
  const router = useRouter();
  const { user } = useAuthStore(useShallow((s) => ({ user: s.user })));
  const { openJobs, loading, fetchOpenJobs, appliedJobs, activeJobs, fetchMyJobs } = useJobStore(
    useShallow((s) => ({
      openJobs: s.openJobs,
      loading: s.loading,
      fetchOpenJobs: s.fetchOpenJobs,
      appliedJobs: s.appliedJobs,
      activeJobs: s.activeJobs,
      fetchMyJobs: s.fetchMyJobs,
    })),
  );
  const isPending = user?.status === 'pending';
  const isColombia = user?.country === 'colombia';
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = async () => {
    if (!user?.country) return;
    await Promise.all([
      isPending
        ? Promise.resolve()
        : fetchOpenJobs(
            user.country,
            user.id,
            user.role as 'company' | 'independent',
          ),
      user.id ? fetchMyJobs(user.id) : Promise.resolve(),
    ]);
  };

  useEffect(() => { loadAll(); }, [user?.id, user?.country, isPending]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (es) return h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches';
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  };

  const renderItem = useCallback(({ item }: { item: (typeof openJobs)[0] }) => {
    const isApplied = appliedJobs.some((aj) => aj.id === item.id);
    return (
      <View>
        <JobCard
          job={item}
          onPress={() => router.push({ pathname: '/(provider)/job-detail', params: { jobId: item.id } } as any)}
        />
        {isApplied && (
          <View style={{ marginTop: -6, marginBottom: 6, paddingHorizontal: 20 }}>
            <View style={{
              backgroundColor: `${C.success}20`,
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderWidth: 1,
              borderColor: C.success,
              alignSelf: 'flex-start',
            }}>
              <Text style={{ color: C.success, fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>
                {es ? 'Aplicado' : 'Applied'}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }, [appliedJobs, router, es]);

  const stats = [
    { icon: 'briefcase' as const, value: openJobs.length,   label: es ? 'Disponibles' : 'Available',   color: C.accent },
    { icon: 'zap'       as const, value: activeJobs.length, label: es ? 'Activos'     : 'Active',       color: '#3B82F6' },
    { icon: 'send'      as const, value: appliedJobs.length,label: es ? 'Aplicados'   : 'Applied',      color: C.warning },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <FlatList
        data={isPending ? [] : openJobs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        ListHeaderComponent={
          <View>
            <View style={{ paddingBottom: 20, paddingTop: 32 }}>
              <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular' }}>{greeting()}</Text>
              <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', marginTop: 2, letterSpacing: -0.5 }}>
                {es ? 'Alertas de Trabajo' : 'Job Alerts'}
              </Text>
            </View>

            {!isPending && (
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                {stats.map((s) => (
                  <View key={s.label} style={{
                    flex: 1,
                    backgroundColor: C.surface,
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: C.line,
                    alignItems: 'center',
                  }}>
                    <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: `${s.color}20`, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                      <Feather name={s.icon} size={14} color={s.color} />
                    </View>
                    <Text style={{ color: C.textPrimary, fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>{s.value}</Text>
                    <Text style={{ color: C.textMuted, fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 2, textAlign: 'center' }}>{s.label}</Text>
                  </View>
                ))}
              </View>
            )}

            {isPending && (
              <View style={{
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
                    {es ? 'Pendiente de Aprobación' : 'Pending Approval'}
                  </Text>
                </View>
                <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
                  {es
                    ? 'Tu cuenta está siendo revisada. Recibirás una notificación cuando sea aprobada.'
                    : 'Your account is under review. You\'ll be notified when approved.'}
                </Text>
              </View>
            )}

            {!isPending && openJobs.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Feather name="map-pin" size={12} color={C.textMuted} style={{ marginRight: 4 }} />
                <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
                  {es ? 'Trabajo en tu área de servicio' : 'Jobs in your service area'}
                </Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <SkeletonList count={5} />
          ) : isPending ? null : (
            <EmptyState
              title={es ? 'Sin alertas nuevas' : 'No job alerts'}
              subtitle={es
                ? 'No hay trabajos disponibles en tu área ahora mismo.'
                : 'No jobs available in your area right now.'}
              iconName="search"
            />
          )
        }
      />
    </View>
  );
}
