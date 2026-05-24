import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import EmptyState from '@/components/ui/EmptyState';
import { useLang } from '@/context/LanguageContext';
import { C } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type JobStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

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

function JobRow({ job, es }: { job: AdminJob; es: boolean }) {
  const STATUS_META = buildStatusMeta(es);
  const meta = STATUS_META[job.status] ?? STATUS_META.open;
  return (
    <View style={{
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
    }}>
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
        <View style={{ backgroundColor: meta.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={{ color: meta.text, fontSize: 10, fontFamily: 'Inter_600SemiBold' }}>{meta.label}</Text>
        </View>
      </View>
      <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
        📅 {job.scheduled_date}
      </Text>
    </View>
  );
}

export default function AdminJobs() {
  const { lang } = useLang();
  const es = lang === 'es';
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [loading, setLoading] = useState(true);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('job_requests')
        .select('id, service_type, city, country, status, scheduled_date, created_at, budget_usd, budget_cop, users!client_id(email)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) console.error('[AdminJobs] query failed:', error.message);
      if (data) {
        setJobs(data.map((j: any) => ({
          ...j,
          client_email: j.users?.email ?? 'Unknown',
        })));
      }
    } catch (e: any) {
      console.error('[AdminJobs] unexpected error:', e?.message ?? e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  return (
    <ScreenWrapper>
      <View style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 8 }}>
        <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>
          {es ? 'Todos los Trabajos' : 'All Jobs'}
        </Text>
        <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
          {loading
            ? (es ? 'Cargando...' : 'Loading...')
            : es
              ? `${jobs.length} trabajo${jobs.length !== 1 ? 's' : ''} en la plataforma`
              : `${jobs.length} job${jobs.length !== 1 ? 's' : ''} on the platform`}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={C.accent} />
      ) : jobs.length === 0 ? (
        <EmptyState
          title={es ? 'Aún no hay solicitudes' : 'No job requests yet'}
          subtitle={es ? 'Las solicitudes publicadas por clientes aparecerán aquí.' : 'Job requests posted by clients will appear here.'}
          iconName="briefcase"
        />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <JobRow job={item} es={es} />}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenWrapper>
  );
}
