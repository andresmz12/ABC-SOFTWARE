import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import EmptyState from '@/components/ui/EmptyState';
import { Feather } from '@expo/vector-icons';
import { useLang } from '@/context/LanguageContext';
import { C } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type JobStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
type CountryFilter = 'all' | 'usa' | 'colombia';
type StatusFilter = 'all' | JobStatus;

interface AdminJob {
  id: string;
  service_type: string;
  city: string;
  country: string;
  status: JobStatus;
  scheduled_date: string;
  created_at: string;
  client_email: string;
  budget_usd: number | null;
  budget_cop: number | null;
}

function buildStatusMeta(es: boolean): Record<JobStatus, { bg: string; text: string; label: string }> {
  return {
    open:        { bg: `${C.accent}20`,   text: C.accent,   label: es ? 'ABIERTA'   : 'OPEN' },
    in_progress: { bg: '#3B82F620',       text: '#3B82F6',  label: es ? 'ACTIVA'    : 'ACTIVE' },
    completed:   { bg: `${C.success}20`,  text: C.success,  label: es ? 'LISTA'     : 'DONE' },
    cancelled:   { bg: `${C.danger}20`,   text: C.danger,   label: es ? 'CANCELADA' : 'CANCELLED' },
  };
}

const COUNTRY_FILTERS: { key: CountryFilter; label: string }[] = [
  { key: 'all',      label: '🌎 Todos' },
  { key: 'usa',      label: '🇺🇸 USA' },
  { key: 'colombia', label: '🇨🇴 Colombia' },
];

const STATUS_FILTERS: { key: StatusFilter; labelEn: string; labelEs: string }[] = [
  { key: 'all',         labelEn: 'All',       labelEs: 'Todos' },
  { key: 'open',        labelEn: 'Open',      labelEs: 'Abiertas' },
  { key: 'in_progress', labelEn: 'Active',    labelEs: 'Activas' },
  { key: 'completed',   labelEn: 'Done',      labelEs: 'Listas' },
  { key: 'cancelled',   labelEn: 'Cancelled', labelEs: 'Canceladas' },
];

function JobRow({ job, es, onPress }: { job: AdminJob; es: boolean; onPress: () => void }) {
  const STATUS_META = buildStatusMeta(es);
  const meta = STATUS_META[job.status] ?? STATUS_META.open;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_600SemiBold', marginBottom: 2 }}>
            {job.service_type === 'commercial' ? (es ? 'Limpieza Comercial' : 'Commercial Cleaning') : (es ? 'Limpieza Residencial' : 'Residential Cleaning')}
            {job.budget_usd ? `  ·  $${job.budget_usd.toLocaleString('en-US')}` : job.budget_cop ? `  ·  $${job.budget_cop.toLocaleString('es-CO')} COP` : ''}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
            {job.client_email} · {job.city} · {job.country === 'colombia' ? '🇨🇴' : '🇺🇸'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ backgroundColor: meta.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: meta.text, fontSize: 10, fontFamily: 'Inter_600SemiBold' }}>{meta.label}</Text>
          </View>
          <Feather name="chevron-right" size={14} color={C.textMuted} />
        </View>
      </View>
      <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
        📅 {job.scheduled_date}
      </Text>
    </TouchableOpacity>
  );
}

export default function AdminJobs() {
  const { lang } = useLang();
  const es = lang === 'es';
  const router = useRouter();
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [countryFilter, setCountryFilter] = useState<CountryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('job_requests')
        .select('id, service_type, city, country, status, scheduled_date, created_at, budget_usd, budget_cop, client_id')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) console.error('[AdminJobs] query failed:', error.message);
      if (data) {
        const clientIds = [...new Set(data.map((j: any) => j.client_id).filter(Boolean))];
        const { data: clientRows } = clientIds.length > 0
          ? await supabase.from('clients').select('user_id, full_name').in('user_id', clientIds)
          : { data: [] };
        const clientMap = Object.fromEntries((clientRows ?? []).map((c: any) => [c.user_id, c.full_name]));
        setJobs(data.map((j: any) => ({
          ...j,
          client_email: clientMap[j.client_id] ?? `#${String(j.client_id).slice(0, 8)}`,
        })));
      }
    } catch (e: any) {
      console.error('[AdminJobs] unexpected error:', e?.message ?? e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const byCountry = countryFilter === 'all'
    ? jobs
    : jobs.filter((j) => j.country === countryFilter);

  const filtered = statusFilter === 'all'
    ? byCountry
    : byCountry.filter((j) => j.status === statusFilter);

  const countForCountry = (c: CountryFilter) =>
    c === 'all' ? jobs.length : jobs.filter((j) => j.country === c).length;

  return (
    <ScreenWrapper>
      <View style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 8, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>
            {es ? 'Todos los Trabajos' : 'All Jobs'}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
            {loading
              ? (es ? 'Cargando...' : 'Loading...')
              : es
                ? `${byCountry.length} trabajo${byCountry.length !== 1 ? 's' : ''} en la plataforma`
                : `${byCountry.length} job${byCountry.length !== 1 ? 's' : ''} on the platform`}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(admin)/new-job' as any)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.accent2, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, marginTop: 4 }}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={16} color="#FFF" />
          <Text style={{ color: '#FFF', fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
            {es ? 'Nuevo' : 'New Job'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Country filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 8, paddingVertical: 4 }} style={{ marginTop: 16 }}>
        {COUNTRY_FILTERS.map((c) => {
          const active = countryFilter === c.key;
          const count = countForCountry(c.key);
          return (
            <TouchableOpacity
              key={c.key}
              onPress={() => setCountryFilter(c.key)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 9999,
                backgroundColor: active ? C.accent2 : C.surface,
                borderWidth: 1,
                borderColor: active ? C.accent2 : C.line,
              }}
              activeOpacity={0.85}
            >
              <Text style={{ color: active ? '#fff' : C.textMuted, fontSize: 13, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }}>
                {c.label}{count > 0 ? ` (${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Status filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 8, paddingVertical: 4 }} style={{ marginTop: 8, marginBottom: 8 }}>
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.key;
          const count = f.key === 'all' ? byCountry.length : byCountry.filter((j) => j.status === f.key).length;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setStatusFilter(f.key)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 9999,
                backgroundColor: active ? C.accent : C.surface,
                borderWidth: 1,
                borderColor: active ? C.accent : C.line,
              }}
              activeOpacity={0.85}
            >
              <Text style={{ color: active ? '#000' : C.textMuted, fontSize: 13, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }}>
                {es ? f.labelEs : f.labelEn}{count > 0 ? ` (${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={C.accent} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={es ? 'Sin resultados' : 'No results'}
          subtitle={es ? 'Prueba con otro filtro.' : 'Try a different filter.'}
          iconName="briefcase"
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <JobRow job={item} es={es} onPress={() => router.push({ pathname: '/(admin)/job-detail', params: { jobId: item.id } } as any)} />}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenWrapper>
  );
}
