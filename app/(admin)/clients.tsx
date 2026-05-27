import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  ActivityIndicator, TextInput, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useLang } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { C } from '@/constants/theme';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'suspended';

interface ClientRow {
  id: string;
  name: string;
  country: string;
  status: string;
  created_at: string;
}

const STATUS_FILTERS: { key: StatusFilter; labelEn: string; labelEs: string }[] = [
  { key: 'all',       labelEn: 'All',       labelEs: 'Todos' },
  { key: 'pending',   labelEn: 'Pending',   labelEs: 'Pendientes' },
  { key: 'approved',  labelEn: 'Approved',  labelEs: 'Aprobados' },
  { key: 'rejected',  labelEn: 'Rejected',  labelEs: 'Rechazados' },
  { key: 'suspended', labelEn: 'Suspended', labelEs: 'Suspendidos' },
];

const STATUS_META: Record<string, { bg: string; color: string; labelEn: string; labelEs: string }> = {
  pending:   { bg: `${C.warning}20`, color: C.warning,       labelEn: 'PENDING',   labelEs: 'PENDIENTE' },
  approved:  { bg: `${C.success}20`, color: C.success,       labelEn: 'APPROVED',  labelEs: 'APROBADO' },
  rejected:  { bg: `${C.danger}20`,  color: C.danger,        labelEn: 'REJECTED',  labelEs: 'RECHAZADO' },
  suspended: { bg: `${C.line}`,      color: C.textSecondary, labelEn: 'SUSPENDED', labelEs: 'SUSPENDIDO' },
};

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminClients() {
  const router = useRouter();
  const { lang } = useLang();
  const es = lang === 'es';

  const [clients, setClients]     = useState<ClientRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]       = useState<StatusFilter>('all');
  const [search, setSearch]       = useState('');

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('user_id, full_name, country, status, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setClients((data ?? []).map((r: any) => ({
        id: r.user_id,
        name: r.full_name ?? '',
        country: r.country ?? 'usa',
        status: r.status ?? 'approved',
        created_at: r.created_at ?? '',
      })));
    } catch (e: any) {
      console.warn('[AdminClients] load error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const filtered = clients.filter((c) => {
    const matchesFilter = filter === 'all' || c.status === filter;
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || c.name.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const pendingCount = clients.filter((c) => c.status === 'pending').length;

  const renderItem = ({ item }: { item: ClientRow }) => {
    const isColombia = item.country === 'colombia';
    const meta = STATUS_META[item.status] ?? STATUS_META.approved;
    return (
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/(admin)/client-detail', params: { id: item.id } } as any)}
        activeOpacity={0.85}
        style={{
          backgroundColor: C.surface,
          borderRadius: 14, borderWidth: 1, borderColor: C.line,
          padding: 14, marginBottom: 10,
          flexDirection: 'row', alignItems: 'center',
        }}
      >
        <View style={{
          width: 42, height: 42, borderRadius: 12,
          backgroundColor: `${C.accent}18`, alignItems: 'center',
          justifyContent: 'center', marginRight: 12,
        }}>
          <Feather name="user" size={18} color={C.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>
            {item.name || (es ? 'Sin nombre' : 'No name')}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
            {isColombia ? '🇨🇴 Colombia' : '🇺🇸 USA'} · {formatDate(item.created_at)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <View style={{ backgroundColor: meta.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color: meta.color, fontSize: 10, fontFamily: 'Inter_600SemiBold' }}>
              {es ? meta.labelEs : meta.labelEn}
            </Text>
          </View>
          <Feather name="chevron-right" size={14} color={C.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: C.line,
        backgroundColor: C.surface,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Text style={{ flex: 1, color: C.textPrimary, fontSize: 26, fontFamily: 'Inter_700Bold' }}>
            {es ? 'Clientes' : 'Clients'}
          </Text>
          {pendingCount > 0 && (
            <View style={{ backgroundColor: `${C.warning}20`, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: C.warning, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>
                {pendingCount} {es ? 'pendiente(s)' : 'pending'}
              </Text>
            </View>
          )}
        </View>
        <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
          {clients.length} {es ? 'clientes registrados' : 'registered clients'}
        </Text>
      </View>

      {/* Search */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.line,
        paddingHorizontal: 16, paddingVertical: 10, gap: 10,
      }}>
        <Feather name="search" size={16} color={C.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={es ? 'Buscar cliente...' : 'Search client...'}
          placeholderTextColor={C.textMuted}
          style={{ flex: 1, color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_400Regular', paddingVertical: 0 }}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Status filter chips */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map((f) => {
          const isActive = filter === f.key;
          const count = f.key === 'all' ? clients.length : clients.filter((c) => c.status === f.key).length;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={{
                borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
                backgroundColor: isActive ? C.accent2 : C.surface,
                borderWidth: 1, borderColor: isActive ? C.accent2 : C.line,
                flexDirection: 'row', alignItems: 'center', gap: 5,
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: isActive ? '#FFF' : C.textSecondary, fontSize: 12, fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_400Regular' }}>
                {es ? f.labelEs : f.labelEn}
              </Text>
              {count > 0 && (
                <View style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : C.surface2, borderRadius: 8, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                  <Text style={{ color: isActive ? '#FFF' : C.textMuted, fontSize: 10, fontFamily: 'Inter_600SemiBold' }}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent2} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent2} />}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
              <Feather name="users" size={36} color={C.textMuted} />
              <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 16, textAlign: 'center' }}>
                {search ? (es ? 'Sin resultados' : 'No results') : (es ? 'Sin clientes aún' : 'No clients yet')}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
