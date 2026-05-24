import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useShallow } from 'zustand/react/shallow';
import JobCard from '@/components/cards/JobCard';
import EmptyState from '@/components/ui/EmptyState';
import { useAuthStore } from '@/store/authStore';
import { useJobStore } from '@/store/jobStore';
import { useLang } from '@/context/LanguageContext';
import { C } from '@/constants/theme';
import type { JobRequest } from '@/types';

type Tab = 'applied' | 'active' | 'completed';

export default function ProviderJobs() {
  const [activeTab, setActiveTab] = useState<Tab>('applied');
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { user } = useAuthStore(useShallow((s) => ({ user: s.user })));
  const { lang } = useLang();
  const es = lang === 'es';
  const isPending = user?.status === 'pending';
  const { appliedJobs, activeJobs, completedJobs, fetchMyJobs, loading, rejectedJobIds } = useJobStore(
    useShallow((s) => ({
      appliedJobs: s.appliedJobs,
      activeJobs: s.activeJobs,
      completedJobs: s.completedJobs,
      fetchMyJobs: s.fetchMyJobs,
      loading: s.loading,
      rejectedJobIds: s.rejectedJobIds,
    })),
  );

  const TAB_LABELS: Record<Tab, string> = es
    ? { applied: 'Aplicados', active: 'Activos', completed: 'Completados' }
    : { applied: 'Applied', active: 'Active', completed: 'Done' };

  useEffect(() => {
    if (user?.id && !isPending) fetchMyJobs(user.id);
  }, [user?.id, isPending]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (user?.id) await fetchMyJobs(user.id);
    setRefreshing(false);
  };

  const tabData: Record<Tab, JobRequest[]> = {
    applied: appliedJobs,
    active: activeJobs,
    completed: completedJobs,
  };

  const jobs = tabData[activeTab];

  const renderItem = useCallback(({ item }: { item: JobRequest }) => {
    const isRejected = activeTab === 'applied' && rejectedJobIds.includes(item.id);
    return (
      <View>
        <JobCard
          job={item}
          onPress={() => router.push({ pathname: '/(provider)/job-detail', params: { jobId: item.id } } as any)}
        />
        {isRejected && (
          <View style={{ marginTop: -6, marginBottom: 6, paddingHorizontal: 20, flexDirection: 'row' }}>
            <View style={{
              backgroundColor: '#2d0808',
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderWidth: 1,
              borderColor: C.danger,
            }}>
              <Text style={{ color: C.danger, fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>
                {es ? 'Rechazado' : 'Rejected'}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }, [activeTab, rejectedJobIds, router, es]);

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 20 }}>
        <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold' }}>
          {es ? 'Mis Trabajos' : 'My Jobs'}
        </Text>
        <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
          {es ? 'Aplicaciones y trabajo activo' : 'Applications and active work'}
        </Text>
      </View>

      {isPending ? (
        <View style={{
          marginHorizontal: 20,
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
              ? 'Podrás aplicar a trabajos una vez que tu cuenta sea aprobada.'
              : "You'll be able to apply for jobs once your account is approved."}
          </Text>
        </View>
      ) : (
        <>
          {/* Tab bar */}
          <View style={{
            flexDirection: 'row',
            marginHorizontal: 20,
            marginBottom: 16,
            backgroundColor: C.surface,
            borderRadius: 12,
            padding: 4,
            borderWidth: 1,
            borderColor: C.line,
          }}>
            {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => {
              const isActive = activeTab === tab;
              const count = tabData[tab].length;
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    alignItems: 'center',
                    borderRadius: 8,
                    backgroundColor: isActive ? C.accent : 'transparent',
                    flexDirection: 'row',
                    justifyContent: 'center',
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={{
                    fontSize: 12,
                    fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_400Regular',
                    color: isActive ? '#000' : C.textSecondary,
                  }}>
                    {TAB_LABELS[tab]}
                  </Text>
                  {count > 0 && (
                    <View style={{
                      marginLeft: 5,
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: isActive ? 'rgba(0,0,0,0.2)' : C.surface2,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 9, color: isActive ? '#000' : C.textSecondary, fontFamily: 'Inter_600SemiBold' }}>
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={C.accent} size="large" />
            </View>
          ) : jobs.length === 0 ? (
            <EmptyState
              title={es ? `Sin trabajos ${TAB_LABELS[activeTab].toLowerCase()}` : `No ${TAB_LABELS[activeTab].toLowerCase()} jobs`}
              subtitle={es ? 'Los trabajos aparecerán aquí' : 'Your jobs will appear here'}
              iconName="clipboard"
            />
          ) : (
            <FlatList
              data={jobs}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
            />
          )}
        </>
      )}
    </View>
  );
}
