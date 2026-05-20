import { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import EmptyState from '@/components/ui/EmptyState';
import { DEMO_REQUESTS } from '@/constants/demoData';
import type { DemoRequest } from '@/constants/demoData';

type Tab = 'open' | 'in_progress' | 'completed';

const TAB_LABELS: Record<Tab, string> = {
  open:        'Open',
  in_progress: 'Active',
  completed:   'Completed',
};

function RequestCard({ req }: { req: DemoRequest }) {
  const isCommercial = req.serviceType === 'commercial';
  const leftColor = isCommercial ? '#1B3A6B' : '#C9A84C';

  return (
    <View
      className="bg-white rounded-2xl mb-3 overflow-hidden"
      style={{ borderLeftWidth: 4, borderLeftColor: leftColor, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3 }}
    >
      <View className="p-4">
        <View className="flex-row justify-between items-start mb-2">
          <Text className="text-text-main font-body-bold text-base flex-1 mr-2" numberOfLines={1}>
            {req.title}
          </Text>
          <View className={`px-2 py-0.5 rounded-full ${isCommercial ? 'bg-blue-100' : 'bg-amber-100'}`}>
            <Text className={`text-xs font-body-medium ${isCommercial ? 'text-blue-700' : 'text-amber-700'}`}>
              {isCommercial ? '🏢 Commercial' : '🏠 Residential'}
            </Text>
          </View>
        </View>

        <Text className="text-text-muted font-body text-xs mb-2">📍 {req.location} · 📅 {req.date}</Text>

        <View className="flex-row items-center justify-between">
          <View className="bg-secondary/10 px-3 py-1 rounded-full">
            <Text className="text-secondary font-body-bold text-xs">{req.budget}</Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-text-muted font-body text-xs mr-1">Bids received:</Text>
            <View className="bg-primary px-2 py-0.5 rounded-full">
              <Text className="text-white font-body-bold text-xs">{req.bidsCount}</Text>
            </View>
          </View>
        </View>
      </View>

      <View className="border-t border-gray-100 px-4 py-2.5 flex-row justify-between">
        <TouchableOpacity>
          <Text className="text-primary font-body-bold text-sm">View Bids</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Text className="text-text-muted font-body text-sm">Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MyRequests() {
  const [activeTab, setActiveTab] = useState<Tab>('open');
  const router = useRouter();
  const openRequests = DEMO_REQUESTS.filter((r) => r.status === 'open');
  const activeRequests = DEMO_REQUESTS.filter((r) => r.status === 'in_progress');
  const completedRequests = DEMO_REQUESTS.filter((r) => r.status === 'completed');

  const data: Record<Tab, DemoRequest[]> = {
    open: openRequests,
    in_progress: activeRequests,
    completed: completedRequests,
  };

  const current = data[activeTab];

  return (
    <ScreenWrapper>
      <View className="px-5 pt-8 pb-4">
        <Text className="text-primary text-3xl font-heading">My Requests</Text>
        <Text className="text-text-muted font-body text-sm mt-0.5">Track your service requests</Text>
      </View>

      {/* Tab bar */}
      <View className="flex-row mx-5 mb-4 bg-gray-100 rounded-xl p-1">
        {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => {
          const count = data[tab].length;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`flex-1 py-2 items-center rounded-lg ${activeTab === tab ? 'bg-white' : ''}`}
              style={activeTab === tab ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 } : undefined}
            >
              <View className="flex-row items-center">
                <Text className={`text-xs font-body-medium ${activeTab === tab ? 'text-primary' : 'text-text-muted'}`}>
                  {TAB_LABELS[tab]}
                </Text>
                {count > 0 && (
                  <View className={`ml-1 w-4 h-4 rounded-full items-center justify-center ${activeTab === tab ? 'bg-secondary' : 'bg-gray-300'}`}>
                    <Text className="text-white text-xs" style={{ fontSize: 9 }}>{count}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {current.length === 0 ? (
        <EmptyState
          title={`No ${TAB_LABELS[activeTab].toLowerCase()} requests`}
          icon="📋"
          subtitle="Post a job to get started"
          ctaLabel="Post a Job"
          onCta={() => router.push('/(client)/post-job' as any)}
        />
      ) : (
        <FlatList
          data={current}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RequestCard req={item} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        />
      )}
    </ScreenWrapper>
  );
}
