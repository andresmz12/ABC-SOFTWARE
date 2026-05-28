import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, PanResponder, StyleSheet,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/context/LanguageContext';
import { C } from '@/constants/theme';
import { getUserPushTokens } from '@/lib/userUtils';
import { sendPushNotification } from '@/lib/notifications';

const CANVAS_HEIGHT = 180;

interface WOData {
  id: string;
  wo_number: string;
  job_request_id: string;
  client_id: string;
  provider_id: string;
  status: string;
  client_signature: string | null;
  provider_signature: string | null;
  client_signed_at: string | null;
  provider_signed_at: string | null;
}

interface JobData {
  id: string;
  service_type: string;
  description: string | null;
  city: string;
  state: string;
  address: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  estimated_hours: number;
  budget_usd: number | null;
  budget_cop: number | null;
}

interface PartyInfo {
  name: string;
  phone: string;
}

function isoDateDisplay(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${m}/${d}/${y}`;
}

function isoTimeDisplay(t: string): string {
  const parts = t.split(':');
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(h12).padStart(2, '0')}:${m} ${period}`;
}

// ─── Signature Canvas ─────────────────────────────────────────────────────────

interface SignatureCanvasProps {
  onSign: (data: string) => void;
  es: boolean;
}

function SignatureCanvas({ onSign, es }: SignatureCanvasProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState('');
  const currentLineRef = useRef('');
  const hasContent = lines.length > 0 || currentLine.length > 0;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        const pt = `M${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        currentLineRef.current = pt;
        setCurrentLine(pt);
      },
      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        const updated = `${currentLineRef.current} L${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        currentLineRef.current = updated;
        setCurrentLine(updated);
      },
      onPanResponderRelease: () => {
        const line = currentLineRef.current;
        if (line) setLines((prev) => [...prev, line]);
        currentLineRef.current = '';
        setCurrentLine('');
      },
    }),
  ).current;

  const clear = () => {
    setLines([]);
    setCurrentLine('');
    currentLineRef.current = '';
  };

  const confirm = () => {
    if (!hasContent) {
      Alert.alert(
        es ? 'Firma vacía' : 'Empty signature',
        es ? 'Por favor dibuja tu firma antes de confirmar.' : 'Please draw your signature before confirming.',
      );
      return;
    }
    onSign(JSON.stringify(lines));
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={styles.label}>{es ? 'Dibuja tu firma' : 'Draw your signature'}</Text>
        {hasContent && (
          <TouchableOpacity onPress={clear} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Feather name="rotate-ccw" size={12} color={C.danger} />
            <Text style={{ color: C.danger, fontSize: 12, fontFamily: 'Inter_500Medium' }}>
              {es ? 'Borrar' : 'Clear'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View
        style={styles.canvasWrapper}
        {...panResponder.panHandlers}
      >
        <Svg width="100%" height={CANVAS_HEIGHT}>
          {lines.map((d, i) => (
            <Path key={i} d={d} stroke="#1A2332" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {currentLine ? (
            <Path d={currentLine} stroke="#1A2332" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ) : null}
        </Svg>
        {!hasContent && (
          <View style={styles.canvasPlaceholder} pointerEvents="none">
            <Feather name="edit-3" size={22} color={C.textMuted} />
            <Text style={styles.canvasPlaceholderText}>
              {es ? 'Firma aquí con el dedo' : 'Sign here with your finger'}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        onPress={confirm}
        style={[styles.signBtn, !hasContent && { opacity: 0.4 }]}
        activeOpacity={0.85}
      >
        <Feather name="check-circle" size={16} color="#FFF" style={{ marginRight: 8 }} />
        <Text style={styles.signBtnText}>
          {es ? 'Firmar y Confirmar' : 'Sign & Confirm'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Detail row ───────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: keyof typeof Feather.glyphMap; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconWrap}>
          <Feather name={icon} size={13} color={C.accent} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ─── Terms text ───────────────────────────────────────────────────────────────

function TermsText({ es }: { es: boolean }) {
  return (
    <Text style={styles.termsText}>
      {es
        ? `1. El proveedor se compromete a prestar el servicio de limpieza en la fecha y hora acordadas, utilizando los materiales y equipos adecuados.\n\n2. El cliente acepta proporcionar acceso al inmueble en el horario pactado y garantizar condiciones seguras de trabajo.\n\n3. El precio acordado es el definitivo. Trabajos adicionales no contemplados en esta orden deberán acordarse por separado.\n\n4. El cliente tiene derecho a revisar el trabajo al finalizar. Si hay inconformidades, deben comunicarse de inmediato al proveedor.\n\n5. ProVendor actúa como intermediario entre las partes. Cualquier disputa se resolverá a través de los canales de soporte de la plataforma.\n\n6. Ambas partes confirman haber leído, entendido y aceptado los términos de esta Orden de Trabajo mediante su firma digital.`
        : `1. The provider commits to delivering the cleaning service on the agreed date and time, using appropriate materials and equipment.\n\n2. The client agrees to provide access to the property at the agreed time and to ensure safe working conditions.\n\n3. The agreed price is final. Any additional work not covered in this order must be agreed upon separately.\n\n4. The client has the right to inspect the work upon completion. Any issues must be communicated to the provider immediately.\n\n5. ProVendor acts as an intermediary between the parties. Any disputes will be resolved through the platform's support channels.\n\n6. Both parties confirm they have read, understood, and accepted the terms of this Work Order through their digital signature.`}
    </Text>
  );
}

// ─── Signature status badge ───────────────────────────────────────────────────

function SignedBadge({ label, date, es }: { label: string; date: string; es: boolean }) {
  return (
    <View style={styles.signedBadge}>
      <Feather name="check-circle" size={14} color={C.success} style={{ marginRight: 6 }} />
      <View>
        <Text style={styles.signedBadgeLabel}>{label}</Text>
        <Text style={styles.signedBadgeDate}>
          {es ? 'Firmado el' : 'Signed'} {new Date(date).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WorkOrderScreen() {
  const { workOrderId } = useLocalSearchParams<{ workOrderId: string }>();
  const { user } = useAuthStore();
  const { lang } = useLang();
  const es = lang === 'es';
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wo, setWo] = useState<WOData | null>(null);
  const [job, setJob] = useState<JobData | null>(null);
  const [clientInfo, setClientInfo] = useState<PartyInfo>({ name: '', phone: '' });
  const [providerInfo, setProviderInfo] = useState<PartyInfo>({ name: '', phone: '' });

  const isClient = wo ? wo.client_id === user?.id : false;
  const isProvider = wo ? wo.provider_id === user?.id : false;
  const alreadySigned = wo
    ? (isClient ? !!wo.client_signature : isProvider ? !!wo.provider_signature : false)
    : false;
  const bothSigned = wo ? !!wo.client_signature && !!wo.provider_signature : false;

  const load = useCallback(async () => {
    if (!workOrderId) return;
    setLoading(true);
    try {
      const { data: woRow, error: woErr } = await supabase
        .from('work_orders')
        .select('*')
        .eq('id', workOrderId)
        .single();
      if (woErr) throw woErr;
      setWo(woRow as WOData);

      const { data: jobRow, error: jobErr } = await supabase
        .from('job_requests')
        .select('id, service_type, description, city, state, address, scheduled_date, scheduled_time, estimated_hours, budget_usd, budget_cop')
        .eq('id', woRow.job_request_id)
        .single();
      if (jobErr) throw jobErr;
      setJob(jobRow as JobData);

      const [clientRes, companyRes, indepRes] = await Promise.all([
        supabase.from('clients').select('full_name, phone').eq('user_id', woRow.client_id).maybeSingle(),
        supabase.from('companies').select('company_name, phone').eq('user_id', woRow.provider_id).maybeSingle(),
        supabase.from('independents').select('full_name, phone').eq('user_id', woRow.provider_id).maybeSingle(),
      ]);

      setClientInfo({
        name: clientRes.data?.full_name ?? '',
        phone: clientRes.data?.phone ?? '',
      });
      setProviderInfo({
        name: companyRes.data?.company_name ?? indepRes.data?.full_name ?? '',
        phone: companyRes.data?.phone ?? indepRes.data?.phone ?? '',
      });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to load work order.');
    } finally {
      setLoading(false);
    }
  }, [workOrderId]);

  useEffect(() => { load(); }, [load]);

  const handleSign = async (signatureData: string) => {
    if (!wo || !user?.id || !job) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const updateFields = isClient
        ? { client_signature: signatureData, client_signed_at: now }
        : { provider_signature: signatureData, provider_signed_at: now };

      const { data: updated, error: updateErr } = await supabase
        .from('work_orders')
        .update(updateFields)
        .eq('id', wo.id)
        .select('*')
        .single();
      if (updateErr) throw updateErr;

      const updatedWo = updated as WOData;
      const nowBothSigned = !!updatedWo.client_signature && !!updatedWo.provider_signature;

      if (nowBothSigned) {
        // Update work order status + job status to in_progress
        await Promise.all([
          supabase.from('work_orders').update({ status: 'signed' }).eq('id', wo.id),
          supabase.from('job_requests').update({ status: 'in_progress' }).eq('id', wo.job_request_id),
        ]);
        // Notify both parties
        const tokenMap = await getUserPushTokens([wo.client_id, wo.provider_id]);
        const pushes: Promise<void>[] = [];
        for (const uid of [wo.client_id, wo.provider_id]) {
          const t = tokenMap[uid];
          if (t?.token) {
            pushes.push(sendPushNotification(
              t.token,
              t.es ? '✅ Trabajo Confirmado' : '✅ Job Confirmed',
              t.es
                ? `Ambas partes firmaron la Orden ${wo.wo_number}. ¡El trabajo puede comenzar!`
                : `Both parties signed Work Order ${wo.wo_number}. The job can begin!`,
              { type: 'wo_both_signed', workOrderId: wo.id },
            ));
          }
        }
        await Promise.allSettled(pushes);
        // Email both
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (token) {
          supabase.functions.invoke('send-email', {
            body: { type: 'wo_both_signed', data: { work_order_id: wo.id, wo_number: wo.wo_number, client_id: wo.client_id, provider_id: wo.provider_id } },
          }).catch((e: unknown) => console.warn('[work-order] wo_both_signed email failed:', e));
        }
      } else if (isClient) {
        // Client just signed — notify provider
        const tokenMap = await getUserPushTokens([wo.provider_id]);
        const t = tokenMap[wo.provider_id];
        if (t?.token) {
          await sendPushNotification(
            t.token,
            t.es ? '✍️ El cliente firmó' : '✍️ Client Signed',
            t.es
              ? `El cliente firmó la Orden ${wo.wo_number}. Ahora es tu turno.`
              : `The client signed Work Order ${wo.wo_number}. Now it's your turn.`,
            { type: 'wo_client_signed', workOrderId: wo.id },
          );
        }
        await supabase.from('notifications').insert({
          user_id: wo.provider_id,
          title_en: 'Client Signed the Work Order',
          title_es: 'El Cliente Firmó la Orden',
          body_en: `The client signed Work Order ${wo.wo_number}. Please review and sign.`,
          body_es: `El cliente firmó la Orden ${wo.wo_number}. Por favor revisa y firma.`,
          type: 'wo_client_signed',
          data: { work_order_id: wo.id },
        });
        // Email provider
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (token) {
          supabase.functions.invoke('send-email', {
            body: { type: 'wo_client_signed', data: { work_order_id: wo.id, wo_number: wo.wo_number, provider_id: wo.provider_id } },
          }).catch((e: unknown) => console.warn('[work-order] wo_client_signed email failed:', e));
        }
      }

      Alert.alert(
        es ? (nowBothSigned ? '🎉 ¡Trabajo Confirmado!' : '✅ Firma Guardada') : (nowBothSigned ? '🎉 Job Confirmed!' : '✅ Signature Saved'),
        es
          ? (nowBothSigned
              ? 'Ambas partes han firmado. El trabajo está oficialmente confirmado y comenzará según lo acordado.'
              : 'Tu firma fue guardada. El trabajo comenzará una vez que la otra parte también firme.')
          : (nowBothSigned
              ? 'Both parties have signed. The job is officially confirmed and will begin as scheduled.'
              : 'Your signature was saved. The job will begin once the other party also signs.'),
        [{ text: es ? 'OK' : 'OK', onPress: () => router.back() }],
      );
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save signature.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  if (!wo || !job) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Feather name="alert-circle" size={36} color={C.danger} />
        <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 12, textAlign: 'center' }}>
          {es ? 'Orden de trabajo no encontrada.' : 'Work order not found.'}
        </Text>
      </View>
    );
  }

  const budgetText = job.budget_usd
    ? `$${Number(job.budget_usd).toLocaleString('en-US')} USD`
    : job.budget_cop
    ? `$${Number(job.budget_cop).toLocaleString('es-CO')} COP`
    : '—';

  const serviceLabel = job.service_type === 'commercial'
    ? (es ? 'Limpieza Comercial' : 'Commercial Cleaning')
    : (es ? 'Limpieza Residencial' : 'Residential Cleaning');

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.background }}
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>ProVendor</Text>
          <Text style={styles.headerSubtitle}>{es ? 'Orden de Trabajo' : 'Work Order'}</Text>
        </View>
        <View style={styles.woBadge}>
          <Text style={styles.woNumber}>{wo.wo_number}</Text>
        </View>
      </View>

      {/* Status banner */}
      {wo.status === 'signed' ? (
        <View style={[styles.statusBanner, { backgroundColor: `${C.success}18`, borderColor: `${C.success}40` }]}>
          <Feather name="check-circle" size={16} color={C.success} style={{ marginRight: 8 }} />
          <Text style={[styles.statusBannerText, { color: C.success }]}>
            {es ? 'Ambas partes firmaron — Trabajo en progreso' : 'Both parties signed — Job in progress'}
          </Text>
        </View>
      ) : (
        <View style={[styles.statusBanner, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B40' }]}>
          <Feather name="alert-triangle" size={16} color="#D97706" style={{ marginRight: 8 }} />
          <Text style={[styles.statusBannerText, { color: '#92400E' }]}>
            {es ? 'Firma requerida de ambas partes' : 'Signature required from both parties'}
          </Text>
        </View>
      )}

      <View style={styles.content}>
        {/* Job Details */}
        <Section title={es ? 'Detalles del Servicio' : 'Service Details'} icon="briefcase">
          <DetailRow label={es ? 'Tipo' : 'Type'} value={serviceLabel} />
          <DetailRow label={es ? 'Fecha' : 'Date'} value={isoDateDisplay(job.scheduled_date)} />
          {job.scheduled_time ? (
            <DetailRow label={es ? 'Hora' : 'Time'} value={isoTimeDisplay(job.scheduled_time)} />
          ) : null}
          <DetailRow label={es ? 'Duración estimada' : 'Est. Duration'} value={`${job.estimated_hours}h`} />
          <DetailRow label={es ? 'Ciudad' : 'City'} value={`${job.city}${job.state ? `, ${job.state}` : ''}`} />
          {job.address ? (
            <DetailRow label={es ? 'Dirección' : 'Address'} value={job.address} />
          ) : null}
          <DetailRow label={es ? 'Precio' : 'Price'} value={budgetText} />
          {job.description ? (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.detailLabel}>{es ? 'Descripción' : 'Description'}</Text>
              <Text style={[styles.detailValue, { textAlign: 'left', marginTop: 4, lineHeight: 20 }]}>
                {job.description}
              </Text>
            </View>
          ) : null}
        </Section>

        {/* Client */}
        <Section title={es ? 'Cliente' : 'Client'} icon="user">
          {clientInfo.name ? <DetailRow label={es ? 'Nombre' : 'Name'} value={clientInfo.name} /> : null}
          {clientInfo.phone ? <DetailRow label={es ? 'Teléfono' : 'Phone'} value={clientInfo.phone} /> : null}
        </Section>

        {/* Provider */}
        <Section title={es ? 'Proveedor' : 'Provider'} icon="tool">
          {providerInfo.name ? <DetailRow label={es ? 'Nombre / Empresa' : 'Name / Company'} value={providerInfo.name} /> : null}
          {providerInfo.phone ? <DetailRow label={es ? 'Teléfono' : 'Phone'} value={providerInfo.phone} /> : null}
        </Section>

        {/* Terms */}
        <Section title={es ? 'Términos y Condiciones' : 'Terms & Conditions'} icon="file-text">
          <TermsText es={es} />
        </Section>

        {/* Signatures section */}
        <Section title={es ? 'Firmas Digitales' : 'Digital Signatures'} icon="edit-3">
          {/* Client signature status */}
          {wo.client_signed_at ? (
            <SignedBadge
              label={es ? 'Firma del Cliente' : 'Client Signature'}
              date={wo.client_signed_at}
              es={es}
            />
          ) : (
            <View style={styles.pendingBadge}>
              <Feather name="clock" size={14} color={C.warning} style={{ marginRight: 6 }} />
              <Text style={styles.pendingBadgeText}>
                {es ? 'Firma del Cliente: Pendiente' : 'Client Signature: Pending'}
              </Text>
            </View>
          )}

          {/* Provider signature status */}
          {wo.provider_signed_at ? (
            <SignedBadge
              label={es ? 'Firma del Proveedor' : 'Provider Signature'}
              date={wo.provider_signed_at}
              es={es}
            />
          ) : (
            <View style={styles.pendingBadge}>
              <Feather name="clock" size={14} color={C.warning} style={{ marginRight: 6 }} />
              <Text style={styles.pendingBadgeText}>
                {es ? 'Firma del Proveedor: Pendiente' : 'Provider Signature: Pending'}
              </Text>
            </View>
          )}

          {/* Signature pad — only shown if user hasn't signed yet */}
          {!alreadySigned && !bothSigned && (isClient || isProvider) ? (
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.label, { marginBottom: 12 }]}>
                {es
                  ? `Firma como ${isClient ? 'Cliente' : 'Proveedor'}`
                  : `Sign as ${isClient ? 'Client' : 'Provider'}`}
              </Text>
              {saving ? (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <ActivityIndicator color={C.accent} />
                  <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 10, fontFamily: 'Inter_400Regular' }}>
                    {es ? 'Guardando firma...' : 'Saving signature...'}
                  </Text>
                </View>
              ) : (
                <SignatureCanvas onSign={handleSign} es={es} />
              )}
            </View>
          ) : alreadySigned && !bothSigned ? (
            <View style={styles.waitingBox}>
              <Feather name="loader" size={16} color={C.accent} style={{ marginRight: 8 }} />
              <Text style={styles.waitingText}>
                {es
                  ? `Tu firma fue guardada. Esperando que ${isClient ? 'el proveedor' : 'el cliente'} firme.`
                  : `Your signature is saved. Waiting for the ${isClient ? 'provider' : 'client'} to sign.`}
              </Text>
            </View>
          ) : null}
        </Section>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 20,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: C.accent,
    fontSize: 18,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: C.textSecondary,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  woBadge: {
    backgroundColor: C.surface2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.accent,
  },
  woNumber: {
    color: C.accent,
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  statusBannerText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  section: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: `${C.accent}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sectionTitle: {
    color: C.textPrimary,
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  detailLabel: {
    color: C.textMuted,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  detailValue: {
    color: C.textPrimary,
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'right',
    maxWidth: '55%',
  },
  termsText: {
    color: C.textSecondary,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 19,
  },
  label: {
    color: C.textSecondary,
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  canvasWrapper: {
    height: CANVAS_HEIGHT,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.line,
    borderStyle: 'dashed',
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  canvasPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  canvasPlaceholderText: {
    color: C.textMuted,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  signBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    backgroundColor: C.accent,
    marginTop: 4,
  },
  signBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  signedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${C.success}10`,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: `${C.success}30`,
    marginBottom: 8,
  },
  signedBadgeLabel: {
    color: C.success,
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  signedBadgeDate: {
    color: C.textMuted,
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F59E0B30',
    marginBottom: 8,
  },
  pendingBadgeText: {
    color: '#92400E',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  waitingBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${C.accent}10`,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: `${C.accent}30`,
    marginTop: 12,
  },
  waitingText: {
    color: C.accent,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    flex: 1,
    lineHeight: 19,
  },
});
