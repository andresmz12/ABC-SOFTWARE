import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, TextInput,
  ActivityIndicator, Alert, FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/context/LanguageContext';
import { C } from '@/constants/theme';
import { adminAssignJob, adminReassignJob, adminCreateWorkOrder } from '@/lib/jobService';

interface AdminJobFull {
  id: string;
  service_type: string;
  city: string;
  state: string;
  country: string;
  status: string;
  scheduled_date: string;
  scheduled_time: string;
  estimated_hours: number;
  budget_usd: number | null;
  budget_max_usd: number | null;
  budget_cop: number | null;
  budget_max_cop: number | null;
  description: string | null;
  client_id: string;
  client_name: string;
  created_at: string;
}

interface BidRow {
  id: string;
  provider_id: string;
  provider_name: string;
  provider_type: 'company' | 'independent';
  bid_amount_usd: number | null;
  bid_amount_cop: number | null;
  message: string | null;
  status: string;
  applied_at: string;
  assigned_by_admin?: boolean;
}

interface WORow {
  id: string;
  wo_number: string;
  status: string;
  provider_id: string;
  created_by_admin?: boolean;
  created_at: string;
}

interface ProviderOption {
  id: string;
  name: string;
  type: 'company' | 'independent';
  country: string;
  state: string;
}

const STATUS_META: Record<string, { label: string; labelEs: string; color: string; bg: string }> = {
  open:        { label: 'OPEN',        labelEs: 'ABIERTA',    color: C.accent,    bg: `${C.accent}20` },
  accepted:    { label: 'ACCEPTED',    labelEs: 'ACEPTADA',   color: '#3B82F6',   bg: '#3B82F620' },
  in_progress: { label: 'IN PROGRESS', labelEs: 'EN CURSO',   color: '#3B82F6',   bg: '#3B82F620' },
  completed:   { label: 'COMPLETED',   labelEs: 'COMPLETADA', color: C.success,   bg: `${C.success}20` },
  cancelled:   { label: 'CANCELLED',   labelEs: 'CANCELADA',  color: C.danger,    bg: `${C.danger}20` },
  expired:     { label: 'EXPIRED',     labelEs: 'EXPIRADA',   color: C.textMuted, bg: `${C.line}` },
};

const BID_STATUS: Record<string, { label: string; labelEs: string; color: string }> = {
  pending:   { label: 'Pending',   labelEs: 'Pendiente',  color: C.warning },
  accepted:  { label: 'Accepted',  labelEs: 'Aceptada',   color: C.success },
  rejected:  { label: 'Rejected',  labelEs: 'Rechazada',  color: C.danger },
  withdrawn: { label: 'Withdrawn', labelEs: 'Retirada',   color: C.textMuted },
};

function fmtMoney(n: number | null, cur: 'usd' | 'cop'): string {
  if (n == null) return '—';
  return cur === 'usd' ? `$${n.toLocaleString('en-US')}` : `$${n.toLocaleString('es-CO')} COP`;
}

export default function AdminJobDetail() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();
  const { lang } = useLang();
  const es = lang === 'es';
  const { user } = useAuthStore();

  const [job, setJob] = useState<AdminJobFull | null>(null);
  const [bids, setBids] = useState<BidRow[]>([]);
  const [wos, setWos] = useState<WORow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Provider picker
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'assign' | 'reassign'>('assign');
  const [allProviders, setAllProviders] = useState<ProviderOption[]>([]);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSelected, setPickerSelected] = useState<ProviderOption | null>(null);

  // Open case
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [caseReason, setCaseReason] = useState('');
  const [caseDesc, setCaseDesc] = useState('');

  const load = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const { data: jobData, error: jobErr } = await supabase
        .from('job_requests').select('*').eq('id', jobId).single();
      if (jobErr || !jobData) return;

      const [clientRes, bidsRes, wosRes] = await Promise.all([
        supabase.from('clients').select('user_id, full_name').eq('user_id', jobData.client_id).maybeSingle(),
        supabase.from('job_applications').select('*').eq('job_request_id', jobId).order('applied_at', { ascending: false }),
        supabase.from('work_orders').select('id, wo_number, status, provider_id, created_by_admin, created_at').eq('job_request_id', jobId).order('created_at', { ascending: false }),
      ]);

      setJob({ ...(jobData as any), client_name: (clientRes.data as any)?.full_name ?? 'Client' });

      const bidRows = (bidsRes.data ?? []) as any[];
      const providerIds = [...new Set(bidRows.map((b) => b.provider_id).filter(Boolean))];
      const nameMap: Record<string, string> = {};
      if (providerIds.length > 0) {
        const [cRes, iRes] = await Promise.all([
          supabase.from('companies').select('user_id, company_name').in('user_id', providerIds),
          supabase.from('independents').select('user_id, full_name').in('user_id', providerIds),
        ]);
        (cRes.data ?? []).forEach((c: any) => { nameMap[c.user_id] = c.company_name; });
        (iRes.data ?? []).forEach((i: any) => { if (!nameMap[i.user_id]) nameMap[i.user_id] = i.full_name; });
      }
      setBids(bidRows.map((b) => ({ ...b, provider_name: nameMap[b.provider_id] ?? 'Provider' })));
      setWos((wosRes.data ?? []) as WORow[]);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const acceptedBid = bids.find((b) => b.status === 'accepted');
  const currency: 'usd' | 'cop' = job?.country === 'colombia' ? 'cop' : 'usd';
  const statusMeta = job ? (STATUS_META[job.status] ?? STATUS_META.open) : null;
  const isActive = job?.status === 'open' || job?.status === 'accepted' || job?.status === 'in_progress';

  const openPicker = async (mode: 'assign' | 'reassign') => {
    setPickerMode(mode);
    setPickerSelected(null);
    setPickerSearch('');
    setShowPicker(true);
    setPickerLoading(true);
    try {
      const [cRes, iRes] = await Promise.all([
        supabase.from('companies').select('user_id, company_name, country, state').eq('status', 'approved'),
        supabase.from('independents').select('user_id, full_name, country, state').eq('status', 'approved'),
      ]);
      const opts: ProviderOption[] = [
        ...(cRes.data ?? []).map((c: any) => ({ id: c.user_id, name: c.company_name, type: 'company' as const, country: c.country ?? 'usa', state: c.state ?? '' })),
        ...(iRes.data ?? []).map((i: any) => ({ id: i.user_id, name: i.full_name, type: 'independent' as const, country: i.country ?? 'usa', state: i.state ?? '' })),
      ];
      opts.sort((a, b) => a.name.localeCompare(b.name));
      setAllProviders(opts);
    } finally {
      setPickerLoading(false);
    }
  };

  const confirmProviderAction = async () => {
    if (!pickerSelected || !job) return;
    setSaving(true);
    try {
      if (pickerMode === 'assign') {
        await adminAssignJob(job.id, pickerSelected.id, pickerSelected.type, job.client_id, job.country);
        Alert.alert('✓', es ? 'Proveedor asignado correctamente.' : 'Provider assigned successfully.');
      } else {
        if (!acceptedBid) return;
        await adminReassignJob(job.id, acceptedBid.provider_id, pickerSelected.id, pickerSelected.type, job.client_id, job.country);
        Alert.alert('✓', es ? 'Trabajo reasignado correctamente.' : 'Job reassigned successfully.');
      }
      setShowPicker(false);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateWO = async () => {
    if (!acceptedBid || !job?.client_id) return;
    const activeWO = wos.find((w) => w.status !== 'cancelled');
    const doCreate = async () => {
      setSaving(true);
      try {
        const wo = await adminCreateWorkOrder(job.id, job.client_id, acceptedBid.provider_id, job.country);
        Alert.alert('✓', `WO ${wo.wo_number} ${es ? 'creado exitosamente.' : 'created successfully.'}`);
        await load();
      } catch (e: any) {
        Alert.alert('Error', e.message);
      } finally {
        setSaving(false);
      }
    };

    if (activeWO) {
      Alert.alert(
        es ? 'Ya existe un WO activo' : 'Active WO Exists',
        es ? `Ya hay un WO (${activeWO.wo_number}) activo. ¿Crear uno adicional?` : `There's already an active WO (${activeWO.wo_number}). Create an additional one?`,
        [
          { text: es ? 'Cancelar' : 'Cancel', style: 'cancel' },
          { text: es ? 'Crear Nuevo' : 'Create New', onPress: doCreate },
        ],
      );
    } else {
      doCreate();
    }
  };

  const handleCancelJob = () => {
    Alert.alert(
      es ? '¿Cancelar Trabajo?' : 'Cancel Job?',
      es ? 'Esta acción no se puede deshacer. Se cancelarán también los WOs activos.' : 'This cannot be undone. Active work orders will also be cancelled.',
      [
        { text: es ? 'No' : 'No', style: 'cancel' },
        {
          text: es ? 'Sí, Cancelar' : 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await Promise.all([
                supabase.from('job_requests').update({ status: 'cancelled' }).eq('id', job!.id),
                supabase.from('work_orders').update({ status: 'cancelled' }).eq('job_request_id', job!.id).neq('status', 'cancelled'),
              ]);
              await load();
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  const submitCase = async () => {
    if (!caseReason.trim() || !acceptedBid || !user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('disputes').insert({
        job_request_id: job!.id,
        opened_by: user.id,
        against_user_id: acceptedBid.provider_id,
        opened_by_admin: true,
        reason: caseReason.trim(),
        description: caseDesc.trim() || null,
        status: 'open',
      });
      if (error) throw error;
      setShowCaseModal(false);
      setCaseReason('');
      setCaseDesc('');
      Alert.alert('✓', es ? 'Caso abierto exitosamente.' : 'Case opened successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredProviders = pickerSearch.trim()
    ? allProviders.filter((p) => p.name.toLowerCase().includes(pickerSearch.toLowerCase()) || p.state.toLowerCase().includes(pickerSearch.toLowerCase()))
    : allProviders;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.accent2} size="large" />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name="alert-circle" size={32} color={C.textMuted} />
        <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 12 }}>
          {es ? 'No encontrado' : 'Not found'}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.line, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Feather name="arrow-left" size={20} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textPrimary, fontSize: 18, fontFamily: 'Inter_700Bold' }}>
            {es ? 'Detalle del Trabajo' : 'Job Detail'}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular' }}>
            #{job.id.slice(0, 8).toUpperCase()}
          </Text>
        </View>
        {statusMeta && (
          <View style={{ backgroundColor: statusMeta.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Text style={{ color: statusMeta.color, fontSize: 11, fontFamily: 'Inter_700Bold' }}>
              {es ? statusMeta.labelEs : statusMeta.label}
            </Text>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* ── Job Info ── */}
        <View style={{ margin: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 16 }}>
          <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>
            {es ? 'Información del Trabajo' : 'Job Information'}
          </Text>
          {([
            { icon: 'user'       as const, label: es ? 'Cliente'   : 'Client',   value: job.client_name },
            { icon: 'briefcase'  as const, label: es ? 'Servicio'  : 'Service',  value: job.service_type === 'commercial' ? (es ? 'Limpieza Comercial' : 'Commercial Cleaning') : (es ? 'Limpieza Residencial' : 'Residential Cleaning') },
            { icon: 'map-pin'    as const, label: es ? 'Ubicación' : 'Location', value: `${job.city}, ${job.state} ${job.country === 'colombia' ? '🇨🇴' : '🇺🇸'}` },
            { icon: 'calendar'   as const, label: es ? 'Fecha'     : 'Date',     value: `${job.scheduled_date} · ${(job.scheduled_time ?? '').slice(0, 5)}` },
            { icon: 'clock'      as const, label: es ? 'Horas'     : 'Hours',    value: `${job.estimated_hours}h` },
            {
              icon: 'dollar-sign' as const,
              label: es ? 'Presupuesto' : 'Budget',
              value: currency === 'usd'
                ? (job.budget_max_usd ? `${fmtMoney(job.budget_usd, 'usd')} – ${fmtMoney(job.budget_max_usd, 'usd')}` : fmtMoney(job.budget_usd, 'usd'))
                : (job.budget_max_cop ? `${fmtMoney(job.budget_cop, 'cop')} – ${fmtMoney(job.budget_max_cop, 'cop')}` : fmtMoney(job.budget_cop, 'cop')),
            },
          ]).map(({ icon, label, value }) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
              <Feather name={icon} size={14} color={C.textMuted} style={{ marginTop: 1, marginRight: 10, width: 16 }} />
              <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', width: 82 }}>{label}</Text>
              <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_500Medium', flex: 1 }}>{value}</Text>
            </View>
          ))}
          {job.description ? (
            <>
              <View style={{ height: 1, backgroundColor: C.line, marginVertical: 12 }} />
              <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                {es ? 'Descripción' : 'Description'}
              </Text>
              <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 }}>{job.description}</Text>
            </>
          ) : null}
        </View>

        {/* ── Assigned Provider ── */}
        {acceptedBid && (
          <View style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: C.surface, borderWidth: 1.5, borderColor: `${C.success}50`, borderRadius: 16, padding: 16 }}>
            <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
              {es ? 'Proveedor Asignado' : 'Assigned Provider'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: isActive ? 14 : 0 }}>
              <View style={{ width: 44, height: 44, backgroundColor: `${C.success}20`, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Feather name={acceptedBid.provider_type === 'company' ? 'briefcase' : 'user'} size={18} color={C.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>{acceptedBid.provider_name}</Text>
                <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
                  {acceptedBid.provider_type === 'company' ? (es ? 'Empresa' : 'Company') : (es ? 'Independiente' : 'Independent')}
                  {acceptedBid.assigned_by_admin ? (es ? ' · Asignado por admin' : ' · Admin-assigned') : ''}
                  {acceptedBid.bid_amount_usd ? ` · $${acceptedBid.bid_amount_usd.toLocaleString('en-US')}` : ''}
                  {acceptedBid.bid_amount_cop ? ` · $${acceptedBid.bid_amount_cop.toLocaleString('es-CO')} COP` : ''}
                </Text>
              </View>
            </View>
            {isActive && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => openPicker('reassign')}
                  style={{ flex: 1, height: 42, borderRadius: 10, backgroundColor: `${C.warning}15`, borderWidth: 1, borderColor: `${C.warning}50`, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  activeOpacity={0.85}
                >
                  <Feather name="repeat" size={14} color={C.warning} />
                  <Text style={{ color: C.warning, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>{es ? 'Reasignar' : 'Reassign'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setCaseReason(''); setCaseDesc(''); setShowCaseModal(true); }}
                  style={{ flex: 1, height: 42, borderRadius: 10, backgroundColor: `${C.danger}15`, borderWidth: 1, borderColor: `${C.danger}50`, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  activeOpacity={0.85}
                >
                  <Feather name="alert-octagon" size={14} color={C.danger} />
                  <Text style={{ color: C.danger, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>{es ? 'Abrir Caso' : 'Open Case'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── Work Orders ── */}
        <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1, textTransform: 'uppercase' }}>
              {es ? `Órdenes de Trabajo (${wos.length})` : `Work Orders (${wos.length})`}
            </Text>
            {acceptedBid && isActive && (
              <TouchableOpacity
                onPress={handleCreateWO}
                disabled={saving}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.accent2, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 }}
                activeOpacity={0.85}
              >
                <Feather name="plus" size={13} color="#FFF" />
                <Text style={{ color: '#FFF', fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>{es ? 'Nuevo WO' : 'New WO'}</Text>
              </TouchableOpacity>
            )}
          </View>
          {wos.length === 0 ? (
            <View style={{ backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 20, alignItems: 'center' }}>
              <Feather name="file-text" size={24} color={C.textMuted} />
              <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 8 }}>
                {es ? 'Sin órdenes de trabajo' : 'No work orders yet'}
              </Text>
            </View>
          ) : (
            wos.map((wo) => {
              const cancelled = wo.status === 'cancelled';
              const signed = wo.status === 'signed';
              return (
                <TouchableOpacity
                  key={wo.id}
                  onPress={() => router.push({ pathname: '/(shared)/work-order', params: { workOrderId: wo.id } } as any)}
                  style={{ backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: cancelled ? C.line : `${C.accent2}40`, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}
                  activeOpacity={0.85}
                >
                  <Feather name="file-text" size={16} color={cancelled ? C.textMuted : C.accent2} style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: cancelled ? C.textMuted : C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>{wo.wo_number}</Text>
                    <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular' }}>
                      {new Date(wo.created_at).toLocaleDateString()}
                      {wo.created_by_admin ? (es ? ' · Creado por admin' : ' · Admin-created') : ''}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: cancelled ? C.surface2 : signed ? `${C.success}20` : `${C.warning}20`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginRight: 6 }}>
                    <Text style={{ color: cancelled ? C.textMuted : signed ? C.success : C.warning, fontSize: 10, fontFamily: 'Inter_600SemiBold' }}>
                      {cancelled ? (es ? 'CANCELADO' : 'CANCELLED') : signed ? (es ? 'FIRMADO' : 'SIGNED') : (es ? 'PENDIENTE' : 'PENDING')}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={14} color={C.textMuted} />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* ── All Bids ── */}
        <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
          <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
            {es ? `Ofertas / Aplicaciones (${bids.length})` : `Bids / Applications (${bids.length})`}
          </Text>
          {bids.length === 0 ? (
            <View style={{ backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 20, alignItems: 'center' }}>
              <Feather name="inbox" size={24} color={C.textMuted} />
              <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 8 }}>
                {es ? 'Sin ofertas todavía' : 'No bids yet'}
              </Text>
            </View>
          ) : (
            bids.map((bid) => {
              const bidMeta = BID_STATUS[bid.status] ?? BID_STATUS.pending;
              const isAccepted = bid.status === 'accepted';
              return (
                <View key={bid.id} style={{ backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: isAccepted ? `${C.success}40` : C.line, padding: 14, marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 38, height: 38, backgroundColor: isAccepted ? `${C.success}20` : C.surface2, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                      <Feather name={bid.provider_type === 'company' ? 'briefcase' : 'user'} size={15} color={isAccepted ? C.success : C.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>{bid.provider_name}</Text>
                      <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular' }}>
                        {bid.provider_type === 'company' ? (es ? 'Empresa' : 'Company') : (es ? 'Independiente' : 'Independent')}
                        {bid.assigned_by_admin ? (es ? ' · Admin' : ' · Admin') : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
                        {bid.bid_amount_usd ? `$${bid.bid_amount_usd.toLocaleString('en-US')}` : bid.bid_amount_cop ? `$${bid.bid_amount_cop.toLocaleString('es-CO')} COP` : '—'}
                      </Text>
                      <View style={{ backgroundColor: `${bidMeta.color}20`, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: bidMeta.color, fontSize: 9, fontFamily: 'Inter_600SemiBold' }}>
                          {es ? bidMeta.labelEs : bidMeta.label}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {bid.message ? (
                    <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 8, lineHeight: 17 }} numberOfLines={2}>
                      {bid.message}
                    </Text>
                  ) : null}
                </View>
              );
            })
          )}
        </View>

        {/* ── Admin Actions ── */}
        {isActive && (
          <View style={{ marginHorizontal: 16, gap: 10, marginBottom: 24 }}>
            <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>
              {es ? 'Acciones Admin' : 'Admin Actions'}
            </Text>
            {job.status === 'open' && !acceptedBid && (
              <TouchableOpacity
                onPress={() => openPicker('assign')}
                style={{ height: 50, borderRadius: 12, backgroundColor: C.accent2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                activeOpacity={0.85}
              >
                <Feather name="user-plus" size={17} color="#FFF" />
                <Text style={{ color: '#FFF', fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>{es ? 'Asignar Proveedor' : 'Assign Provider'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleCancelJob}
              disabled={saving}
              style={{ height: 50, borderRadius: 12, backgroundColor: `${C.danger}15`, borderWidth: 1, borderColor: `${C.danger}40`, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              activeOpacity={0.85}
            >
              <Feather name="x-circle" size={17} color={C.danger} />
              <Text style={{ color: C.danger, fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>{es ? 'Cancelar Trabajo' : 'Cancel Job'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── Provider Picker Modal ── */}
      <Modal visible={showPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPicker(false)}>
        <View style={{ flex: 1, backgroundColor: C.background }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 32, borderBottomWidth: 1, borderBottomColor: C.line }}>
            <TouchableOpacity onPress={() => setShowPicker(false)} style={{ marginRight: 12, width: 36, height: 36, backgroundColor: C.surface2, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="x" size={18} color={C.textPrimary} />
            </TouchableOpacity>
            <Text style={{ flex: 1, color: C.textPrimary, fontSize: 18, fontFamily: 'Inter_700Bold' }}>
              {pickerMode === 'assign' ? (es ? 'Asignar Proveedor' : 'Assign Provider') : (es ? 'Reasignar Trabajo' : 'Reassign Job')}
            </Text>
          </View>

          <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, height: 44 }}>
              <Feather name="search" size={15} color={C.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                value={pickerSearch}
                onChangeText={setPickerSearch}
                placeholder={es ? 'Buscar por nombre o estado...' : 'Search by name or state...'}
                placeholderTextColor={C.textMuted}
                style={{ flex: 1, color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_400Regular' }}
                autoFocus
              />
              {pickerSearch.length > 0 && (
                <TouchableOpacity onPress={() => setPickerSearch('')}>
                  <Feather name="x-circle" size={15} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {pickerLoading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={C.accent2} />
              <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 12 }}>
                {es ? 'Cargando proveedores...' : 'Loading providers...'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredProviders}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = pickerSelected?.id === item.id;
                const isCurrent = pickerMode === 'reassign' && item.id === acceptedBid?.provider_id;
                return (
                  <TouchableOpacity
                    onPress={() => !isCurrent && setPickerSelected(isSelected ? null : item)}
                    style={{ flexDirection: 'row', alignItems: 'center', padding: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: isSelected ? `${C.accent2}10` : 'transparent', opacity: isCurrent ? 0.4 : 1 }}
                    activeOpacity={0.8}
                  >
                    <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: isSelected ? `${C.accent2}20` : C.surface2, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Feather name={item.type === 'company' ? 'briefcase' : 'user'} size={17} color={isSelected ? C.accent2 : C.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>{item.name}</Text>
                      <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
                        {item.type === 'company' ? (es ? 'Empresa' : 'Company') : (es ? 'Independiente' : 'Independent')}
                        {' · '}{item.country === 'colombia' ? '🇨🇴' : '🇺🇸'}{item.state ? ` ${item.state}` : ''}
                        {isCurrent ? (es ? ' · (Actual)' : ' · (Current)') : ''}
                      </Text>
                    </View>
                    {isSelected ? (
                      <Feather name="check-circle" size={20} color={C.accent2} />
                    ) : (
                      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: C.line }} />
                    )}
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={{ paddingBottom: 160 }}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingTop: 60 }}>
                  <Feather name="users" size={32} color={C.textMuted} />
                  <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 12 }}>
                    {es ? 'Sin proveedores aprobados' : 'No approved providers'}
                  </Text>
                </View>
              }
            />
          )}

          {pickerSelected && (
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 40, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.line }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${C.accent2}10`, borderRadius: 10, padding: 12, marginBottom: 12 }}>
                <Feather name={pickerSelected.type === 'company' ? 'briefcase' : 'user'} size={14} color={C.accent2} style={{ marginRight: 8 }} />
                <Text style={{ color: C.accent2, fontSize: 13, fontFamily: 'Inter_600SemiBold', flex: 1 }} numberOfLines={1}>{pickerSelected.name}</Text>
                <TouchableOpacity onPress={() => setPickerSelected(null)}>
                  <Feather name="x" size={14} color={C.accent2} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={confirmProviderAction}
                disabled={saving}
                style={{ height: 52, borderRadius: 12, backgroundColor: C.accent2, alignItems: 'center', justifyContent: 'center', opacity: saving ? 0.7 : 1 }}
                activeOpacity={0.85}
              >
                {saving ? <ActivityIndicator color="#FFF" /> : (
                  <Text style={{ color: '#FFF', fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>
                    {pickerMode === 'assign' ? (es ? 'Confirmar Asignación' : 'Confirm Assignment') : (es ? 'Confirmar Reasignación' : 'Confirm Reassignment')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* ── Open Case Modal ── */}
      <Modal visible={showCaseModal} transparent animationType="slide" onRequestClose={() => setShowCaseModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(13,27,42,0.75)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderTopWidth: 1, borderTopColor: C.line }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ color: C.textPrimary, fontSize: 20, fontFamily: 'Inter_700Bold' }}>
                {es ? 'Abrir Caso' : 'Open Case'}
              </Text>
              <TouchableOpacity onPress={() => setShowCaseModal(false)} style={{ width: 36, height: 36, backgroundColor: C.surface2, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="x" size={18} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            {acceptedBid && (
              <View style={{ backgroundColor: `${C.danger}10`, borderRadius: 10, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="alert-octagon" size={14} color={C.danger} />
                <View>
                  <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular' }}>{es ? 'Caso contra:' : 'Case against:'}</Text>
                  <Text style={{ color: C.danger, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>{acceptedBid.provider_name}</Text>
                </View>
              </View>
            )}

            <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 6 }}>
              {es ? 'Razón *' : 'Reason *'}
            </Text>
            <TextInput
              value={caseReason}
              onChangeText={setCaseReason}
              placeholder={es ? 'Ej: Incumplimiento de contrato, no presentación...' : 'E.g. Contract breach, no-show...'}
              placeholderTextColor={C.textMuted}
              style={{ backgroundColor: C.surface2, borderRadius: 10, padding: 12, color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 12, borderWidth: 1, borderColor: C.line }}
            />

            <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 6 }}>
              {es ? 'Descripción (opcional)' : 'Description (optional)'}
            </Text>
            <TextInput
              value={caseDesc}
              onChangeText={setCaseDesc}
              placeholder={es ? 'Detalles adicionales del caso...' : 'Additional case details...'}
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={3}
              style={{ backgroundColor: C.surface2, borderRadius: 10, padding: 12, color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 20, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: C.line }}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowCaseModal(false)}
                style={{ flex: 1, height: 52, borderRadius: 12, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_500Medium' }}>{es ? 'Cancelar' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitCase}
                disabled={saving || !caseReason.trim()}
                style={{ flex: 2, height: 52, borderRadius: 12, backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center', opacity: (saving || !caseReason.trim()) ? 0.5 : 1 }}
                activeOpacity={0.85}
              >
                {saving ? <ActivityIndicator color="#FFF" /> : (
                  <Text style={{ color: '#FFF', fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>{es ? 'Abrir Caso' : 'Open Case'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
