import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import EmptyState from '@/components/ui/EmptyState';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { formatUSD, formatCOP } from '@/lib/countryData';
import { C } from '@/constants/theme';
import type { JobRequest } from '@/types';

type Tab = 'open' | 'in_progress' | 'completed';

const TAB_LABELS: Record<Tab, string> = {
  open:        'Open',
  in_progress: 'Active',
  completed:   'Done',
};

const TAB_LABELS_ES: Record<Tab, string> = {
  open:        'Abiertas',
  in_progress: 'Activas',
  completed:   'Listas',
};

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function RequestCard({ req, isColombia }: { req: JobRequest; isColombia: boolean }) {
  const isCommercial = req.service_type === 'commercial';
  const accentColor = isCommercial ? C.accent2 : C.accent;

  const budgetText = req.budget_usd
    ? req.budget_max_usd ? `${formatUSD(req.budget_usd)}–${formatUSD(req.budget_max_usd)}` : formatUSD(req.budget_usd)
    : req.budget_cop
    ? req.budget_max_cop ? `${formatCOP(req.budget_cop)}–${formatCOP(req.budget_max_cop)}` : formatCOP(req.budget_cop)
    : null;

  const location = isColombia
    ? `${(req as any).county ? (req as any).county + ', ' : ''}${req.city}`
    : `${req.city}, ${req.state}`;

  return (
    <View style={{
      backgroundColor: C.surface,
      borderRadius: 16,
      marginBottom: 12,
      overflow: 'hidden',
      borderLeftWidth: 3,
      borderLeftColor: accentColor,
      borderWidth: 1,
      borderColor: C.line,
    }}>
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_600SemiBold', flex: 1, marginRight: 8 }} numberOfLines={1}>
            {(req as any).title ?? (isCommercial ? 'Commercial Cleaning' : 'Residential Cleaning')}
          </Text>
          <View style={{
            backgroundColor: isCommercial ? '#0d1a2d' : '#2d1a0d',
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: accentColor,
          }}>
            <Text style={{ color: accentColor, fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>
              {isCommercial ? 'Commercial' : 'Residential'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Feather name="map-pin" size={11} color={C.textMuted} style={{ marginRight: 4 }} />
          <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginRight: 12 }}>
            {location}
          </Text>
          <Feather name="calendar" size={11} color={C.textMuted} style={{ marginRight: 4 }} />
          <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
            {req.scheduled_date}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {budgetText && (
            <View style={{
              backgroundColor: C.surface2,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: C.accent,
            }}>
              <Text style={{ color: C.accent, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>{budgetText}</Text>
            </View>
          )}
          <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginLeft: 'auto' }}>
            {timeAgo(req.created_at)}
          </Text>
        </View>
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: C.line, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
        <TouchableOpacity>
          <Text style={{ color: C.accent, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
            {isColombia ? 'Ver Ofertas' : 'View Bids'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
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
  const isColombia = user?.country === 'colombia';
  const labels = isColombia ? TAB_LABELS_ES : TAB_LABELS;

  const [jobs, setJobs] = useState<{ open: JobRequest[]; in_progress: JobRequest[]; completed: JobRequest[] }>({
    open: [], in_progress: [], completed: [],
  });
  const [loading, setLoading] = useState(false);

  const loadJobs = useCallback(async () => {
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
  }, [user?.id]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const current = jobs[activeTab];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 20 }}>
        <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold' }}>
          {isColombia ? 'Mis Solicitudes' : 'My Requests'}
        </Text>
        <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
          {isColombia ? 'Seguimiento de tus servicios' : 'Track your service requests'}
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
          const count = jobs[tab].length;
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
      ) : current.length === 0 ? (
        <EmptyState
          title={`No ${labels[activeTab].toLowerCase()} requests`}
          subtitle={isColombia ? 'Publica un trabajo para comenzar' : 'Post a job to get started'}
          iconName="clipboard"
          ctaLabel={isColombia ? 'Publicar Trabajo' : 'Post a Job'}
          onCta={() => router.push('/(client)/post-job' as any)}
        />
      ) : (
        <FlatList
          data={current}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RequestCard req={item} isColombia={isColombia} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
