import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLang } from '@/context/LanguageContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useShallow } from 'zustand/react/shallow';
import JobCard from '@/components/cards/JobCard';
import { useAuthStore } from '@/store/authStore';
import { useJobStore } from '@/store/jobStore';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { supabase } from '@/lib/supabase';
import { C } from '@/constants/theme';

export default function ProviderHome() {
  const { lang } = useLang();
  const es = lang === 'es';
  const router = useRouter();
  const { user, refreshProfile } = useAuthStore(useShallow((s) => ({ user: s.user, refreshProfile: s.refreshProfile })));
  const {
    openJobs, loading, fetchOpenJobs, appliedJobs, activeJobs, fetchMyJobs,
    openJobsHasMore, loadingMore, loadMoreOpenJobs,
  } = useJobStore(
    useShallow((s) => ({
      openJobs: s.openJobs,
      loading: s.loading,
      fetchOpenJobs: s.fetchOpenJobs,
      appliedJobs: s.appliedJobs,
      activeJobs: s.activeJobs,
      fetchMyJobs: s.fetchMyJobs,
      openJobsHasMore: s.openJobsHasMore,
      loadingMore: s.loadingMore,
      loadMoreOpenJobs: s.loadMoreOpenJobs,
    })),
  );
  const isPending = user?.status === 'pending';
  const isColombia = user?.country === 'colombia';
  const [refreshing, setRefreshing] = useState(false);
  const [hasServiceAreas, setHasServiceAreas] = useState<boolean | null>(null);

  // Re-check approval status each time the screen comes into focus while pending
  useFocusEffect(useCallback(() => {
    if (isPending) refreshProfile();
  }, [isPending, refreshProfile]));

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

  // Check if provider has configured service areas (for onboarding banner)
  useEffect(() => {
    if (!user?.id || isPending) return;
    supabase
      .from('service_areas')
      .select('provider_id', { count: 'exact', head: true })
      .eq('provider_id', user.id)
      .then(({ count }) => setHasServiceAreas((count ?? 0) > 0));
  }, [user?.id, isPending]);

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
      <JobCard
        job={item}
        applied={isApplied}
        onPress={() => router.push({ pathname: '/(provider)/job-detail', params: { jobId: item.id } } as any)}
      />
    );
  }, [appliedJobs, router]);

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
                    ? 'Tu cuenta está siendo revisada. Recibirás una notificación cuando sea aprobada.'
                    : 'Your account is under review. You\'ll be notified when approved.'}
                </Text>
              </View>
            )}

            {/* Onboarding banner — shown when approved but no service areas configured */}
            {!isPending && hasServiceAreas === false && (
              <View style={{
                backgroundColor: '#FFF7ED',
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: '#F59E0B',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Feather name="map" size={16} color="#D97706" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#92400E', fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                    {es ? 'Configura tu área de servicio' : 'Set up your service area'}
                  </Text>
                </View>
                <Text style={{ color: '#92400E', fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19, marginBottom: 12 }}>
                  {es
                    ? 'Para ver trabajos disponibles, configura los estados donde ofreces tu servicio desde tu perfil.'
                    : 'To see available jobs, configure the states where you offer your service from your profile.'}
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/(provider)/profile' as any)}
                  style={{ backgroundColor: '#F59E0B', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
                  activeOpacity={0.85}
                >
                  <Text style={{ color: '#FFF', fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
                    {es ? 'Ir a Perfil' : 'Go to Profile'}
                  </Text>
                </TouchableOpacity>
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
        ListFooterComponent={
          <View style={{ paddingHorizontal: 16, paddingBottom: 32 }}>
            {/* Load more button */}
            {!isPending && openJobsHasMore && (
              <TouchableOpacity
                onPress={() => {
                  if (!user?.id || !user?.country) return;
                  loadMoreOpenJobs(user.country, user.id, user.role as 'company' | 'independent');
                }}
                disabled={loadingMore}
                style={{
                  height: 46,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: C.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                  opacity: loadingMore ? 0.6 : 1,
                }}
                activeOpacity={0.8}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color={C.accent} />
                ) : (
                  <Text style={{ color: C.accent, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                    {es ? 'Cargar más trabajos' : 'Load more jobs'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => router.push('/(shared)/chat' as any)}
              style={{
                backgroundColor: '#EFF6FF',
                borderRadius: 14,
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: `${C.accent}30`,
                marginTop: 8,
              }}
              activeOpacity={0.85}
            >
              <View style={{ width: 38, height: 38, backgroundColor: `${C.accent}18`, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Feather name="message-circle" size={18} color={C.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                  {es ? 'Contactar Soporte' : 'Contact Support'}
                </Text>
                <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 }}>
                  {es ? 'Chatea con el equipo ProVendor' : 'Chat with the ProVendor team'}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={C.textMuted} />
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}
