/**
 * Work Order — Digital Signature Screen
 * Shared between client and provider (both need to sign)
 */
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, PanResponder, Share, Platform, Linking,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
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
//
// Web:    mouse events on the View (onMouseDown/Move/Up/Leave).
//         In-progress stroke lives in `currentPath` state so React re-renders
//         without remounting the SVG (remount drops pointer capture → line vanishes).
//
// Mobile: PanResponder + ref-based live stroke + `tick` to force re-renders
//         (same pattern as before, avoids stale closures in PanResponder callbacks).

const isWeb = Platform.OS === 'web';

function SignatureCanvas({
  onSign, saving, es,
}: {
  onSign: (sig: string) => void;
  saving: boolean;
  es: boolean;
}) {
  const [paths, setPaths] = useState<string[]>([]);

  // Web-only state: current in-progress stroke + drawing flag
  const [currentPath, setCurrentPath] = useState('');
  const isDrawingRef = useRef(false);

  // Mobile-only: live stroke via ref + tick to trigger re-render
  const liveRef = useRef('');
  const [tick, setTick] = useState(0);

  // ── Mobile PanResponder ────────────────────────────────────────────────────
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
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

  // ── Web mouse handlers ─────────────────────────────────────────────────────
  // Commit whatever is in currentPath into the paths array, then reset.
  const commitWebStroke = useCallback(() => {
    isDrawingRef.current = false;
    setCurrentPath((prev) => {
      if (prev) setPaths((ps) => [...ps, prev]);
      return '';
    });
  }, []);

  const webHandlers = useMemo(() => ({
    onMouseDown: (e: any) => {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left).toFixed(1);
      const y = (e.clientY - rect.top).toFixed(1);
      isDrawingRef.current = true;
      setCurrentPath(`M${x},${y}`);
    },
    onMouseMove: (e: any) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left).toFixed(1);
      const y = (e.clientY - rect.top).toFixed(1);
      setCurrentPath((prev) => `${prev} L${x},${y}`);
    },
    onMouseUp:    commitWebStroke,
    onMouseLeave: commitWebStroke,
  }), [commitWebStroke]);

  const hasSignature = paths.length > 0 || (isWeb ? !!currentPath : !!liveRef.current);

  const handleClear = useCallback(() => {
    setPaths([]);
    if (isWeb) {
      setCurrentPath('');
      isDrawingRef.current = false;
    } else {
      liveRef.current = '';
      setTick((t) => t + 1);
    }
  }, []);

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
        {...(isWeb ? webHandlers : panResponder.panHandlers)}
        style={{
          height: 180, borderRadius: 14,
          borderWidth: 1.5, borderColor: hasSignature ? C.accent : C.line,
          backgroundColor: '#FAFBFC',
          overflow: 'hidden',
          ...(isWeb ? { cursor: 'crosshair', userSelect: 'none' } as any : {}),
        }}
      >
        {/*
          Web:    no `key` prop — remounting the SVG drops pointer capture,
                  causing the in-progress stroke to vanish.
          Mobile: `key={tick}` forces SVG re-render on each PanResponder event
                  so the live ref-based stroke is visible while drawing.
        */}
        <Svg key={isWeb ? undefined : tick} width="100%" height="100%">
          {paths.map((p, i) => (
            <Path key={i} d={p} stroke={C.textPrimary} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {isWeb ? (
            currentPath
              ? <Path d={currentPath} stroke={C.textPrimary} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              : null
          ) : (
            liveRef.current
              ? <Path d={liveRef.current} stroke={C.textPrimary} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              : null
          )}
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
          onPress={handleClear}
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
    console.log('[WorkOrder] Loading woId:', woId, '| auth.uid:', user?.id);
    setLoading(true);
    try {
      const { data: woData, error } = await supabase
        .from('work_orders')
        .select('*')
        .eq('id', woId)
        .single();
      if (error) throw error;
      console.log('[WorkOrder] WO loaded: id:', woData?.id, '| provider_id:', woData?.provider_id, '| client_id:', woData?.client_id);

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
  }, [woId, user?.id]);

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

      const { data: sigData, error } = await supabase.from('work_orders').update(updateData).eq('id', wo.id);
      console.log('Signature saved:', sigData, error);
      if (error) throw error;

      // Re-read from DB to check if both parties have now signed.
      // Using local `wo` state is unsafe: if both parties open the WO before
      // either signs, both will see the other's signature as null and neither
      // will set status='signed'. The fresh read is the source of truth.
      const { data: freshWo } = await supabase
        .from('work_orders')
        .select('provider_signature, client_signature')
        .eq('id', wo.id)
        .single();
      const bothSigned = !!freshWo?.provider_signature && !!freshWo?.client_signature;

      if (bothSigned) {
        await supabase.from('work_orders').update({ status: 'signed' }).eq('id', wo.id);
        await supabase.from('job_requests').update({ status: 'in_progress' }).eq('id', wo.job_request_id);
      }

      // Notify other party
      const otherUserId = isClient ? wo.provider_id : wo.client_id;
      const myName = isClient
        ? (wo.client?.full_name ?? (es ? 'El cliente' : 'The client'))
        : (wo.provider?.name ?? (es ? 'El proveedor' : 'The provider'));

      if (bothSigned) {
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
        bothSigned
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

  const isAdmin    = user?.role === 'admin';
  const isClient   = !isAdmin && user?.id === wo.client_id;
  const isProvider = !isAdmin && user?.id === wo.provider_id;
  const isMySigned    = isClient ? !!wo.client_signature : !!wo.provider_signature;
  const isOtherSigned = isClient ? !!wo.provider_signature : !!wo.client_signature;
  const mySignedAt    = isClient ? wo.client_signed_at : wo.provider_signed_at;
  const otherSignedAt = isClient ? wo.provider_signed_at : wo.client_signed_at;
  const myName    = isClient ? (wo.client?.full_name ?? (es ? 'Tú' : 'You')) : (wo.provider?.name ?? (es ? 'Tú' : 'You'));
  const otherName = isClient ? (wo.provider?.name ?? (es ? 'Proveedor' : 'Provider')) : (wo.client?.full_name ?? (es ? 'Cliente' : 'Client'));

  const handleShare = async () => {
    try {
      await Share.share({
        title: `Work Order ${wo.wo_number}`,
        message: [
          `Work Order: ${wo.wo_number}`,
          `Status: ${wo.status}`,
          `Client: ${wo.client?.full_name ?? '—'}`,
          `Provider: ${wo.provider?.name ?? '—'}`,
          `Service: ${wo.job?.service_type === 'commercial' ? (es ? 'Comercial' : 'Commercial') : (es ? 'Residencial' : 'Residential')}`,
          `Location: ${[wo.job?.city, wo.job?.state].filter(Boolean).join(', ')}`,
          `Date: ${wo.job?.scheduled_date ?? '—'}`,
          `Client signed: ${wo.client_signed_at ? new Date(wo.client_signed_at).toLocaleString() : 'Pending'}`,
          `Provider signed: ${wo.provider_signed_at ? new Date(wo.provider_signed_at).toLocaleString() : 'Pending'}`,
        ].join('\n'),
      });
    } catch { /* cancelled */ }
  };

  const handlePrint = async () => {
    const jobType = wo.job?.service_type === 'commercial'
      ? (es ? 'Limpieza Comercial' : 'Commercial Cleaning')
      : (es ? 'Limpieza Residencial' : 'Residential Cleaning');
    const location = [wo.job?.city, wo.job?.state].filter(Boolean).join(', ') || '—';
    const scheduledDate = wo.job?.scheduled_date
      ? new Date(wo.job.scheduled_date + 'T12:00:00').toLocaleDateString(es ? 'es-CO' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : '—';
    const budgetStr = wo.job?.budget_usd
      ? formatUSD(wo.job.budget_usd)
      : wo.job?.budget_cop
      ? formatCOP(wo.job.budget_cop)
      : '—';
    const clientSig = wo.client_signature
      ? `✓ Signed — ${wo.client_signed_at ? new Date(wo.client_signed_at).toLocaleString() : ''}`
      : 'Pending';
    const providerSig = wo.provider_signature
      ? `✓ Signed — ${wo.provider_signed_at ? new Date(wo.provider_signed_at).toLocaleString() : ''}`
      : 'Pending';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Work Order ${wo.wo_number}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #111; }
    h1 { color: #0D1B2A; font-size: 24px; margin-bottom: 4px; }
    .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
    .section { border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 12px; }
    .row { display: flex; margin-bottom: 8px; }
    .label { color: #888; font-size: 12px; width: 160px; flex-shrink: 0; }
    .value { color: #111; font-size: 13px; font-weight: 500; }
    .sig-ok { color: green; }
    .sig-pending { color: orange; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>ProVendor — Work Order</h1>
  <div class="subtitle">#${wo.wo_number} &middot; Created ${new Date(wo.created_at).toLocaleDateString()}</div>
  <div class="section">
    <div class="section-title">Service Details</div>
    <div class="row"><span class="label">Service type</span><span class="value">${jobType}</span></div>
    <div class="row"><span class="label">Location</span><span class="value">${location}</span></div>
    <div class="row"><span class="label">Scheduled date</span><span class="value">${scheduledDate}</span></div>
    ${wo.job?.scheduled_time ? `<div class="row"><span class="label">Time</span><span class="value">${wo.job.scheduled_time}</span></div>` : ''}
    <div class="row"><span class="label">Estimated hours</span><span class="value">${wo.job?.estimated_hours ?? '—'}h</span></div>
    <div class="row"><span class="label">Agreed price</span><span class="value">${budgetStr}</span></div>
    ${wo.job?.description ? `<div class="row"><span class="label">Description</span><span class="value">${wo.job.description}</span></div>` : ''}
  </div>
  <div class="section">
    <div class="section-title">Client</div>
    <div class="row"><span class="label">Name</span><span class="value">${wo.client?.full_name ?? '—'}</span></div>
    ${wo.client?.phone ? `<div class="row"><span class="label">Phone</span><span class="value">${wo.client.phone}</span></div>` : ''}
  </div>
  <div class="section">
    <div class="section-title">Provider</div>
    <div class="row"><span class="label">Name / Company</span><span class="value">${wo.provider?.name ?? '—'}</span></div>
    ${wo.provider?.phone ? `<div class="row"><span class="label">Phone</span><span class="value">${wo.provider.phone}</span></div>` : ''}
    <div class="row"><span class="label">Type</span><span class="value">${wo.provider?.type === 'company' ? 'Company' : 'Independent'}</span></div>
  </div>
  <div class="section">
    <div class="section-title">Signatures</div>
    <div class="row"><span class="label">Client</span><span class="value ${wo.client_signature ? 'sig-ok' : 'sig-pending'}">${clientSig}</span></div>
    <div class="row"><span class="label">Provider</span><span class="value ${wo.provider_signature ? 'sig-ok' : 'sig-pending'}">${providerSig}</span></div>
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

    if (Platform.OS === 'web') {
      const win = (window as any).open('', '_blank');
      if (win) { win.document.write(html); win.document.close(); }
    } else {
      try {
        const path = `${FileSystem.cacheDirectory}WO_${wo.wo_number}.html`;
        await FileSystem.writeAsStringAsync(path, html, { encoding: FileSystem.EncodingType.UTF8 });
        await Linking.openURL(path);
      } catch {
        Alert.alert(
          es ? 'No disponible' : 'Not available',
          es ? 'No se pudo abrir el PDF en este dispositivo.' : 'Could not open the PDF on this device.',
        );
      }
    }
  };

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
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {isAdmin && (
            <TouchableOpacity onPress={handlePrint} style={{ padding: 4 }} activeOpacity={0.7}>
              <Feather name="download" size={20} color={C.accent2} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleShare} style={{ padding: 4 }} activeOpacity={0.7}>
            <Feather name="share-2" size={20} color={C.textPrimary} />
          </TouchableOpacity>
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

          {isAdmin ? (
            /* Admin: read-only view of both signatures */
            <>
              <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 8 }}>
                {es ? 'Firma del Cliente' : "Client's Signature"}
              </Text>
              {wo.client_signature ? (
                <SignedBanner name={wo.client?.full_name ?? 'Client'} dateStr={formatSignedDate(wo.client_signed_at)} es={es} />
              ) : (
                <WaitingBanner name={wo.client?.full_name ?? (es ? 'Cliente' : 'Client')} es={es} />
              )}

              <View style={{ height: 1, backgroundColor: C.line, marginVertical: 16 }} />

              <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 8 }}>
                {es ? 'Firma del Proveedor' : "Provider's Signature"}
              </Text>
              {wo.provider_signature ? (
                <SignedBanner name={wo.provider?.name ?? 'Provider'} dateStr={formatSignedDate(wo.provider_signed_at)} es={es} />
              ) : (
                <WaitingBanner name={wo.provider?.name ?? (es ? 'Proveedor' : 'Provider')} es={es} />
              )}
            </>
          ) : (
            /* Client / Provider: interactive signing */
            <>
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

              <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 8 }}>
                {isClient ? (es ? 'Firma del Proveedor' : "Provider's Signature") : (es ? 'Firma del Cliente' : "Client's Signature")}
              </Text>
              {isOtherSigned ? (
                <SignedBanner name={otherName} dateStr={formatSignedDate(otherSignedAt ?? null)} es={es} />
              ) : (
                <WaitingBanner name={otherName} es={es} />
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
