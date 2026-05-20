import { View, Text, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useJobStore } from '@/store/jobStore';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import EmptyState from '@/components/ui/EmptyState';
import JobCard from '@/components/cards/JobCard';
import type { JobRequest } from '@/types';

const USA_DEMO_JOBS: JobRequest[] = [
  {
    id: 'demo-usa-1',
    client_id: 'demo-client',
    service_type: 'commercial',
    city: 'Miami',
    state: 'FL',
    zip: '33101',
    country: 'usa',
    scheduled_date: '2026-05-25',
    scheduled_time: '09:00',
    estimated_hours: 4,
    budget_usd: 280,
    description: 'Office deep clean — 3 floors, 20 workstations. Need supplies included.',
    status: 'open',
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-usa-2',
    client_id: 'demo-client-2',
    service_type: 'residential',
    city: 'Orlando',
    state: 'FL',
    zip: '32801',
    country: 'usa',
    scheduled_date: '2026-05-26',
    scheduled_time: '10:00',
    estimated_hours: 3,
    budget_usd: 150,
    description: '3-bedroom house, weekly cleaning service.',
    status: 'open',
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
];

const CO_DEMO_JOBS: JobRequest[] = [
  {
    id: 'demo-co-1',
    client_id: 'demo-client-co',
    service_type: 'commercial',
    city: 'Medellín',
    county: 'El Poblado',
    state: 'ANT',
    zip: '',
    country: 'colombia',
    scheduled_date: '2026-05-25',
    scheduled_time: '08:00',
    estimated_hours: 5,
    budget_cop: 450000,
    description: 'Limpieza de oficina — piso 3, El Poblado. Se requiere personal con experiencia en pisos de mármol.',
    status: 'open',
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-co-2',
    client_id: 'demo-client-co-2',
    service_type: 'residential',
    city: 'Bogotá D.C.',
    county: 'Chapinero',
    state: 'BOG',
    zip: '',
    country: 'colombia',
    scheduled_date: '2026-05-26',
    scheduled_time: '09:00',
    estimated_hours: 4,
    budget_cop: 320000,
    description: 'Apartamento de 3 habitaciones, servicio quincenal de limpieza.',
    status: 'open',
    created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
  },
];

export default function ProviderHome() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { openJobs } = useJobStore();
  const isPending = user?.status === 'pending';
  const isColombia = user?.country === 'colombia';

  const demoJobs = isColombia ? CO_DEMO_JOBS : USA_DEMO_JOBS;
  const displayJobs = openJobs.length > 0 ? openJobs : (user?.id === 'demo' ? demoJobs : []);

  return (
    <ScreenWrapper>
      <View className="px-5 pt-6 pb-4">
        <Text className="text-primary text-2xl font-heading">ProVendor</Text>
        <Text className="text-text-muted font-body text-sm">{t('provider.jobAlerts')}</Text>
        {isColombia && (
          <View className="flex-row items-center mt-1">
            <Text className="text-lg mr-1">🇨🇴</Text>
            <Text className="text-text-muted font-body text-xs">Colombia · COP</Text>
          </View>
        )}
      </View>

      {isPending && (
        <View className="mx-5 mb-4 bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <Text className="text-yellow-800 font-body-bold text-sm mb-1">⏳ {t('provider.pendingApproval')}</Text>
          <Text className="text-yellow-700 font-body text-xs">{t('provider.pendingApprovalMessage')}</Text>
        </View>
      )}

      {!isPending && displayJobs.length === 0 ? (
        <EmptyState title={t('provider.noJobAlerts')} icon="🔍" />
      ) : (
        <FlatList
          data={displayJobs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <JobCard job={item} onPress={() => {}} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          ListEmptyComponent={isPending ? null : undefined}
        />
      )}
    </ScreenWrapper>
  );
}
