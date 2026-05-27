import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useLang } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { C } from '@/constants/theme';

interface ClientData {
  id: string;
  full_name: string;
  country: string;
  status: string;
  preferred_language: string;
  created_at: string;
}

interface ClientJob {
  id: string;
  service_type: string;
  status: string;
  city: string;
  state?: string;
  scheduled_date: string;
  budget_usd?: number | null;
  budget_cop?: number | null;
  created_at: string;
}

const STATUS_COLOR: Record<string, string> = {
  open: C.accent, in_progress: '#3B82F6', completed: C.success,
  cancelled: C.danger, expired: C.textMuted, accepted: '#8B5CF6',
};

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function jobStatusLabel(s: string, es: boolean): string {
  const map: Record<string, [string, string]> = {
    open:        ['Open',        'Abierto'],
    accepted:    ['Assigned',    'Asignado'],
    in_progress: ['In Progress', 'En Progreso'],
    completed:   ['Completed',   'Completado'],
    cancelled:   ['Cancelled',   'Cancelado'],
    expired:     ['Expired',     'Expirado'],
  };
  return es ? (map[s]?.[1] ?? s) : (map[s]?.[0] ?? s);
}

export default function ClientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useLang();
  const es = lang === 'es';

  const [client, setClient] = useState<ClientData | null>(null);
  const [jobs, setJobs] = useState<ClientJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadClient();
  }, [id]);

  const loadClient = async () => {
    setLoading(true);
    try {
      const [clientRes, jobsRes] = await Promise.all([
        supabase
          .from('clients')
          .select('user_id, full_name, country, status, preferred_language, created_at')
          .eq('user_id', id)
          .single(),
        supabase
          .from('job_requests')
          .select('id, service_type, status, city, state, scheduled_date, budget_usd, budget_cop, created_at')
          .eq('client_id', id)
          .order('created_at', { ascending: false }),
      ]);

      if (clientRes.error) throw clientRes.error;

      const r = clientRes.data;
      setClient({
        id: r.user_id,
        full_name: r.full_name ?? '',
        country: r.country ?? '',
        status: r.status ?? '',
        preferred_language: r.preferred_language ?? '',
        created_at: r.created_at ?? '',
      });

      setJobs((jobsRes.data ?? []) as ClientJob[]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.accent2} />
      </View>
    );
  }

  if (!client) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular' }}>
          {es ? 'Cliente no encontrado' : 'Client not found'}
        </Text>
      </View>
    );
  }

  const totalJobs      = jobs.length;
  const completedJobs  = jobs.filter((j) => j.status === 'completed').length;
  const activeJobs     = jobs.filter((j) => j.status === 'in_progress' || j.status === 'accepted').length;
  const totalSpentUsd  = jobs
    .filter((j) => j.status === 'completed' && j.budget_usd)
    .reduce((sum, j) => sum + Number(j.budget_usd ?? 0), 0);
  const totalSpentCop  = jobs
    .filter((j) => j.status === 'completed' && j.budget_cop)
    .reduce((sum, j) => sum + Number(j.budget_cop ?? 0), 0);

  const isColombia = client.country === 'colombia';

  const stats = [
    { icon: 'briefcase' as const, value: totalJobs,       label: es ? 'Total'       : 'Total',     color: C.accent2 },
    { icon: 'check-circle' as const, value: completedJobs, label: es ? 'Completados' : 'Completed', color: C.success },
    { icon: 'zap' as const,          value: activeJobs,    label: es ? 'Activos'     : 'Active',    color: '#3B82F6' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: C.line,
        backgroundColor: C.surface,
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
        >
          <Feather name="arrow-left" size={18} color={C.textSecondary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textPrimary, fontSize: 20, fontFamily: 'Inter_700Bold' }} numberOfLines={1}>
            {client.full_name || (es ? 'Sin nombre' : 'No name')}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 }}>
            {isColombia ? '🇨🇴 Colombia' : '🇺🇸 USA'} · {es ? 'Desde' : 'Since'} {formatDate(client.created_at)}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: 10, margin: 20 }}>
          {stats.map((s) => (
            <View key={s.label} style={{
              flex: 1, backgroundColor: C.surface, borderRadius: 14,
              padding: 14, borderWidth: 1, borderColor: C.line, alignItems: 'center',
            }}>
              <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: `${s.color}18`, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                <Feather name={s.icon} size={13} color={s.color} />
              </View>
              <Text style={{ color: C.textPrimary, fontSize: 20, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>{s.value}</Text>
              <Text style={{ color: C.textMuted, fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 2, textAlign: 'center' }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Spend summary */}
        {(totalSpentUsd > 0 || totalSpentCop > 0) && (
          <View style={{
            marginHorizontal: 20, marginBottom: 20,
            backgroundColor: C.surface, borderRadius: 14,
            padding: 16, borderWidth: 1, borderColor: C.line,
          }}>
            <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_500Medium', marginBottom: 4, letterSpacing: 0.5 }}>
              {es ? 'TOTAL GASTADO (TRABAJOS COMPLETADOS)' : 'TOTAL SPENT (COMPLETED JOBS)'}
            </Text>
            {totalSpentUsd > 0 && (
              <Text style={{ color: C.textPrimary, fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>
                ${totalSpentUsd.toLocaleString('en-US')} USD
              </Text>
            )}
            {totalSpentCop > 0 && (
              <Text style={{ color: C.textPrimary, fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>
                ${totalSpentCop.toLocaleString('es-CO')} COP
              </Text>
            )}
          </View>
        )}

        {/* Client info */}
        <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
          <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_500Medium', marginBottom: 10, letterSpacing: 0.5 }}>
            {es ? 'INFORMACIÓN' : 'INFORMATION'}
          </Text>
          <View style={{ backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }}>
            {[
              { icon: 'globe' as const, label: es ? 'País' : 'Country', value: isColombia ? '🇨🇴 Colombia' : '🇺🇸 USA' },
              { icon: 'globe' as const, label: es ? 'Idioma preferido' : 'Preferred Language', value: client.preferred_language === 'es' ? 'Español' : 'English' },
              { icon: 'calendar' as const, label: es ? 'Registro' : 'Joined', value: formatDate(client.created_at) },
              { icon: 'shield' as const, label: es ? 'Estado de cuenta' : 'Account Status', value: client.status ? (client.status.charAt(0).toUpperCase() + client.status.slice(1)) : '—' },
            ].map((row, idx, arr) => (
              <View key={row.label} style={{
                flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13,
                borderBottomWidth: idx < arr.length - 1 ? 1 : 0, borderBottomColor: C.line,
              }}>
                <Feather name={row.icon} size={14} color={C.textMuted} style={{ marginRight: 12 }} />
                <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 }}>{row.label}</Text>
                <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_500Medium' }}>{row.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Job history */}
        <View style={{ marginHorizontal: 20 }}>
          <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_500Medium', marginBottom: 10, letterSpacing: 0.5 }}>
            {es ? `HISTORIAL DE TRABAJOS (${totalJobs})` : `JOB HISTORY (${totalJobs})`}
          </Text>

          {jobs.length === 0 ? (
            <View style={{
              backgroundColor: C.surface, borderRadius: 14, borderWidth: 1,
              borderColor: C.line, padding: 24, alignItems: 'center',
            }}>
              <Feather name="briefcase" size={24} color={C.textMuted} />
              <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 10 }}>
                {es ? 'Sin trabajos aún' : 'No jobs yet'}
              </Text>
            </View>
          ) : (
            jobs.map((job) => {
              const statusColor = STATUS_COLOR[job.status] ?? C.textMuted;
              const isCommercial = job.service_type === 'commercial';
              return (
                <View key={job.id} style={{
                  backgroundColor: C.surface, borderRadius: 14, borderWidth: 1,
                  borderColor: C.line, borderLeftWidth: 3,
                  borderLeftColor: isCommercial ? C.accent2 : C.accent,
                  padding: 14, marginBottom: 10,
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                      {isCommercial
                        ? (es ? 'Limpieza Comercial' : 'Commercial Cleaning')
                        : (es ? 'Limpieza Residencial' : 'Residential Cleaning')}
                    </Text>
                    <View style={{
                      backgroundColor: `${statusColor}18`, borderRadius: 6,
                      paddingHorizontal: 8, paddingVertical: 3,
                    }}>
                      <Text style={{ color: statusColor, fontSize: 10, fontFamily: 'Inter_600SemiBold' }}>
                        {jobStatusLabel(job.status, es).toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Feather name="map-pin" size={11} color={C.textMuted} style={{ marginRight: 3 }} />
                      <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
                        {job.city}{job.state ? `, ${job.state}` : ''}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Feather name="calendar" size={11} color={C.textMuted} style={{ marginRight: 3 }} />
                      <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
                        {formatDate(job.scheduled_date)}
                      </Text>
                    </View>
                    {(job.budget_usd || job.budget_cop) ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Feather name="dollar-sign" size={11} color={C.textMuted} style={{ marginRight: 3 }} />
                        <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
                          {job.budget_usd
                            ? `$${Number(job.budget_usd).toLocaleString('en-US')}`
                            : `$${Number(job.budget_cop).toLocaleString('es-CO')} COP`}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}
