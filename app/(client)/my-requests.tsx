import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Modal, Alert, ScrollView } from 'react-native';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import EmptyState from '@/components/ui/EmptyState';
import Input from '@/components/ui/Input';
import LocationSelector from '@/components/ui/LocationSelector';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { formatUSD, formatCOP } from '@/lib/countryData';
import { useLang } from '@/context/LanguageContext';
import { C } from '@/constants/theme';
import type { JobRequest } from '@/types';

type Tab = 'open' | 'in_progress' | 'completed' | 'expired';

function timeAgo(iso: string, es: boolean): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return es ? 'Hoy' : 'Today';
  if (days === 1) return es ? 'Ayer' : 'Yesterday';
  return es ? `Hace ${days}d` : `${days}d ago`;
}

function formatDateInput(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

function formatTimeInput(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}:${d.slice(2)}`;
}

function parseDateInput(value: string): string | null {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, mm, dd, yyyy] = match;
  const d = new Date(`${yyyy}-${mm}-${dd}T12:00:00`);
  if (isNaN(d.getTime())) return null;
  return `${yyyy}-${mm}-${dd}`;
}

function parseTimeInput(value: string, ampm: 'AM' | 'PM'): string | null {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;
  if (ampm === 'AM') {
    if (hours === 12) hours = 0;
  } else {
    if (hours !== 12) hours += 12;
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
}

function isoDateToDisplay(iso: string): string {
  const [yyyy, mm, dd] = iso.split('-');
  return `${mm}/${dd}/${yyyy}`;
}

function isoTimeToDisplay(t: string): { time: string; ampm: 'AM' | 'PM' } {
  const parts = t.split(':');
  const h = parseInt(parts[0], 10);
  const period: 'AM' | 'PM' = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { time: `${String(h12).padStart(2, '0')}:${parts[1]}`, ampm: period };
}

// ─── Edit Modal ────────────────────────────────────────────────────────────────

interface EditModalProps {
  job: JobRequest | null;
  visible: boolean;
  es: boolean;
  isColombia: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function EditModal({ job, visible, es, isColombia, onClose, onSaved }: EditModalProps) {
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM');
  const [dateError, setDateError] = useState('');
  const [timeError, setTimeError] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [budget, setBudget] = useState('');
  const [description, setDescription] = useState('');
  const [editState, setEditState] = useState('');
  const [editCity, setEditCity] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!job || !visible) return;
    setEstimatedHours(String(job.estimated_hours ?? ''));
    setBudget(String(job.budget_usd ?? job.budget_cop ?? ''));
    setDescription(job.description ?? '');
    setEditState(job.state ?? '');
    setEditCity(job.city ?? '');
    setScheduledDate(job.scheduled_date ? isoDateToDisplay(job.scheduled_date) : '');
    if (job.scheduled_time) {
      const parsed = isoTimeToDisplay(job.scheduled_time);
      setScheduledTime(parsed.time);
      setAmpm(parsed.ampm);
    } else {
      setScheduledTime('');
      setAmpm('AM');
    }
    setDateError('');
    setTimeError('');
  }, [job?.id, visible]);

  const handleSave = async () => {
    if (!job) return;
    if (!estimatedHours || !budget) {
      Alert.alert(
        es ? 'Campos requeridos' : 'Required fields',
        es ? 'Por favor completa todos los campos.' : 'Please fill in all fields.',
      );
      return;
    }

    const isoDate = parseDateInput(scheduledDate);
    const isoTime = parseTimeInput(scheduledTime, ampm);

    let hasError = false;
    if (!isoDate) {
      setDateError(es ? 'Formato inválido. Usa MM/DD/AAAA' : 'Invalid format. Use MM/DD/YYYY');
      hasError = true;
    } else {
      setDateError('');
    }
    if (!isoTime) {
      setTimeError(es ? 'Formato inválido. Usa HH:MM' : 'Invalid format. Use HH:MM');
      hasError = true;
    } else {
      setTimeError('');
    }
    if (hasError) return;

    const hoursNum = parseFloat(estimatedHours);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      Alert.alert(
        es ? 'Horas inválidas' : 'Invalid hours',
        es ? 'Ingresa un número válido de horas mayor a 0.' : 'Please enter a valid number of hours greater than 0.',
      );
      return;
    }
    const budgetNum = parseFloat(budget.replace(/[^0-9.]/g, ''));
    if (isNaN(budgetNum) || budgetNum <= 0) {
      Alert.alert(
        es ? 'Presupuesto inválido' : 'Invalid budget',
        es ? 'Ingresa un presupuesto válido mayor a 0.' : 'Please enter a valid budget greater than 0.',
      );
      return;
    }

    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        scheduled_date: isoDate!,
        scheduled_time: isoTime!,
        estimated_hours: hoursNum,
        description: description || null,
        state: editState || null,
        city: editCity || null,
      };
      if (isColombia) {
        updateData.budget_cop = budgetNum;
        updateData.budget_usd = null;
      } else {
        updateData.budget_usd = budgetNum;
        updateData.budget_cop = null;
      }
      const { error } = await supabase.from('job_requests').update(updateData).eq('id', job.id);
      if (error) throw error;
      onSaved();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
        <View style={{
          backgroundColor: C.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingTop: 20,
          paddingBottom: 40,
          maxHeight: '90%',
          borderTopWidth: 1,
          borderTopColor: C.line,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 20 }}>
            <Text style={{ color: C.textPrimary, fontSize: 20, fontFamily: 'Inter_700Bold' }}>
              {es ? 'Editar Solicitud' : 'Edit Request'}
            </Text>
            <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, backgroundColor: C.surface2, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="x" size={18} color={C.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
            <Input
              label={es ? 'Fecha (MM/DD/AAAA)' : 'Date (MM/DD/YYYY)'}
              placeholder="MM/DD/YYYY"
              value={scheduledDate}
              onChangeText={(v) => { setScheduledDate(formatDateInput(v)); setDateError(''); }}
              keyboardType="numeric"
              maxLength={10}
              iconName="calendar"
              error={dateError || undefined}
            />
            <Input
              label={es ? 'Hora' : 'Time'}
              placeholder="HH:MM"
              value={scheduledTime}
              onChangeText={(v) => { setScheduledTime(formatTimeInput(v)); setTimeError(''); }}
              keyboardType="numeric"
              maxLength={5}
              iconName="clock"
              error={timeError || undefined}
              rightElement={
                <View style={{ flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: C.line }}>
                  {(['AM', 'PM'] as const).map((period) => (
                    <TouchableOpacity
                      key={period}
                      onPress={() => setAmpm(period)}
                      style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: ampm === period ? C.accent : 'transparent' }}
                    >
                      <Text style={{ color: ampm === period ? '#000' : C.textSecondary, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
                        {period}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              }
            />
            <Input
              label={es ? 'Horas Estimadas' : 'Estimated Hours'}
              value={estimatedHours}
              onChangeText={setEstimatedHours}
              keyboardType="decimal-pad"
              iconName="clock"
            />
            <Input
              label={isColombia ? `${es ? 'Presupuesto' : 'Budget'} (COP)` : `${es ? 'Presupuesto' : 'Budget'} (USD)`}
              value={budget}
              onChangeText={setBudget}
              keyboardType="decimal-pad"
              iconName="dollar-sign"
            />
            <Input
              label={es ? 'Descripción' : 'Description'}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
            <LocationSelector
              country={isColombia ? 'colombia' : 'usa'}
              state={editState}
              city={editCity}
              onStateChange={(s) => { setEditState(s); setEditCity(''); }}
              onCityChange={(c) => setEditCity(c)}
              es={es}
            />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <TouchableOpacity
                onPress={onClose}
                style={{ flex: 1, height: 52, borderRadius: 12, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: C.textSecondary, fontSize: 15, fontFamily: 'Inter_500Medium' }}>
                  {es ? 'Cancelar' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={{ flex: 2, height: 52, borderRadius: 12, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', opacity: saving ? 0.6 : 1 }}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={{ color: '#000', fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>
                    {es ? 'Guardar Cambios' : 'Save Changes'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Request Card ──────────────────────────────────────────────────────────────

const RequestCard = React.memo(function RequestCard({
  req,
  isColombia,
  es,
  onViewBids,
  onEdit,
  onCancel,
}: {
  req: JobRequest;
  isColombia: boolean;
  es: boolean;
  onViewBids: () => void;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const isCommercial = req.service_type === 'commercial';
  const accentColor = isCommercial ? C.accent2 : C.accent;
  const budgetText = req.budget_usd
    ? formatUSD(req.budget_usd)
    : req.budget_cop ? formatCOP(req.budget_cop) : null;
  const location = isColombia ? req.city : `${req.city}, ${req.state}`;

  const serviceLabel = isCommercial
    ? (es ? 'Limpieza Comercial' : 'Commercial Cleaning')
    : (es ? 'Limpieza Residencial' : 'Residential Cleaning');
  const serviceTag = isCommercial
    ? (es ? 'COMERCIAL' : 'COMMERCIAL')
    : (es ? 'RESIDENCIAL' : 'RESIDENTIAL');

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
            {serviceLabel}
          </Text>
          <View style={{
            backgroundColor: isCommercial ? '#0d1a2d' : '#2d1a0d',
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: accentColor,
          }}>
            <Text style={{ color: accentColor, fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>{serviceTag}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Feather name="map-pin" size={11} color={C.textMuted} style={{ marginRight: 4 }} />
          <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginRight: 12 }}>
            {location}
          </Text>
          <Feather name="calendar" size={11} color={C.textMuted} style={{ marginRight: 4 }} />
          <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
            {req.scheduled_date ? isoDateToDisplay(req.scheduled_date) : '—'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {budgetText && (
            <View style={{ backgroundColor: C.surface2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: C.accent }}>
              <Text style={{ color: C.accent, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>{budgetText}</Text>
            </View>
          )}
          <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginLeft: 'auto' }}>
            {timeAgo(req.created_at, es)}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={{ borderTopWidth: 1, borderTopColor: C.line }}>
        {req.status === 'open' ? (
          <>
            {/* View bids row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 }}>
              <TouchableOpacity onPress={onViewBids} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="tag" size={13} color={C.accent} style={{ marginRight: 4 }} />
                <Text style={{ color: C.accent, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
                  {es ? 'Ver Ofertas' : 'View Bids'}
                </Text>
              </TouchableOpacity>
              <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
                {req.estimated_hours}h
              </Text>
            </View>
            {/* Edit / Cancel row */}
            <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.line }}>
              <TouchableOpacity
                onPress={onEdit}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 4 }}
                activeOpacity={0.75}
              >
                <Feather name="edit-2" size={13} color={C.textSecondary} />
                <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_500Medium' }}>
                  {es ? 'Editar' : 'Edit'}
                </Text>
              </TouchableOpacity>
              <View style={{ width: 1, backgroundColor: C.line }} />
              <TouchableOpacity
                onPress={onCancel}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 4 }}
                activeOpacity={0.75}
              >
                <Feather name="x-circle" size={13} color={C.danger} />
                <Text style={{ color: C.danger, fontSize: 13, fontFamily: 'Inter_500Medium' }}>
                  {es ? 'Cancelar' : 'Cancel'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather
                name={req.status === 'in_progress' ? 'zap' : 'check-circle'}
                size={13}
                color={req.status === 'in_progress' ? '#3B82F6' : req.status === 'cancelled' ? C.danger : C.success}
                style={{ marginRight: 4 }}
              />
              <Text style={{ color: req.status === 'in_progress' ? '#3B82F6' : req.status === 'cancelled' ? C.danger : C.success, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
                {req.status === 'in_progress'
                  ? (es ? 'En Progreso' : 'In Progress')
                  : req.status === 'cancelled'
                  ? (es ? 'Cancelada' : 'Cancelled')
                  : (es ? 'Completada' : 'Completed')}
              </Text>
            </View>
            <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
              {req.estimated_hours}h
            </Text>
          </View>
        )}
      </View>
    </View>
  );
});

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function MyRequests() {
  const [activeTab, setActiveTab] = useState<Tab>('open');
  const router = useRouter();
  const { user } = useAuthStore();
  const { t, lang } = useLang();
  const es = lang === 'es';
  const isColombia = user?.country === 'colombia';

  const TAB_LABELS: Record<Tab, string> = {
    open: es ? 'Abiertas' : 'Open',
    in_progress: es ? 'Activas' : 'Active',
    completed: es ? 'Listas' : 'Done',
    expired: es ? 'Expiradas' : 'Expired',
  };

  const [jobs, setJobs] = useState<{ open: JobRequest[]; in_progress: JobRequest[]; completed: JobRequest[]; expired: JobRequest[] }>({
    open: [], in_progress: [], completed: [], expired: [],
  });
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [editJob, setEditJob] = useState<JobRequest | null>(null);

  const loadJobs = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from('job_requests')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const allJobs = (data ?? []) as JobRequest[];
      setJobs({
        open:        allJobs.filter((j) => j.status === 'open'),
        in_progress: allJobs.filter((j) => j.status === 'in_progress'),
        completed:   allJobs.filter((j) => j.status === 'completed' || j.status === 'cancelled'),
        expired:     allJobs.filter((j) => j.status === 'expired'),
      });
    } catch (e: any) {
      setFetchError(e.message ?? (es ? 'Error al cargar solicitudes.' : 'Failed to load requests.'));
    } finally {
      setLoading(false);
    }
  }, [user?.id, es]);

  // Reload list every time this screen comes into focus (e.g. after returning from job-offers)
  useFocusEffect(useCallback(() => { loadJobs(); }, [loadJobs]));

  const handleCancel = (job: JobRequest) => {
    Alert.alert(
      es ? '¿Cancelar solicitud?' : 'Cancel this request?',
      es
        ? '¿Estás seguro? Los proveedores que aplicaron no podrán ver esta solicitud.'
        : 'Are you sure? Providers who applied will no longer see this request.',
      [
        { text: es ? 'No' : 'No', style: 'cancel' },
        {
          text: es ? 'Sí, cancelar' : 'Yes, cancel',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('job_requests')
              .update({ status: 'cancelled' })
              .eq('id', job.id);
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              loadJobs();
            }
          },
        },
      ],
    );
  };

  const current = jobs[activeTab];

  const renderItem = useCallback(({ item }: { item: JobRequest }) => (
    <RequestCard
      req={item}
      isColombia={isColombia}
      es={es}
      onViewBids={() => router.push({ pathname: '/(client)/job-offers', params: { jobId: item.id } } as any)}
      onEdit={() => setEditJob(item)}
      onCancel={() => handleCancel(item)}
    />
  ), [isColombia, es, router, handleCancel]);

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 20 }}>
        <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold' }}>
          {t('client.myRequests')}
        </Text>
        <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
          {t('client.requestsSubtitle')}
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
        {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => {
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
                {TAB_LABELS[tab]}
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
                  <Text style={{ fontSize: 9, color: isActive ? '#000' : C.textSecondary, fontFamily: 'Inter_600SemiBold' }}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
          <SkeletonList count={4} />
        </View>
      ) : fetchError ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Feather name="alert-circle" size={36} color={C.danger} />
          <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 12, textAlign: 'center' }}>
            {fetchError}
          </Text>
          <TouchableOpacity
            onPress={() => loadJobs()}
            style={{ marginTop: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.accent, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 }}
            activeOpacity={0.8}
          >
            <Text style={{ color: C.accent, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
              {es ? 'Reintentar' : 'Retry'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : current.length === 0 ? (
        <EmptyState
          title={es ? `Sin solicitudes ${TAB_LABELS[activeTab].toLowerCase()}` : `No ${TAB_LABELS[activeTab].toLowerCase()} requests`}
          subtitle={activeTab === 'expired' ? (es ? 'Las solicitudes expiradas aparecerán aquí' : 'Expired requests will appear here') : (es ? 'Publica un trabajo para comenzar' : 'Post a job to get started')}
          iconName={activeTab === 'expired' ? 'clock' : 'clipboard'}
          ctaLabel={activeTab !== 'expired' ? (es ? 'Publicar Trabajo' : 'Post a Job') : undefined}
          onCta={activeTab !== 'expired' ? () => router.push('/(client)/post-job' as any) : undefined}
        />
      ) : (
        <FlatList
          data={current}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <EditModal
        job={editJob}
        visible={!!editJob}
        es={es}
        isColombia={isColombia}
        onClose={() => setEditJob(null)}
        onSaved={() => loadJobs()}
      />
    </View>
  );
}
