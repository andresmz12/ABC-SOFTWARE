import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import JobCard from '@/components/cards/JobCard';
import EmptyState from '@/components/ui/EmptyState';
import { useAuthStore } from '@/store/authStore';
import { useJobStore } from '@/store/jobStore';
import {
  DEMO_APPLIED_JOBS,
  DEMO_ACTIVE_JOBS,
  DEMO_COMPLETED_JOBS,
} from '@/constants/demoData';
import type { JobRequest } from '@/types';

type Tab = 'applied' | 'active' | 'completed';

const TAB_LABELS: Record<Tab, string> = {
  applied:   'Applied',
  active:    'Active',
  completed: 'Completed',
};

const TAB_LABELS_ES: Record<Tab, string> = {
  applied:   'Aplicados',
  active:    'Activos',
  completed: 'Completados',
};

export default function ProviderJobs() {
  const [activeTab, setActiveTab] = useState<Tab>('applied');
  const router = useRouter();
  const { user } = useAuthStore();
  const { appliedJobs, activeJobs, completedJobs, fetchMyJobs, loading } = useJobStore();

  const isDemo = user?.id === 'demo';
  const isColombia = user?.country === 'colombia';
  const labels = isColombia ? TAB_LABELS_ES : TAB_LABELS;

  useEffect(() => {
    if (!isDemo && user?.id) {
      fetchMyJobs(user.id);
    }
  }, [user?.id, isDemo]);

  const tabData: Record<Tab, JobRequest[]> = isDemo
    ? { applied: DEMO_APPLIED_JOBS, active: DEMO_ACTIVE_JOBS, completed: DEMO_COMPLETED_JOBS }
    : { applied: appliedJobs, active: activeJobs, completed: completedJobs };

  const jobs = tabData[activeTab];

  return (
    <ScreenWrapper>
      <View className="px-5 pt-8 pb-4">
        <Text className="text-primary text-3xl font-heading">
          {isColombia ? 'Mis Trabajos' : 'My Jobs'}
        </Text>
        <Text className="text-text-muted font-body text-sm mt-0.5">
          {isColombia ? 'Seguimiento de aplicaciones y trabajo activo' : 'Track your applications and active work'}
        </Text>
      </View>

      {/* Tab bar */}
      <View className="flex-row mx-5 mb-4 bg-gray-100 rounded-xl p-1">
        {(Object.keys(labels) as Tab[]).map((tab) => {
          const count = tabData[tab].length;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`flex-1 py-2 items-center rounded-lg ${activeTab === tab ? 'bg-white' : ''}`}
              style={activeTab === tab ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 } : undefined}
            >
              <Text className={`text-xs font-body-medium ${activeTab === tab ? 'text-primary' : 'text-text-muted'}`}>
                {labels[tab]}
              </Text>
              {count > 0 && (
                <View className={`mt-0.5 w-4 h-1 rounded-full ${activeTab === tab ? 'bg-secondary' : 'bg-transparent'}`} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator className="mt-8" />
      ) : jobs.length === 0 ? (
        <EmptyState
          title={`No ${labels[activeTab].toLowerCase()} jobs`}
          icon="📋"
          subtitle={isColombia ? 'Los trabajos a los que apliques aparecerán aquí' : 'Jobs you apply to will appear here'}
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
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        />
      )}
    </ScreenWrapper>
  );
}
