import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import JobCard from '@/components/cards/JobCard';
import EmptyState from '@/components/ui/EmptyState';
import { useAuthStore } from '@/store/authStore';
import { useJobStore } from '@/store/jobStore';
import { C } from '@/constants/theme';
import type { JobRequest } from '@/types';

type Tab = 'applied' | 'active' | 'completed';

const TAB_EN: Record<Tab, string> = { applied: 'Applied', active: 'Active', completed: 'Done' };
const TAB_ES: Record<Tab, string> = { applied: 'Aplicados', active: 'Activos', completed: 'Completados' };

export default function ProviderJobs() {
  const [activeTab, setActiveTab] = useState<Tab>('applied');
  const router = useRouter();
  const { user } = useAuthStore();
  const { appliedJobs, activeJobs, completedJobs, fetchMyJobs, loading } = useJobStore();
  const isColombia = user?.country === 'colombia';
  const labels = isColombia ? TAB_ES : TAB_EN;

  useEffect(() => {
    if (user?.id) fetchMyJobs(user.id);
  }, [user?.id]);

  const tabData: Record<Tab, JobRequest[]> = {
    applied: appliedJobs,
    active: activeJobs,
    completed: completedJobs,
  };

  const jobs = tabData[activeTab];

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 20 }}>
        <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold' }}>
          {isColombia ? 'Mis Trabajos' : 'My Jobs'}
        </Text>
        <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
          {isColombia ? 'Aplicaciones y trabajo activo' : 'Applications and active work'}
        </Text>
      </View>

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
        {(Object.keys(labels) as Tab[]).map((tab) => {
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
                {labels[tab]}
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
          title={`No ${labels[activeTab].toLowerCase()} jobs`}
          subtitle={isColombia ? 'Los trabajos aparecerán aquí' : 'Your jobs will appear here'}
          iconName="clipboard"
        />
      ) : (
        <FlatList
          data={jobs}
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
      )}
    </View>
  );
}
