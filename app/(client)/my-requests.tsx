import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import EmptyState from '@/components/ui/EmptyState';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { formatUSD, formatCOP } from '@/lib/countryData';
import { DEMO_REQUESTS } from '@/constants/demoData';
import type { JobRequest } from '@/types';

type Tab = 'open' | 'in_progress' | 'completed';

const TAB_LABELS: Record<Tab, string> = {
  open:        'Open',
  in_progress: 'Active',
  completed:   'Completed',
};

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function RequestCard({ req, isColombia, onViewBids, onEdit }: { req: JobRequest; isColombia: boolean; onViewBids: () => void; onEdit: () => void; }) {
  const isCommercial = req.service_type === 'commercial';
  const leftColor = isCommercial ? '#1B3A6B' : '#C9A84C';

  const budgetText = req.budget_usd
    ? req.budget_max_usd ? `${formatUSD(req.budget_usd)}–${formatUSD(req.budget_max_usd)}` : formatUSD(req.budget_usd)
    : req.budget_cop
    ? req.budget_max_cop ? `${formatCOP(req.budget_cop)}–${formatCOP(req.budget_max_cop)}` : formatCOP(req.budget_cop)
    : null;

  const location = isColombia
    ? `${req.county ? req.county + ', ' : ''}${req.city}`
    : `${req.city}, ${req.state}`;

  return (
    <View
      className="bg-white rounded-2xl mb-3 overflow-hidden"
      style={{ borderLeftWidth: 4, borderLeftColor: leftColor, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3 }}
    >
      <View className="p-4">
        <View className="flex-row justify-between items-start mb-2">
          <Text className="text-text-main font-body-bold text-base flex-1 mr-2" numberOfLines={1}>
            {req.title ?? (isCommercial ? 'Commercial Cleaning' : 'Residential Cleaning')}
          </Text>
          <View className={`px-2 py-0.5 rounded-full ${isCommercial ? 'bg-blue-100' : 'bg-amber-100'}`}>
            <Text className={`text-xs font-body-medium ${isCommercial ? 'text-blue-700' : 'text-amber-700'}`}>
              {isCommercial ? '🏢 Commercial' : '🏠 Residential'}
            </Text>
          </View>
        </View>

        <Text className="text-text-muted font-body text-xs mb-2">
          📍 {location} · 📅 {req.scheduled_date}
        </Text>

        <View className="flex-row items-center justify-between">
          {budgetText && (
            <View className="bg-secondary/10 px-3 py-1 rounded-full">
              <Text className="text-secondary font-body-bold text-xs">{budgetText}</Text>
            </View>
          )}
          <Text className="text-text-muted font-body text-xs">{timeAgo(req.created_at)}</Text>
        </View>
      </View>

      <View className="border-t border-gray-100 px-4 py-2.5 flex-row justify-between">
        <TouchableOpacity onPress={onViewBids}>
          <Text className="text-primary font-body-bold text-sm">
            {isColombia ? 'Ver Ofertas' : 'View Bids'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onEdit}>
          <Text className="text-text-muted font-body text-sm">
            {isColombia ? 'Editar' : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MyRequests() {
  const [activeTab, setActiveTab] = useState<Tab>('open');
  const router = useRouter();
  const { user } = useAuthStore();
  const isDemo = user?.id === 'demo';
  const isColombia = user?.country === 'colombia';

  const [jobs, setJobs] = useState<{ open: JobRequest[]; in_progress: JobRequest[]; completed: JobRequest[] }>({
    open: [], in_progress: [], completed: [],
  });
  const [loading, setLoading] = useState(false);

  const loadJobs = useCallback(async () => {
    if (isDemo) {
      const open = DEMO_REQUESTS.filter((r) => r.status === 'open').map((r) => ({
        id: r.id, client_id: 'demo', title: r.title,
        service_type: r.serviceType, city: r.location.split(',')[0], state: r.location.split(', ')[1] ?? '',
        zip: '', country: 'usa' as const, scheduled_date: r.date, scheduled_time: '',
        estimated_hours: 0, budget_usd: parseFloat(r.budget.replace(/[^0-9]/g, '')),
        status: 'open' as const, created_at: new Date().toISOString(),
      }));
      setJobs({ open, in_progress: [], completed: [] });
      return;
    }
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('job_requests')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });
      const allJobs = data ?? [];
      setJobs({
        open:        allJobs.filter((j) => j.status === 'open'),
        in_progress: allJobs.filter((j) => j.status === 'in_progress'),
        completed:   allJobs.filter((j) => j.status === 'completed'),
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, isDemo]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const current = jobs[activeTab];

  return (
    <ScreenWrapper>
      <View className="px-5 pt-8 pb-4">
        <Text className="text-primary text-3xl font-heading">
          {isColombia ? 'Mis Solicitudes' : 'My Requests'}
        </Text>
        <Text className="text-text-muted font-body text-sm mt-0.5">
          {isColombia ? 'Seguimiento de tus solicitudes' : 'Track your service requests'}
        </Text>
      </View>

      {/* Tab bar */}
      <View className="flex-row mx-5 mb-4 bg-gray-100 rounded-xl p-1">
        {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => {
          const count = jobs[tab].length;
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

      {loading ? (
        <ActivityIndicator className="mt-8" />
      ) : current.length === 0 ? (
        <EmptyState
          title={`No ${TAB_LABELS[activeTab].toLowerCase()} requests`}
          iconName="file-text"
          subtitle={isColombia ? 'Publica un trabajo para comenzar' : 'Post a job to get started'}
          ctaLabel={isColombia ? 'Publicar Trabajo' : 'Post a Job'}
          onCta={() => router.push('/(client)/post-job' as any)}
        />
      ) : (
        <FlatList
          data={current}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RequestCard
              req={item}
              isColombia={isColombia}
              onViewBids={() => Alert.alert(
                isColombia ? 'Ofertas' : 'Bids',
                isColombia ? 'La vista de ofertas estará disponible pronto.' : 'Bid viewing is coming soon.',
              )}
              onEdit={() => Alert.alert(
                isColombia ? 'Editar' : 'Edit',
                isColombia ? 'La edición de solicitudes estará disponible pronto.' : 'Editing requests is coming soon.',
              )}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        />
      )}
    </ScreenWrapper>
  );
}
