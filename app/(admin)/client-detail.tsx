import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Linking, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useLang } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { updateProviderStatus } from '@/lib/userUtils';
import { C } from '@/constants/theme';

type ClientStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
type DocStatus    = 'pending' | 'approved' | 'rejected';

interface ClientData {
  id: string;
  full_name: string;
  country: string;
  status: ClientStatus;
  preferred_language: string;
  created_at: string;
}

interface ClientDoc {
  id: string;
  doc_type: string;
  file_url: string;
  file_name: string;
  status: DocStatus;
  uploaded_at: string;
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
}

const JOB_STATUS_COLOR: Record<string, string> = {
  open: C.accent, in_progress: '#3B82F6', completed: C.success,
  cancelled: C.danger, expired: C.textMuted, accepted: '#8B5CF6',
};

const ACCOUNT_STATUS: Record<ClientStatus, { bg: string; border: string; color: string; label: string; labelEs: string }> = {
  pending:   { bg: '#FFF3CD', border: C.warning, color: '#856404',       label: 'Pending Review', labelEs: 'En Revisión' },
  approved:  { bg: '#D1FAE5', border: C.success, color: '#065F46',       label: 'Approved',       labelEs: 'Aprobado' },
  rejected:  { bg: '#FFE4E6', border: C.danger,  color: '#9B1C1C',       label: 'Rejected',       labelEs: 'Rechazado' },
  suspended: { bg: C.surface2, border: C.line,   color: C.textSecondary, label: 'Suspended',      labelEs: 'Suspendido' },
};

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

  const [client, setClient]       = useState<ClientData | null>(null);
  const [docs, setDocs]           = useState<ClientDoc[]>([]);
  const [jobs, setJobs]           = useState<ClientJob[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [clientRes, docsRes, jobsRes] = await Promise.all([
        supabase
          .from('clients')
          .select('user_id, full_name, country, status, preferred_language, created_at')
          .eq('user_id', id)
          .single(),
        supabase
          .from('documents')
          .select('id, doc_type, file_url, file_name, status, uploaded_at')
          .eq('user_id', id)
          .order('uploaded_at', { ascending: false }),
        supabase
          .from('job_requests')
          .select('id, service_type, status, city, state, scheduled_date, budget_usd, budget_cop')
          .eq('client_id', id)
          .order('created_at', { ascending: false }),
      ]);

      if (clientRes.error) throw clientRes.error;
      const r = clientRes.data;
      setClient({
        id: r.user_id,
        full_name: r.full_name ?? '',
        country: r.country ?? '',
        status: (r.status ?? 'approved') as ClientStatus,
        preferred_language: r.preferred_language ?? '',
        created_at: r.created_at ?? '',
      });
      setDocs((docsRes.data ?? []) as ClientDoc[]);
      setJobs((jobsRes.data ?? []) as ClientJob[]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleAccountAction = (newStatus: ClientStatus) => {
    const labels: Record<ClientStatus, [string, string]> = {
      approved:  [es ? 'Aprobar' : 'Approve',       es ? '¿Aprobar esta cuenta de cliente?' : 'Approve this client account?'],
      rejected:  [es ? 'Rechazar' : 'Reject',       es ? '¿Rechazar esta cuenta?' : 'Reject this account?'],
      suspended: [es ? 'Suspender' : 'Suspend',     es ? '¿Suspender esta cuenta?' : 'Suspend this account?'],
      pending:   [es ? 'Marcar pendiente' : 'Mark pending', es ? '¿Marcar como pendiente?' : 'Mark as pending?'],
    };
    const [btnLabel, msg] = labels[newStatus];
    Alert.alert(btnLabel, msg, [
      { text: es ? 'Cancelar' : 'Cancel', style: 'cancel' },
      {
        text: btnLabel,
        style: newStatus === 'rejected' || newStatus === 'suspended' ? 'destructive' : 'default',
        onPress: async () => {
          setActionLoading(true);
          try {
            const { error } = await updateProviderStatus(id!, newStatus);
            if (error) throw new Error(error);

            if (newStatus === 'approved') {
              await supabase.from('notifications').insert({
                user_id: id,
                title_en: 'Account Approved',
                title_es: 'Cuenta Aprobada',
                body_en: 'Your identity has been verified. Your account is now active.',
                body_es: 'Tu identidad ha sido verificada. Tu cuenta está activa.',
                type: 'account_update',
                read: false,
              });
            }
            setClient((prev) => prev ? { ...prev, status: newStatus } : prev);
          } catch (e: any) {
            Alert.alert('Error', e.message);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleDocAction = async (docId: string, newStatus: DocStatus) => {
    const { error } = await supabase.from('documents').update({ status: newStatus }).eq('id', docId);
    if (error) { Alert.alert('Error', error.message); return; }
    setDocs((prev) => prev.map((d) => d.id === docId ? { ...d, status: newStatus } : d));
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

  const statusMeta      = ACCOUNT_STATUS[client.status] ?? ACCOUNT_STATUS['pending'];
  const isColombia      = client.country === 'colombia';
  const totalJobs       = jobs.length;
  const completedJobs   = jobs.filter((j) => j.status === 'completed').length;
  const pendingDocs     = docs.filter((d) => d.status === 'pending').length;

  const stats = [
    { icon: 'briefcase' as const,   value: totalJobs,     label: es ? 'Trabajos' : 'Jobs',       color: C.accent2 },
    { icon: 'check-circle' as const, value: completedJobs, label: es ? 'Completados' : 'Completed', color: C.success },
    { icon: 'file-text' as const,   value: docs.length,   label: es ? 'Documentos' : 'Documents', color: '#8B5CF6' },
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
            {isColombia ? '🇨🇴 Colombia' : '🇺🇸 USA'} · {es ? 'Cliente' : 'Client'}
          </Text>
        </View>
        {pendingDocs > 0 && (
          <View style={{ backgroundColor: `${C.warning}20`, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: C.warning, fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>
              {pendingDocs} {es ? 'pendiente(s)' : 'pending'}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent2} />}
      >
        {/* Account status banner */}
        <View style={{
          margin: 20, marginBottom: 0,
          backgroundColor: statusMeta.bg,
          borderRadius: 14, borderWidth: 1, borderColor: statusMeta.border,
          padding: 14, flexDirection: 'row', alignItems: 'center',
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: statusMeta.color, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
              {es ? statusMeta.labelEs : statusMeta.label}
            </Text>
            <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
              {es ? 'Estado de la cuenta' : 'Account status'}
            </Text>
          </View>
          {actionLoading
            ? <ActivityIndicator color={C.accent2} size="small" />
            : <Feather name="shield" size={18} color={statusMeta.color} />
          }
        </View>

        {/* Action buttons */}
        <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 20, marginTop: 10, marginBottom: 4 }}>
          {client.status !== 'approved' && (
            <TouchableOpacity
              onPress={() => handleAccountAction('approved')}
              disabled={actionLoading}
              style={{ flex: 1, height: 40, borderRadius: 10, backgroundColor: `${C.success}15`, borderWidth: 1, borderColor: `${C.success}40`, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
              activeOpacity={0.85}
            >
              <Feather name="check" size={14} color={C.success} />
              <Text style={{ color: C.success, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
                {es ? 'Aprobar' : 'Approve'}
              </Text>
            </TouchableOpacity>
          )}
          {client.status !== 'rejected' && (
            <TouchableOpacity
              onPress={() => handleAccountAction('rejected')}
              disabled={actionLoading}
              style={{ flex: 1, height: 40, borderRadius: 10, backgroundColor: `${C.danger}15`, borderWidth: 1, borderColor: `${C.danger}40`, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
              activeOpacity={0.85}
            >
              <Feather name="x" size={14} color={C.danger} />
              <Text style={{ color: C.danger, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
                {es ? 'Rechazar' : 'Reject'}
              </Text>
            </TouchableOpacity>
          )}
          {client.status !== 'suspended' && client.status === 'approved' && (
            <TouchableOpacity
              onPress={() => handleAccountAction('suspended')}
              disabled={actionLoading}
              style={{ flex: 1, height: 40, borderRadius: 10, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
              activeOpacity={0.85}
            >
              <Feather name="slash" size={14} color={C.textSecondary} />
              <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
                {es ? 'Suspender' : 'Suspend'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
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

        {/* Client info */}
        <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
          <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_500Medium', marginBottom: 10, letterSpacing: 0.5 }}>
            {es ? 'INFORMACIÓN' : 'INFORMATION'}
          </Text>
          <View style={{ backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }}>
            {[
              { icon: 'globe' as const,    label: es ? 'País' : 'Country',               value: isColombia ? '🇨🇴 Colombia' : '🇺🇸 USA' },
              { icon: 'globe' as const,    label: es ? 'Idioma' : 'Language',             value: client.preferred_language === 'es' ? 'Español' : 'English' },
              { icon: 'calendar' as const, label: es ? 'Registro' : 'Joined',             value: formatDate(client.created_at) },
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

        {/* Documents */}
        <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
          <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_500Medium', marginBottom: 10, letterSpacing: 0.5 }}>
            {es ? `DOCUMENTOS (${docs.length})` : `DOCUMENTS (${docs.length})`}
          </Text>

          {docs.length === 0 ? (
            <View style={{ backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 24, alignItems: 'center' }}>
              <Feather name="file-text" size={24} color={C.textMuted} />
              <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 10 }}>
                {es ? 'Sin documentos subidos' : 'No documents uploaded'}
              </Text>
            </View>
          ) : (
            docs.map((doc) => {
              const docStatusMeta = {
                pending:  { bg: `${C.warning}20`, color: C.warning, label: es ? 'PENDIENTE' : 'PENDING' },
                approved: { bg: `${C.success}20`, color: C.success, label: es ? 'APROBADO' : 'APPROVED' },
                rejected: { bg: `${C.danger}20`,  color: C.danger,  label: es ? 'RECHAZADO' : 'REJECTED' },
              }[doc.status];
              return (
                <View key={doc.id} style={{
                  backgroundColor: C.surface, borderRadius: 14, borderWidth: 1,
                  borderColor: C.line, padding: 14, marginBottom: 10,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                    <View style={{ width: 38, height: 38, backgroundColor: `${C.accent}15`, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Feather name="file-text" size={16} color={C.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>
                        {doc.doc_type}
                      </Text>
                      <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                        {formatDate(doc.uploaded_at)}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: docStatusMeta.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ color: docStatusMeta.color, fontSize: 10, fontFamily: 'Inter_600SemiBold' }}>
                        {docStatusMeta.label}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => Linking.openURL(doc.file_url).catch(() => {})}
                      style={{ flex: 1, height: 36, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
                      activeOpacity={0.85}
                    >
                      <Feather name="eye" size={13} color={C.textSecondary} />
                      <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>
                        {es ? 'Ver' : 'View'}
                      </Text>
                    </TouchableOpacity>
                    {doc.status !== 'approved' && (
                      <TouchableOpacity
                        onPress={() => handleDocAction(doc.id, 'approved')}
                        style={{ flex: 1, height: 36, backgroundColor: `${C.success}15`, borderWidth: 1, borderColor: `${C.success}40`, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
                        activeOpacity={0.85}
                      >
                        <Feather name="check" size={13} color={C.success} />
                        <Text style={{ color: C.success, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>
                          {es ? 'Aprobar' : 'Approve'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {doc.status !== 'rejected' && (
                      <TouchableOpacity
                        onPress={() => handleDocAction(doc.id, 'rejected')}
                        style={{ flex: 1, height: 36, backgroundColor: `${C.danger}15`, borderWidth: 1, borderColor: `${C.danger}40`, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
                        activeOpacity={0.85}
                      >
                        <Feather name="x" size={13} color={C.danger} />
                        <Text style={{ color: C.danger, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>
                          {es ? 'Rechazar' : 'Reject'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Job history */}
        <View style={{ marginHorizontal: 20 }}>
          <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_500Medium', marginBottom: 10, letterSpacing: 0.5 }}>
            {es ? `HISTORIAL DE TRABAJOS (${totalJobs})` : `JOB HISTORY (${totalJobs})`}
          </Text>

          {jobs.length === 0 ? (
            <View style={{ backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 24, alignItems: 'center' }}>
              <Feather name="briefcase" size={24} color={C.textMuted} />
              <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 10 }}>
                {es ? 'Sin trabajos aún' : 'No jobs yet'}
              </Text>
            </View>
          ) : (
            jobs.map((job) => {
              const statusColor = JOB_STATUS_COLOR[job.status] ?? C.textMuted;
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
                      {isCommercial ? (es ? 'Limpieza Comercial' : 'Commercial Cleaning') : (es ? 'Limpieza Residencial' : 'Residential Cleaning')}
                    </Text>
                    <View style={{ backgroundColor: `${statusColor}18`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
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
