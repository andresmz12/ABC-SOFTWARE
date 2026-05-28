import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/context/LanguageContext';
import { C } from '@/constants/theme';

type WOFilter = 'all' | 'pending_signatures' | 'signed';

interface WORow {
  id: string;
  wo_number: string;
  status: string;
  client_signature: string | null;
  provider_signature: string | null;
  client_signed_at: string | null;
  provider_signed_at: string | null;
  created_at: string;
  job_request_id: string;
  client_name: string;
  provider_name: string;
  service_type: string;
  city: string;
  scheduled_date: string;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${m}/${d}/${y}`;
}

function WOStatusBadge({ status, es }: { status: string; es: boolean }) {
  const isPending = status === 'pending_signatures';
  const color = isPending ? '#D97706' : C.success;
  const bg = isPending ? '#FEF3C7' : `${C.success}15`;
  const label = isPending
    ? (es ? 'Pendiente' : 'Pending')
    : (es ? 'Firmada' : 'Signed');

  return (
    <View style={{ backgroundColor: bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color, fontSize: 10, fontFamily: 'Inter_700Bold' }}>{label.toUpperCase()}</Text>
    </View>
  );
}

function SignatureDots({ clientSigned, providerSigned, es }: { clientSigned: boolean; providerSigned: boolean; es: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: clientSigned ? C.success : C.textMuted }} />
        <Text style={{ color: C.textMuted, fontSize: 10, fontFamily: 'Inter_400Regular' }}>
          {es ? 'Cliente' : 'Client'}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: providerSigned ? C.success : C.textMuted }} />
        <Text style={{ color: C.textMuted, fontSize: 10, fontFamily: 'Inter_400Regular' }}>
          {es ? 'Proveedor' : 'Provider'}
        </Text>
      </View>
    </View>
  );
}

function WOCard({ wo, es, onPress }: { wo: WORow; es: boolean; onPress: () => void }) {
  const isCommercial = wo.service_type === 'commercial';
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        backgroundColor: C.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.line,
        borderLeftWidth: 3,
        borderLeftColor: wo.status === 'pending_signatures' ? '#D97706' : C.success,
        padding: 14,
        marginHorizontal: 20,
        marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_700Bold', marginBottom: 1 }}>
            {wo.wo_number}
          </Text>
          <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
            {isCommercial ? (es ? 'Comercial' : 'Commercial') : (es ? 'Residencial' : 'Residential')}
            {wo.city ? `  ·  ${wo.city}` : ''}
          </Text>
        </View>
        <WOStatusBadge status={wo.status} es={es} />
      </View>

      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 6 }}>
        <View>
          <Text style={{ color: C.textMuted, fontSize: 10, fontFamily: 'Inter_400Regular' }}>
            {es ? 'Cliente' : 'Client'}
          </Text>
          <Text style={{ color: C.textPrimary, fontSize: 12, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>
            {wo.client_name || '—'}
          </Text>
        </View>
        <View>
          <Text style={{ color: C.textMuted, fontSize: 10, fontFamily: 'Inter_400Regular' }}>
            {es ? 'Proveedor' : 'Provider'}
          </Text>
          <Text style={{ color: C.textPrimary, fontSize: 12, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>
            {wo.provider_name || '—'}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <SignatureDots
          clientSigned={!!wo.client_signature}
          providerSigned={!!wo.provider_signature}
          es={es}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Feather name="calendar" size={10} color={C.textMuted} />
          <Text style={{ color: C.textMuted, fontSize: 10, fontFamily: 'Inter_400Regular' }}>
            {formatDate(wo.created_at)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function WorkOrdersAdminScreen() {
  const { lang } = useLang();
  const es = lang === 'es';
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [wos, setWos] = useState<WORow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<WOFilter>('all');

  const loadWOs = useCallback(async () => {
    setLoading(true);
    try {
      const { data: woRows, error } = await supabase
        .from('work_orders')
        .select('id, wo_number, status, client_id, provider_id, client_signature, provider_signature, client_signed_at, provider_signed_at, created_at, job_request_id')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;

      if (!woRows?.length) { setWos([]); return; }

      // Fetch job details
      const jobIds = [...new Set(woRows.map((w: any) => w.job_request_id))];
      const clientIds = [...new Set(woRows.map((w: any) => w.client_id))];
      const providerIds = [...new Set(woRows.map((w: any) => w.provider_id))];

      const [jobsRes, clientsRes, companiesRes, independentsRes] = await Promise.all([
        supabase.from('job_requests').select('id, service_type, city, scheduled_date').in('id', jobIds),
        supabase.from('clients').select('user_id, full_name').in('user_id', clientIds),
        supabase.from('companies').select('user_id, company_name').in('user_id', providerIds),
        supabase.from('independents').select('user_id, full_name').in('user_id', providerIds),
      ]);

      const jobMap: Record<string, any> = {};
      for (const j of (jobsRes.data ?? [])) jobMap[j.id] = j;

      const clientNameMap: Record<string, string> = {};
      for (const c of (clientsRes.data ?? [])) clientNameMap[c.user_id] = c.full_name ?? '';

      const provNameMap: Record<string, string> = {};
      for (const c of (companiesRes.data ?? [])) provNameMap[c.user_id] = c.company_name ?? '';
      for (const i of (independentsRes.data ?? [])) {
        if (!provNameMap[i.user_id]) provNameMap[i.user_id] = i.full_name ?? '';
      }

      const enriched: WORow[] = woRows.map((w: any) => {
        const j = jobMap[w.job_request_id] ?? {};
        return {
          ...w,
          client_name: clientNameMap[w.client_id] ?? '',
          provider_name: provNameMap[w.provider_id] ?? '',
          service_type: j.service_type ?? '',
          city: j.city ?? '',
          scheduled_date: j.scheduled_date ?? '',
        };
      });

      setWos(enriched);
    } catch (e: any) {
      console.warn('[WorkOrders] load error:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadWOs(); }, [loadWOs]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWOs();
    setRefreshing(false);
  };

  const filtered = filter === 'all' ? wos : wos.filter((w) => w.status === filter);

  const FILTERS: { key: WOFilter; label: string }[] = [
    { key: 'all', label: es ? 'Todas' : 'All' },
    { key: 'pending_signatures', label: es ? 'Pendientes' : 'Pending' },
    { key: 'signed', label: es ? 'Firmadas' : 'Signed' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 18, paddingBottom: 16 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <Feather name="arrow-left" size={18} color={C.textSecondary} />
          <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
            {es ? 'Panel' : 'Dashboard'}
          </Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: C.textPrimary, fontSize: 24, fontFamily: 'Inter_700Bold' }}>
              {es ? 'Órdenes de Trabajo' : 'Work Orders'}
            </Text>
            <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
              {wos.length} {es ? 'órdenes en total' : 'orders total'}
            </Text>
          </View>
          <View style={{ backgroundColor: '#FEF3C7', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Text style={{ color: '#D97706', fontSize: 13, fontFamily: 'Inter_700Bold' }}>
              {wos.filter((w) => w.status === 'pending_signatures').length}
            </Text>
            <Text style={{ color: '#92400E', fontSize: 9, fontFamily: 'Inter_400Regular' }}>
              {es ? 'pendientes' : 'pending'}
            </Text>
          </View>
        </View>
      </View>

      {/* Filter chips */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 12 }}>
        {FILTERS.map((f) => {
          const isActive = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={{
                paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
                backgroundColor: isActive ? C.accent : C.surface,
                borderWidth: 1, borderColor: isActive ? C.accent : C.line,
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: isActive ? '#000' : C.textMuted, fontSize: 12, fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_400Regular' }}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && !refreshing ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent} size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: `${C.accent}12`, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Feather name="file-text" size={28} color={C.accent} />
          </View>
          <Text style={{ color: C.textSecondary, fontSize: 15, fontFamily: 'Inter_600SemiBold', textAlign: 'center' }}>
            {es ? 'Sin órdenes de trabajo' : 'No work orders'}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 6 }}>
            {es ? 'Las órdenes se crean automáticamente al aceptar una oferta.' : 'Orders are created automatically when a bid is accepted.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WOCard
              wo={item}
              es={es}
              onPress={() => router.push({ pathname: '/(shared)/work-order', params: { workOrderId: item.id } } as any)}
            />
          )}
          contentContainerStyle={{ paddingBottom: 32, paddingTop: 4 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        />
      )}
    </View>
  );
}
