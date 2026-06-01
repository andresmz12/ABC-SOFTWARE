/**
 * Admin — Work Orders
 * List of all work orders with status filters + detail view
 */
import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, ActivityIndicator, TouchableOpacity,
  ScrollView, Modal,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import EmptyState from '@/components/ui/EmptyState';
import { Feather } from '@expo/vector-icons';
import { useLang } from '@/context/LanguageContext';
import { C } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import Svg, { Path } from 'react-native-svg';

type WOFilter = 'all' | 'pending_signatures' | 'signed' | 'active' | 'completed' | 'cancelled';

interface WORow {
  id: string;
  wo_number: string;
  status: string;
  created_at: string;
  client_name: string;
  provider_name: string;
  job_type: string;
  job_city: string;
  client_signature: string | null;
  provider_signature: string | null;
  client_signed_at: string | null;
  provider_signed_at: string | null;
}

const FILTERS: { key: WOFilter; labelEn: string; labelEs: string }[] = [
  { key: 'all',                labelEn: 'All',               labelEs: 'Todos' },
  { key: 'pending_signatures', labelEn: 'Pending Signature', labelEs: 'Firma Pendiente' },
  { key: 'signed',             labelEn: 'Signed',            labelEs: 'Firmadas' },
  { key: 'active',             labelEn: 'Active',            labelEs: 'Activas' },
  { key: 'completed',          labelEn: 'Completed',         labelEs: 'Completadas' },
  { key: 'cancelled',          labelEn: 'Cancelled',         labelEs: 'Canceladas' },
];

const STATUS_COLOR: Record<string, string> = {
  pending_signatures: C.warning,
  signed: C.success,
  active: '#3B82F6',
  completed: C.success,
  cancelled: C.danger,
};

const STATUS_LABEL: Record<string, [string, string]> = {
  pending_signatures: ['Pending Sig.', 'Firma Pend.'],
  signed:    ['Signed',    'Firmada'],
  active:    ['Active',    'Activa'],
  completed: ['Completed', 'Completada'],
  cancelled: ['Cancelled', 'Cancelada'],
};

function SignatureSVG({ data }: { data: string | null }) {
  if (!data) return null;
  try {
    const paths: string[] = JSON.parse(data);
    if (!paths.length) return null;
    return (
      <View style={{ height: 80, borderRadius: 8, borderWidth: 1, borderColor: C.line, backgroundColor: '#FAFBFC', overflow: 'hidden' }}>
        <Svg width="100%" height="100%" viewBox="0 0 300 80">
          {paths.map((p, i) => (
            <Path key={i} d={p} stroke={C.textPrimary} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </Svg>
      </View>
    );
  } catch {
    return null;
  }
}

function WOCard({ wo, es, onPress }: { wo: WORow; es: boolean; onPress: () => void }) {
  const color = STATUS_COLOR[wo.status] ?? C.textMuted;
  const label = STATUS_LABEL[wo.status]?.[es ? 1 : 0] ?? wo.status;
  const date = new Date(wo.created_at).toLocaleDateString(es ? 'es-CO' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        backgroundColor: C.surface, borderRadius: 16,
        borderWidth: 1, borderColor: C.line,
        borderLeftWidth: 3, borderLeftColor: color,
        padding: 14, marginBottom: 10,
        flexDirection: 'row', alignItems: 'center',
      }}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_700Bold' }}>
            {wo.wo_number}
          </Text>
          <View style={{ backgroundColor: `${color}20`, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Text style={{ color, fontSize: 10, fontFamily: 'Inter_700Bold' }}>{label.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_500Medium' }} numberOfLines={1}>
          {wo.client_name}  →  {wo.provider_name}
        </Text>
        <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
          {wo.job_type === 'commercial' ? (es ? 'Comercial' : 'Commercial') : (es ? 'Residencial' : 'Residential')}
          {wo.job_city ? `  ·  ${wo.job_city}` : ''}  ·  {date}
        </Text>
        {/* Signature indicators */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Feather name={wo.client_signature ? 'check-circle' : 'circle'} size={12} color={wo.client_signature ? C.success : C.textMuted} />
            <Text style={{ color: wo.client_signature ? C.success : C.textMuted, fontSize: 10, fontFamily: 'Inter_500Medium' }}>
              {es ? 'Cliente' : 'Client'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Feather name={wo.provider_signature ? 'check-circle' : 'circle'} size={12} color={wo.provider_signature ? C.success : C.textMuted} />
            <Text style={{ color: wo.provider_signature ? C.success : C.textMuted, fontSize: 10, fontFamily: 'Inter_500Medium' }}>
              {es ? 'Proveedor' : 'Provider'}
            </Text>
          </View>
        </View>
      </View>
      <Feather name="chevron-right" size={16} color={C.textMuted} style={{ marginLeft: 8 }} />
    </TouchableOpacity>
  );
}

function WODetailModal({ wo, es, onClose }: { wo: WORow | null; es: boolean; onClose: () => void }) {
  if (!wo) return null;
  const color = STATUS_COLOR[wo.status] ?? C.textMuted;
  const label = STATUS_LABEL[wo.status]?.[es ? 1 : 0] ?? wo.status;
  const formatDate = (iso: string | null) => iso
    ? new Date(iso).toLocaleString(es ? 'es-CO' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : (es ? 'Pendiente' : 'Pending');

  return (
    <Modal visible={!!wo} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(13,27,42,0.6)', justifyContent: 'flex-end' }}>
        <View style={{
          backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
          paddingTop: 20, paddingBottom: 48, maxHeight: '90%',
          borderTopWidth: 1, borderTopColor: C.line,
        }}>
          {/* Handle */}
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.line, alignSelf: 'center', marginBottom: 16 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 16 }}>
            <View>
              <Text style={{ color: C.textPrimary, fontSize: 20, fontFamily: 'Inter_700Bold' }}>
                {wo.wo_number}
              </Text>
              <View style={{ backgroundColor: `${color}20`, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 4 }}>
                <Text style={{ color, fontSize: 11, fontFamily: 'Inter_700Bold' }}>{label.toUpperCase()}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, backgroundColor: C.surface2, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="x" size={18} color={C.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
            {/* Parties */}
            <View style={{ backgroundColor: C.surface2, borderRadius: 12, padding: 14, marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.textMuted, fontSize: 10, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>
                    {es ? 'Cliente' : 'Client'}
                  </Text>
                  <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>{wo.client_name}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.textMuted, fontSize: 10, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>
                    {es ? 'Proveedor' : 'Provider'}
                  </Text>
                  <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>{wo.provider_name}</Text>
                </View>
              </View>
            </View>

            {/* Client Signature */}
            <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_700Bold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              {es ? 'Firma del Cliente' : "Client's Signature"}
            </Text>
            {wo.client_signature ? (
              <>
                <SignatureSVG data={wo.client_signature} />
                <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4, marginBottom: 14 }}>
                  {formatDate(wo.client_signed_at)}
                </Text>
              </>
            ) : (
              <View style={{ height: 60, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: C.line, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' }}>{es ? 'Sin firma' : 'No signature yet'}</Text>
              </View>
            )}

            {/* Provider Signature */}
            <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_700Bold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              {es ? 'Firma del Proveedor' : "Provider's Signature"}
            </Text>
            {wo.provider_signature ? (
              <>
                <SignatureSVG data={wo.provider_signature} />
                <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
                  {formatDate(wo.provider_signed_at)}
                </Text>
              </>
            ) : (
              <View style={{ height: 60, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' }}>{es ? 'Sin firma' : 'No signature yet'}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function AdminWorkOrders() {
  const { lang } = useLang();
  const es = lang === 'es';
  const [wos, setWos] = useState<WORow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<WOFilter>('all');
  const [selectedWO, setSelectedWO] = useState<WORow | null>(null);

  const loadWOs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('id, wo_number, status, created_at, job_request_id, client_id, provider_id, client_signature, provider_signature, client_signed_at, provider_signed_at')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      if (!data?.length) { setWos([]); return; }

      const clientIds  = [...new Set(data.map((w: any) => w.client_id).filter(Boolean))];
      const providerIds = [...new Set(data.map((w: any) => w.provider_id).filter(Boolean))];
      const jobIds     = [...new Set(data.map((w: any) => w.job_request_id).filter(Boolean))];

      const [clientsRes, companiesRes, indepsRes, jobsRes] = await Promise.all([
        clientIds.length  > 0 ? supabase.from('clients').select('user_id, full_name').in('user_id', clientIds) : { data: [] },
        providerIds.length > 0 ? supabase.from('companies').select('user_id, company_name').in('user_id', providerIds) : { data: [] },
        providerIds.length > 0 ? supabase.from('independents').select('user_id, full_name').in('user_id', providerIds) : { data: [] },
        jobIds.length     > 0 ? supabase.from('job_requests').select('id, service_type, city').in('id', jobIds) : { data: [] },
      ]);

      const clientMap: Record<string, string>   = Object.fromEntries((clientsRes.data ?? []).map((c: any) => [c.user_id, c.full_name]));
      const providerMap: Record<string, string>  = {};
      (companiesRes.data ?? []).forEach((c: any) => { providerMap[c.user_id] = c.company_name; });
      (indepsRes.data ?? []).forEach((i: any) => { if (!providerMap[i.user_id]) providerMap[i.user_id] = i.full_name; });
      const jobMap: Record<string, { service_type: string; city: string }> = Object.fromEntries(
        (jobsRes.data ?? []).map((j: any) => [j.id, { service_type: j.service_type, city: j.city }]),
      );

      setWos(data.map((w: any) => ({
        id: w.id,
        wo_number: w.wo_number,
        status: w.status,
        created_at: w.created_at,
        client_name:   clientMap[w.client_id]   ?? `#${w.client_id?.slice(0, 6)}`,
        provider_name: providerMap[w.provider_id] ?? `#${w.provider_id?.slice(0, 6)}`,
        job_type: jobMap[w.job_request_id]?.service_type ?? 'residential',
        job_city: jobMap[w.job_request_id]?.city ?? '',
        client_signature: w.client_signature,
        provider_signature: w.provider_signature,
        client_signed_at: w.client_signed_at,
        provider_signed_at: w.provider_signed_at,
      })));
    } catch (e: any) {
      console.warn('[AdminWOs] error:', e?.message ?? e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadWOs(); }, [loadWOs]));

  const filtered = filter === 'all' ? wos : wos.filter((w) => w.status === filter);
  const pendingCount = wos.filter((w) => w.status === 'pending_signatures').length;

  return (
    <ScreenWrapper>
      <View style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 8 }}>
        <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>
          {es ? 'Órdenes de Trabajo' : 'Work Orders'}
        </Text>
        <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
          {wos.length} {es ? 'totales' : 'total'}
          {pendingCount > 0 ? `  ·  ${pendingCount} ${es ? 'firma pendiente' : 'pending signature'}` : ''}
        </Text>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, gap: 8, paddingVertical: 4 }}
        style={{ marginTop: 12, marginBottom: 12 }}
      >
        {FILTERS.map((f) => {
          const count = f.key === 'all' ? wos.length : wos.filter((w) => w.status === f.key).length;
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.8}
              style={{
                alignSelf: 'flex-start',
                paddingHorizontal: 14, paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: active ? C.accent2 : C.surface,
                borderWidth: 1, borderColor: active ? C.accent2 : C.line,
              }}
            >
              <Text style={{
                color: active ? '#FFF' : C.textMuted,
                fontSize: 13,
                fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular',
              }}>
                {es ? f.labelEs : f.labelEn}{count > 0 ? ` (${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={C.accent2} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={es ? 'Sin órdenes de trabajo' : 'No work orders'}
          subtitle={es ? 'Las órdenes aparecerán cuando se acepte una oferta.' : 'Orders will appear when a bid is accepted.'}
          iconName="file-text"
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WOCard wo={item} es={es} onPress={() => setSelectedWO(item)} />
          )}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <WODetailModal wo={selectedWO} es={es} onClose={() => setSelectedWO(null)} />
    </ScreenWrapper>
  );
}
