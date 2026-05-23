import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Modal, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import EmptyState from '@/components/ui/EmptyState';
import Input from '@/components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { fetchJobBids, acceptBid } from '@/lib/jobService';
import { formatUSD, formatCOP } from '@/lib/countryData';
import { useLang } from '@/context/LanguageContext';
import { C } from '@/constants/theme';
import type { JobRequest } from '@/types';
import type { BidWithProvider } from '@/lib/jobService';

type Tab = 'open' | 'in_progress' | 'completed';

function timeAgo(iso: string, es: boolean): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return es ? 'Hoy' : 'Today';
  if (days === 1) return es ? 'Ayer' : 'Yesterday';
  return es ? `Hace ${days}d` : `${days}d ago`;
}

function parseDateInput(value: string): string | null {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, mm, dd, yyyy] = match;
  const d = new Date(`${yyyy}-${mm}-${dd}T12:00:00`);
  if (isNaN(d.getTime())) return null;
  return `${yyyy}-${mm}-${dd}`;
}

function parseTimeInput(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;
  if (period === 'AM') {
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

function isoTimeToDisplay(t: string): string {
  const parts = t.split(':');
  const h = parseInt(parts[0], 10);
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(h12).padStart(2, '0')}:${parts[1]} ${period}`;
}

// ─── Bids Modal ────────────────────────────────────────────────────────────────

interface BidsModalProps {
  job: JobRequest | null;
  visible: boolean;
  isColombia: boolean;
  es: boolean;
  onClose: () => void;
  onAccepted: () => void;
}

function BidsModal({ job, visible, isColombia, es, onClose, onAccepted }: BidsModalProps) {
  const [bids, setBids] = useState<BidWithProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    if (!job || !visible) return;
    setLoading(true);
    setBids([]);
    fetchJobBids(job.id)
      .then(setBids)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [job?.id, visible]);

  const handleAccept = async (bid: BidWithProvider) => {
    if (!job) return;
    const amount = bid.bid_amount_usd ? formatUSD(bid.bid_amount_usd) : formatCOP(bid.bid_amount_cop ?? 0);
    Alert.alert(
      es ? '¿Aceptar oferta?' : 'Accept this bid?',
      es
        ? `¿Confirmas aceptar la oferta de ${bid.provider_name} por ${amount}?`
        : `Confirm accepting ${bid.provider_name}'s bid for ${amount}?`,
      [
        { text: es ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: es ? 'Aceptar' : 'Accept',
          onPress: async () => {
            setAccepting(bid.id);
            try {
              await acceptBid(bid.id, job.id);
              onAccepted();
              onClose();
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Failed to accept bid.');
            } finally {
              setAccepting(null);
            }
          },
        },
      ],
    );
  };

  const bidAmount = (bid: BidWithProvider) =>
    bid.bid_amount_usd ? formatUSD(bid.bid_amount_usd) : bid.bid_amount_cop ? formatCOP(bid.bid_amount_cop) : '—';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
        <View style={{
          backgroundColor: C.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingTop: 20,
          paddingBottom: 48,
          maxHeight: '80%',
          borderTopWidth: 1,
          borderTopColor: C.line,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 16 }}>
            <View>
              <Text style={{ color: C.textPrimary, fontSize: 20, fontFamily: 'Inter_700Bold' }}>
                {es ? 'Ofertas Recibidas' : 'Bids Received'}
              </Text>
              {!loading && (
                <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                  {bids.length} {es ? (bids.length === 1 ? 'oferta' : 'ofertas') : (bids.length === 1 ? 'bid' : 'bids')}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, backgroundColor: C.surface2, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="x" size={18} color={C.textSecondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 48, alignItems: 'center' }}>
              <ActivityIndicator color={C.accent} size="large" />
            </View>
          ) : bids.length === 0 ? (
            <View style={{ paddingVertical: 48, alignItems: 'center', paddingHorizontal: 24 }}>
              <Feather name="inbox" size={36} color={C.textMuted} />
              <Text style={{ color: C.textSecondary, fontSize: 15, fontFamily: 'Inter_600SemiBold', marginTop: 14 }}>
                {es ? 'Aún no hay ofertas' : 'No bids yet'}
              </Text>
              <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 6, textAlign: 'center' }}>
                {es ? 'Los proveedores en tu área verán tu solicitud pronto.' : 'Providers in your area will see your request soon.'}
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>
              {bids.map((bid) => {
                const isAccepted = bid.status === 'accepted';
                const isRejected = bid.status === 'rejected';
                const isLoading = accepting === bid.id;
                const canAccept = bid.status === 'pending' && job?.status === 'open';

                return (
                  <View key={bid.id} style={{
                    backgroundColor: C.background,
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: isAccepted ? C.success : C.line,
                    opacity: isRejected ? 0.5 : 1,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
                      <View style={{
                        width: 40,
                        height: 40,
                        backgroundColor: bid.provider_type === 'company' ? `${C.accent2}20` : `${C.accent}20`,
                        borderRadius: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}>
                        <Feather
                          name={bid.provider_type === 'company' ? 'briefcase' : 'user'}
                          size={16}
                          color={bid.provider_type === 'company' ? C.accent2 : C.accent}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>{bid.provider_name}</Text>
                        <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 }}>
                          {bid.provider_type === 'company' ? (es ? 'Empresa' : 'Company') : (es ? 'Independiente' : 'Independent')}
                          {' · '}{timeAgo(bid.applied_at, es)}
                        </Text>
                      </View>
                      <View style={{ backgroundColor: C.surface2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.accent }}>
                        <Text style={{ color: C.accent, fontSize: 16, fontFamily: 'Inter_700Bold' }}>{bidAmount(bid)}</Text>
                      </View>
                    </View>

                    {bid.message ? (
                      <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18, marginBottom: 12 }}>
                        "{bid.message}"
                      </Text>
                    ) : null}

                    {isAccepted && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${C.success}15`, borderRadius: 10, padding: 10 }}>
                        <Feather name="check-circle" size={14} color={C.success} style={{ marginRight: 6 }} />
                        <Text style={{ color: C.success, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
                          {es ? 'Oferta aceptada' : 'Bid accepted'}
                        </Text>
                      </View>
                    )}

                    {canAccept && (
                      <TouchableOpacity
                        onPress={() => handleAccept(bid)}
                        disabled={!!accepting}
                        style={{
                          backgroundColor: C.accent,
                          borderRadius: 10,
                          paddingVertical: 12,
                          alignItems: 'center',
                          flexDirection: 'row',
                          justifyContent: 'center',
                          opacity: accepting ? 0.6 : 1,
                        }}
                        activeOpacity={0.85}
                      >
                        {isLoading ? (
                          <ActivityIndicator size="small" color="#000" />
                        ) : (
                          <>
                            <Feather name="check" size={15} color="#000" style={{ marginRight: 6 }} />
                            <Text style={{ color: '#000', fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                              {es ? 'Aceptar Oferta' : 'Accept Bid'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
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
  const [dateError, setDateError] = useState('');
  const [timeError, setTimeError] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [budget, setBudget] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!job || !visible) return;
    setEstimatedHours(String(job.estimated_hours ?? ''));
    setBudget(String(job.budget_usd ?? job.budget_cop ?? ''));
    setDescription(job.description ?? '');
    setScheduledDate(job.scheduled_date ? isoDateToDisplay(job.scheduled_date) : '');
    setScheduledTime(job.scheduled_time ? isoTimeToDisplay(job.scheduled_time) : '');
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
    const isoTime = parseTimeInput(scheduledTime);

    let hasError = false;
    if (!isoDate) {
      setDateError(es ? 'Formato inválido. Usa MM/DD/AAAA' : 'Invalid format. Use MM/DD/YYYY');
      hasError = true;
    } else {
      setDateError('');
    }
    if (!isoTime) {
      setTimeError(es ? 'Formato inválido. Usa HH:MM AM/PM' : 'Invalid format. Use HH:MM AM/PM');
      hasError = true;
    } else {
      setTimeError('');
    }
    if (hasError) return;

    setSaving(true);
    try {
      const budgetNum = parseFloat(budget.replace(/[^0-9.]/g, ''));
      const updateData: Record<string, unknown> = {
        scheduled_date: isoDate!,
        scheduled_time: isoTime!,
        estimated_hours: parseFloat(estimatedHours),
        description: description || null,
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
              onChangeText={(v) => { setScheduledDate(v); setDateError(''); }}
              keyboardType="numeric"
              maxLength={10}
              iconName="calendar"
              error={dateError || undefined}
            />
            <Input
              label={es ? 'Hora (HH:MM AM/PM)' : 'Time (HH:MM AM/PM)'}
              placeholder="HH:MM AM/PM"
              value={scheduledTime}
              onChangeText={(v) => { setScheduledTime(v); setTimeError(''); }}
              maxLength={8}
              iconName="clock"
              error={timeError || undefined}
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

function RequestCard({
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
            {req.scheduled_date}
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
}

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
  };

  const [jobs, setJobs] = useState<{ open: JobRequest[]; in_progress: JobRequest[]; completed: JobRequest[] }>({
    open: [], in_progress: [], completed: [],
  });
  const [loading, setLoading] = useState(false);
  const [bidsJob, setBidsJob] = useState<JobRequest | null>(null);
  const [editJob, setEditJob] = useState<JobRequest | null>(null);

  const loadJobs = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('job_requests')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });
      const allJobs = (data ?? []) as JobRequest[];
      setJobs({
        open:        allJobs.filter((j) => j.status === 'open'),
        in_progress: allJobs.filter((j) => j.status === 'in_progress'),
        completed:   allJobs.filter((j) => j.status === 'completed' || j.status === 'cancelled'),
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

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
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent} size="large" />
        </View>
      ) : current.length === 0 ? (
        <EmptyState
          title={es ? `Sin solicitudes ${TAB_LABELS[activeTab].toLowerCase()}` : `No ${TAB_LABELS[activeTab].toLowerCase()} requests`}
          subtitle={es ? 'Publica un trabajo para comenzar' : 'Post a job to get started'}
          iconName="clipboard"
          ctaLabel={es ? 'Publicar Trabajo' : 'Post a Job'}
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
              es={es}
              onViewBids={() => setBidsJob(item)}
              onEdit={() => setEditJob(item)}
              onCancel={() => handleCancel(item)}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <BidsModal
        job={bidsJob}
        visible={!!bidsJob}
        isColombia={isColombia}
        es={es}
        onClose={() => setBidsJob(null)}
        onAccepted={() => { loadJobs(); setActiveTab('in_progress'); }}
      />

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
