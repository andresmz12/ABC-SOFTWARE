import { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import JobCard from '@/components/cards/JobCard';
import EmptyState from '@/components/ui/EmptyState';
import {
  DEMO_APPLIED_JOBS,
  DEMO_ACTIVE_JOBS,
  DEMO_COMPLETED_JOBS,
} from '@/constants/demoData';
import type { JobRequest } from '@/types';

type Tab = 'applied' | 'active' | 'completed';

const TAB_DATA: Record<Tab, JobRequest[]> = {
  applied:   DEMO_APPLIED_JOBS,
  active:    DEMO_ACTIVE_JOBS,
  completed: DEMO_COMPLETED_JOBS,
};

const TAB_LABELS: Record<Tab, string> = {
  applied:   'Applied',
  active:    'Active',
  completed: 'Completed',
};

export default function ProviderJobs() {
  const [activeTab, setActiveTab] = useState<Tab>('applied');
  const jobs = TAB_DATA[activeTab];

  return (
    <ScreenWrapper>
      <View className="px-5 pt-8 pb-4">
        <Text className="text-primary text-3xl font-heading">My Jobs</Text>
        <Text className="text-text-muted font-body text-sm mt-0.5">Track your applications and active work</Text>
      </View>

      {/* Tab bar */}
      <View className="flex-row mx-5 mb-4 bg-gray-100 rounded-xl p-1">
        {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 py-2 items-center rounded-lg ${activeTab === tab ? 'bg-white' : ''}`}
            style={activeTab === tab ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 } : undefined}
          >
            <Text className={`text-xs font-body-medium ${activeTab === tab ? 'text-primary' : 'text-text-muted'}`}>
              {TAB_LABELS[tab]}
            </Text>
            {TAB_DATA[tab].length > 0 && (
              <View className={`mt-0.5 w-4 h-1 rounded-full ${activeTab === tab ? 'bg-secondary' : 'bg-transparent'}`} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {jobs.length === 0 ? (
        <EmptyState
          title={`No ${TAB_LABELS[activeTab].toLowerCase()} jobs`}
          icon="📋"
          subtitle="Jobs you apply to will appear here"
        />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <JobCard job={item} onPress={() => {}} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        />
      )}
    </ScreenWrapper>
  );
}
