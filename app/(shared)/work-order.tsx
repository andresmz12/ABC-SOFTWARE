/**
 * Work Order — Digital Signature Screen
 * Shared between client and provider (both need to sign)
 */
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useLang } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { formatUSD, formatCOP } from '@/lib/countryData';
import { C } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WODetail {
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
  created_at: string;
  job: {
    service_type: string;
    city: string;
    state: string;
    scheduled_date: string;
    scheduled_time: string | null;
    description: string | null;
    budget_usd: number | null;
    budget_cop: number | null;
    estimated_hours: number;
    country: string;
  } | null;
  client: { full_name: string; phone: string } | null;
  provider: { name: string; phone: string; type: string } | null;
}

// ─── Terms ────────────────────────────────────────────────────────────────────

const TERMS_EN = `SERVICE AGREEMENT TERMS & CONDITIONS

By signing this Work Order, both parties agree to the following:

1. SCOPE OF WORK
The provider agrees to perform the cleaning services described in this Work Order at the specified location and time. Any additional work outside the agreed scope requires written approval.

2. PAYMENT
Payment is due upon completion of services as agreed. Late payments may incur additional fees of 1.5% per month.

3. CANCELLATION POLICY
Cancellations within 24 hours of the scheduled service may result in a cancellation fee of up to 50% of the agreed price.

4. LIABILITY
The provider is responsible for any damage caused by negligence during the service. The client must secure valuables before the service begins.

5. CONFIDENTIALITY
Both parties agree to keep all personal information exchanged confidential.

6. DISPUTE RESOLUTION
Any disputes shall be resolved through the ProVendor platform's dispute resolution process before seeking legal remedies.

By signing, you confirm you have read, understood, and agree to these terms.`;

const TERMS_ES = `TÉRMINOS Y CONDICIONES DEL ACUERDO DE SERVICIO

Al firmar esta Orden de Trabajo, ambas partes acuerdan lo siguiente:

1. ALCANCE DEL TRABAJO
El proveedor se compromete a realizar los servicios de limpieza descritos en esta Orden en el lugar y hora especificados. Cualquier trabajo adicional fuera del alcance acordado requiere aprobación por escrito.

2. PAGO
El pago se debe a la finalización de los servicios según lo acordado. Los pagos tardíos pueden incurrir en cargos adicionales del 1.5% mensual.

3. POLÍTICA DE CANCELACIÓN
Las cancelaciones dentro de las 24 horas del servicio programado pueden resultar en un cargo de cancelación de hasta el 50% del precio acordado.

4. RESPONSABILIDAD
El proveedor es responsable de cualquier daño causado por negligencia durante el servicio. El cliente debe asegurar sus objetos de valor antes del servicio.

5. CONFIDENCIALIDAD
Ambas partes acuerdan mantener confidencial toda la información personal intercambiada.

6. RESOLUCIÓN DE DISPUTAS
Cualquier disputa se resolverá a través del proceso de resolución de disputas de la plataforma ProVendor antes de buscar recursos legales.

Al firmar, confirmas que has leído, entendido y aceptado estos términos.`;

// ─── Signature Canvas ─────────────────────────────────────────────────────────

function SignatureCanvas({
  onSign, saving, es,
}: {
  onSign: (sig: string) => void;
  saving: boolean;
  es: boolean;
}) {
  const [paths, setPaths] = useState<string[]>([]);
  const liveRef = useRef('');
  const [tick, setTick] = useState(0);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      liveRef.current = `M${locationX.toFixed(1)},${locationY.toFixed(1)}`;
      setTick((t) => t + 1);
    },
    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      liveRef.current += ` L${locationX.toFixed(1)},${locationY.toFixed(1)}`;
      setTick((t) => t + 1);
    },
    onPanResponderRelease: () => {
      if (liveRef.current) {
        setPaths((prev) => [...prev, liveRef.current]);
        liveRef.current = '';
        setTick((t) => t + 1);
      }
    },
  }), []);

  const hasSignature = paths.length > 0 || !!liveRef.current;

  const handleSign = () => {
    if (!hasSignature) {
      Alert.alert(
        es ? 'Firma requerida' : 'Signature required',
        es ? 'Por favor dibuja tu firma antes de confirmar.' : 'Please draw your signature before confirming.',
      );
      return;
    }
    onSign(JSON.stringify(paths));
  };

  return (
    <View>
      <Text style={{ color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
        {es ? 'Tu Firma' : 'Your Signature'}
      </Text>

      {/* Canvas */}
      <View
        {...panResponder.panHandlers}
        style={{
          height: 180, borderRadius: 14,
          borderWidth: 1.5, borderColor: hasSignature ? C.accent : C.line,
          backgroundColor: '#FAFBFC',
          overflow: 'hidden',
        }}
      >
        <Svg key={tick} width="100%" height="100%">
          {paths.map((p, i) => (
            <Path key={i} d={p} stroke={C.textPrimary} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {liveRef.current ? (
            <Path d={liveRef.current} stroke={C.textPrimary} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ) : null}
        </Svg>
        {!hasSignature && (
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, top: 0, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <Feather name="edit-2" size={20} color={C.line} />
            <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 6 }}>
              {es ? 'Dibuja tu firma aquí' : 'Draw your signature here'}
            </Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <TouchableOpacity
          onPress={() => { setPaths([]); liveRef.current = ''; setTick((t) => t + 1); }}
          style={{
            flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: C.line,
            alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6,
          }}
          activeOpacity={0.8}
        >
          <Feather name="trash-2" size={14} color={C.textSecondary} />
          <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_500Medium' }}>
            {es ? 'Limpiar' : 'Clear'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSign}
          disabled={saving || !hasSignature}
          style={{
            flex: 2, height: 44, borderRadius: 10,
            backgroundColor: hasSignature ? C.accent : `${C.accent}50`,
            alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6,
          }}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Feather name="check" size={15} color="#FFF" />
              <Text style={{ color: '#FFF', fontSize: 14, fontFamily: 'Inter_700Bold' }}>
                {es ? 'Firmar y Confirmar' : 'Sign & Confirm'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Signed Banner ────────────────────────────────────────────────────────────

function SignedBanner({ name, dateStr, es }: { name: string; dateStr: string; es: boolean }) {
  return (
    <View style={{
      backgroundColor: `${C.success}12`, borderRadius: 12, padding: 14,
      borderWidth: 1, borderColor: `${C.success}30`,
      flexDirection: 'row', alignItems: 'center', gap: 10,
    }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${C.success}25`, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name="check" size={16} color={C.success} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.success, fontSize: 13, fontFamily: 'Inter_700Bold' }}>
          {name} — {es ? 'Firmado' : 'Signed'}
        </Text>
        <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 }}>
          {dateStr}
        </Text>
      </View>
    </View>
  );
}

// ─── Waiting Banner ───────────────────────────────────────────────────────────

function WaitingBanner({ name, es }: { name: string; es: boolean }) {
  return (
    <View style={{
      backgroundColor: `${C.warning}10`, borderRadius: 12, padding: 14,
      borderWidth: 1, borderColor: `${C.warning}30`,
      flexDirection: 'row', alignItems: 'center', gap: 10,
    }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${C.warning}20`, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name="clock" size={16} color={C.warning} />
      </View>
      <Text style={{ flex: 1, color: C.warning, fontSize: 13, fontFamily: 'Inter_500Medium' }}>
        {es
          ? `Esperando firma de ${name}`
          : `Waiting for ${name}'s signature`}
      </Text>
    </View>
  );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
      <Text style={{ fontSize: 14, marginRight: 8, marginTop: 1 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular' }}>{label}</Text>
        <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_500Medium', marginTop: 1 }}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Section Box ──────────────────────────────────────────────────────────────

function SectionBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{
      backgroundColor: C.surface,
      borderRadius: 16, borderWidth: 1, borderColor: C.line,
      padding: 16, marginBottom: 12,
    }}>
      <Text style={{ color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_700Bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WorkOrderScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const { lang } = useLang();
  const es = lang === 'es';
  const { woId } = useLocalSearchParams<{ woId: string }>();

  const [wo, setWo] = useState<WODetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadWO = useCallback(async () => {
    if (!woId) return;
    setLoading(true);
    try {
      const { data: woData, error } = await supabase
        .from('work_orders')
        .select('*')
        .eq('id', woId)
        .single();
      if (error) throw error;

      // Fetch job, client, provider in parallel
      const [jobRes, clientRes, companyRes, indepRes] = await Promise.all([
        supabase.from('job_requests').select('service_type, city, state, scheduled_date, scheduled_time, description, budget_usd, budget_cop, estimated_hours, country').eq('id', woData.job_request_id).maybeSingle(),
        supabase.from('clients').select('full_name, phone').eq('user_id', woData.client_id).maybeSingle(),
        supabase.from('companies').select('company_name, phone').eq('user_id', woData.provider_id).maybeSingle(),
        supabase.from('independents').select('full_name, phone').eq('user_id', woData.provider_id).maybeSingle(),
      ]);

      const providerData = companyRes.data
        ? { name: companyRes.data.company_name, phone: companyRes.data.phone ?? '', type: 'company' }
        : indepRes.data
        ? { name: indepRes.data.full_name, phone: indepRes.data.phone ?? '', type: 'independent' }
        : null;

      setWo({
        ...woData,
        job: jobRes.data ?? null,
        client: clientRes.data ?? null,
        provider: providerData,
      });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [woId]);

  useEffect(() => { loadWO(); }, [loadWO]);

  const handleSign = async (signature: string) => {
    if (!wo || !user?.id) return;
    const isClient   = user.id === wo.client_id;
    const isProvider = user.id === wo.provider_id;
    if (!isClient && !isProvider) return;

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const updateData: Record<string, unknown> = isClient
        ? { client_signature: signature, client_signed_at: now }
        : { provider_signature: signature, provider_signed_at: now };

      const bothWillBeSigned = isClient
        ? !!wo.provider_signature
        : !!wo.client_signature;

      if (bothWillBeSigned) {
        updateData.status = 'signed';
      }

      const { error } = await supabase.from('work_orders').update(updateData).eq('id', wo.id);
      if (error) throw error;

      // When both signed → set job to in_progress
      if (bothWillBeSigned) {
        await supabase.from('job_requests').update({ status: 'in_progress' }).eq('id', wo.job_request_id);
      }

      // Notify other party
      const otherUserId = isClient ? wo.provider_id : wo.client_id;
      const myName = isClient
        ? (wo.client?.full_name ?? (es ? 'El cliente' : 'The client'))
        : (wo.provider?.name ?? (es ? 'El proveedor' : 'The provider'));

      if (bothWillBeSigned) {
        // Notify both that WO is complete
        await supabase.from('notifications').insert([
          {
            user_id: wo.client_id,
            title_en: `Work Order ${wo.wo_number} — Confirmed`,
            title_es: `Orden de Trabajo ${wo.wo_number} — Confirmada`,
            body_en: 'Both parties have signed. The job is now active!',
            body_es: '¡Ambas partes han firmado. El trabajo está activo!',
            type: 'wo_signed',
            data: { wo_id: wo.id, job_id: wo.job_request_id },
          },
          {
            user_id: wo.provider_id,
            title_en: `Work Order ${wo.wo_number} — Confirmed`,
            title_es: `Orden de Trabajo ${wo.wo_number} — Confirmada`,
            body_en: 'Both parties have signed. The job is now active!',
            body_es: '¡Ambas partes han firmado. El trabajo está activo!',
            type: 'wo_signed',
            data: { wo_id: wo.id, job_id: wo.job_request_id },
          },
        ]);
      } else {
        await supabase.from('notifications').insert({
          user_id: otherUserId,
          title_en: `Work Order ${wo.wo_number} — Signature Needed`,
          title_es: `Orden de Trabajo ${wo.wo_number} — Firma Requerida`,
          body_en: `${myName} has signed the work order. Your signature is now required.`,
          body_es: `${myName} ha firmado la orden de trabajo. Ahora se requiere tu firma.`,
          type: 'wo_pending_signature',
          data: { wo_id: wo.id, job_id: wo.job_request_id },
        });
      }

      Alert.alert(
        es ? '¡Firmado!' : 'Signed!',
        bothWillBeSigned
          ? (es ? '¡Ambas partes han firmado! El trabajo está activo.' : 'Both parties signed! The job is now active.')
          : (es ? 'Firma registrada. El otro participante recibirá una notificación.' : 'Signature recorded. The other party will be notified.'),
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (e: any) {
      Alert.alert('Error', e.message);
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

  if (!wo) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ color: C.textSecondary, fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center' }}>
          {es ? 'Orden de trabajo no encontrada.' : 'Work order not found.'}
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: C.accent, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
            {es ? 'Volver' : 'Go back'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isClient = user?.id === wo.client_id;
  const isMySigned    = isClient ? !!wo.client_signature : !!wo.provider_signature;
  const isOtherSigned = isClient ? !!wo.provider_signature : !!wo.client_signature;
  const mySignedAt    = isClient ? wo.client_signed_at : wo.provider_signed_at;
  const otherSignedAt = isClient ? wo.provider_signed_at : wo.client_signed_at;
  const myName    = isClient ? (wo.client?.full_name ?? (es ? 'Tú' : 'You')) : (wo.provider?.name ?? (es ? 'Tú' : 'You'));
  const otherName = isClient ? (wo.provider?.name ?? (es ? 'Proveedor' : 'Provider')) : (wo.client?.full_name ?? (es ? 'Cliente' : 'Client'));

  const isSigned = wo.status === 'signed' || wo.status === 'active' || wo.status === 'completed';

  const formatSignedDate = (iso: string | null) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString(es ? 'es-CO' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const budget = wo.job?.budget_usd
    ? formatUSD(wo.job.budget_usd)
    : wo.job?.budget_cop
    ? formatCOP(wo.job.budget_cop)
    : null;

  const statusColor: Record<string, string> = {
    pending_signatures: C.warning,
    signed: C.success,
    active: '#3B82F6',
    completed: C.success,
    cancelled: C.danger,
  };
  const statusLabel: Record<string, [string, string]> = {
    pending_signatures: ['Pending Signatures', 'Firmas Pendientes'],
    signed:   ['Signed', 'Firmada'],
    active:   ['Active', 'Activa'],
    completed:['Completed', 'Completada'],
    cancelled:['Cancelled', 'Cancelada'],
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: insets.top + 14, paddingBottom: 14,
        backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.line,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: C.textPrimary, fontSize: 16, fontFamily: 'Inter_700Bold' }}>
            {wo.wo_number}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 }}>
            {es ? 'Orden de Trabajo' : 'Work Order'}
          </Text>
        </View>
        <View style={{
          paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
          backgroundColor: `${statusColor[wo.status] ?? C.textMuted}20`,
        }}>
          <Text style={{ color: statusColor[wo.status] ?? C.textMuted, fontSize: 10, fontFamily: 'Inter_700Bold' }}>
            {(statusLabel[wo.status]?.[es ? 1 : 0] ?? wo.status).toUpperCase()}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ProVendor Logo header */}
        <View style={{
          backgroundColor: C.accent, borderRadius: 16, padding: 20, marginBottom: 12,
          alignItems: 'center',
        }}>
          <Text style={{ color: '#FFF', fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>
            ProVendor
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
            {es ? 'Orden de Trabajo Oficial' : 'Official Work Order'}
          </Text>
          <Text style={{ color: '#FFF', fontSize: 18, fontFamily: 'Inter_700Bold', marginTop: 8 }}>
            #{wo.wo_number}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
            {new Date(wo.created_at).toLocaleDateString(es ? 'es-CO' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        {/* Job Details */}
        <SectionBox title={es ? 'Detalles del Servicio' : 'Service Details'}>
          <InfoRow
            icon={wo.job?.service_type === 'commercial' ? '🏢' : '🏠'}
            label={es ? 'Tipo de servicio' : 'Service type'}
            value={wo.job?.service_type === 'commercial'
              ? (es ? 'Limpieza Comercial' : 'Commercial Cleaning')
              : (es ? 'Limpieza Residencial' : 'Residential Cleaning')}
          />
          <InfoRow
            icon="📍"
            label={es ? 'Ubicación' : 'Location'}
            value={[wo.job?.city, wo.job?.state].filter(Boolean).join(', ') || '—'}
          />
          <InfoRow
            icon="📅"
            label={es ? 'Fecha programada' : 'Scheduled date'}
            value={wo.job?.scheduled_date
              ? new Date(wo.job.scheduled_date + 'T12:00:00').toLocaleDateString(es ? 'es-CO' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
              : '—'}
          />
          {wo.job?.scheduled_time && (
            <InfoRow icon="🕐" label={es ? 'Hora' : 'Time'} value={wo.job.scheduled_time} />
          )}
          <InfoRow
            icon="⏱"
            label={es ? 'Horas estimadas' : 'Estimated hours'}
            value={`${wo.job?.estimated_hours ?? '—'}h`}
          />
          {budget && (
            <InfoRow icon="💰" label={es ? 'Precio acordado' : 'Agreed price'} value={budget} />
          )}
          {wo.job?.description && (
            <InfoRow icon="📝" label={es ? 'Descripción' : 'Description'} value={wo.job.description} />
          )}
        </SectionBox>

        {/* Client */}
        <SectionBox title={es ? 'Cliente' : 'Client'}>
          <InfoRow icon="👤" label={es ? 'Nombre' : 'Name'} value={wo.client?.full_name ?? '—'} />
          {wo.client?.phone && (
            <InfoRow icon="📞" label={es ? 'Teléfono' : 'Phone'} value={wo.client.phone} />
          )}
        </SectionBox>

        {/* Provider */}
        <SectionBox title={es ? 'Proveedor' : 'Provider'}>
          <InfoRow icon="🏢" label={es ? 'Nombre / Empresa' : 'Name / Company'} value={wo.provider?.name ?? '—'} />
          {wo.provider?.phone && (
            <InfoRow icon="📞" label={es ? 'Teléfono' : 'Phone'} value={wo.provider.phone} />
          )}
          <InfoRow
            icon="🔖"
            label={es ? 'Tipo' : 'Type'}
            value={wo.provider?.type === 'company' ? (es ? 'Empresa' : 'Company') : (es ? 'Independiente' : 'Independent')}
          />
        </SectionBox>

        {/* Terms */}
        <SectionBox title={es ? 'Términos y Condiciones' : 'Terms & Conditions'}>
          <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 }}>
            {es ? TERMS_ES : TERMS_EN}
          </Text>
        </SectionBox>

        {/* Signatures */}
        <View style={{
          backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.line,
          padding: 16, marginBottom: 12,
        }}>
          <Text style={{ color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_700Bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
            {es ? 'Firmas' : 'Signatures'}
          </Text>

          {/* My signature */}
          <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 8 }}>
            {isClient ? (es ? 'Tu firma (Cliente)' : 'Your signature (Client)') : (es ? 'Tu firma (Proveedor)' : 'Your signature (Provider)')}
          </Text>
          {isMySigned ? (
            <SignedBanner name={myName} dateStr={formatSignedDate(mySignedAt ?? null)} es={es} />
          ) : isSigned ? (
            <SignedBanner name={myName} dateStr="—" es={es} />
          ) : (
            <SignatureCanvas onSign={handleSign} saving={saving} es={es} />
          )}

          <View style={{ height: 1, backgroundColor: C.line, marginVertical: 16 }} />

          {/* Other party signature */}
          <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 8 }}>
            {isClient ? (es ? 'Firma del Proveedor' : "Provider's Signature") : (es ? 'Firma del Cliente' : "Client's Signature")}
          </Text>
          {isOtherSigned ? (
            <SignedBanner name={otherName} dateStr={formatSignedDate(otherSignedAt ?? null)} es={es} />
          ) : (
            <WaitingBanner name={otherName} es={es} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
