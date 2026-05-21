import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import EmptyState from '@/components/ui/EmptyState';
import { Feather } from '@expo/vector-icons';
import { C } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type Filter = 'all' | 'pending' | 'approved' | 'rejected';
type ProviderStatus = 'pending' | 'approved' | 'rejected';

interface ProviderRow {
  id: string;
  email: string;
  role: 'company' | 'independent';
  status: ProviderStatus;
  country: string;
  name: string;
  created_at: string;
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'pending',  label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const STATUS_COLORS: Record<ProviderStatus, { bg: string; text: string; label: string }> = {
  pending:  { bg: `${C.warning}20`,  text: C.warning,  label: 'PENDING' },
  approved: { bg: `${C.success}20`,  text: C.success,  label: 'APPROVED' },
  rejected: { bg: `${C.danger}20`,   text: C.danger,   label: 'REJECTED' },
};

function ProviderCard({ provider, onStatusChange }: { provider: ProviderRow; onStatusChange: (id: string, status: ProviderStatus) => void }) {
  const statusMeta = STATUS_COLORS[provider.status];
  const isCompany = provider.role === 'company';

  return (
    <View style={{
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
        <View style={{
          width: 44, height: 44,
          backgroundColor: `${C.accent}20`,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}>
          <Feather name={isCompany ? 'briefcase' : 'user'} size={18} color={C.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_600SemiBold', marginBottom: 2 }}>
            {provider.name}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
            {isCompany ? 'Company' : 'Independent'} · {provider.country === 'colombia' ? '🇨🇴' : '🇺🇸'} {provider.email}
          </Text>
        </View>
        <View style={{ backgroundColor: statusMeta.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={{ color: statusMeta.text, fontSize: 10, fontFamily: 'Inter_600SemiBold' }}>
            {statusMeta.label}
          </Text>
        </View>
      </View>

      {provider.status === 'pending' && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => onStatusChange(provider.id, 'approved')}
            style={{
              flex: 1,
              height: 38,
              backgroundColor: `${C.success}15`,
              borderWidth: 1,
              borderColor: `${C.success}40`,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
            }}
            activeOpacity={0.85}
          >
            <Feather name="check" size={14} color={C.success} style={{ marginRight: 6 }} />
            <Text style={{ color: C.success, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onStatusChange(provider.id, 'rejected')}
            style={{
              flex: 1,
              height: 38,
              backgroundColor: `${C.danger}15`,
              borderWidth: 1,
              borderColor: `${C.danger}40`,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
            }}
            activeOpacity={0.85}
          >
            <Feather name="x" size={14} color={C.danger} style={{ marginRight: 6 }} />
            <Text style={{ color: C.danger, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function AdminProviders() {
  const [filter, setFilter] = useState<Filter>('all');
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('users')
        .select('id, email, role, status, country, created_at, companies(company_name), independents(full_name)')
        .in('role', ['company', 'independent'])
        .order('created_at', { ascending: false });

      if (data) {
        setProviders(data.map((u: any) => ({
          id: u.id,
          email: u.email,
          role: u.role,
          status: u.status,
          country: u.country,
          created_at: u.created_at,
          name: u.role === 'company'
            ? (u.companies?.[0]?.company_name ?? u.email.split('@')[0])
            : (u.independents?.[0]?.full_name ?? u.email.split('@')[0]),
        })));
      }
    } catch {
      // keep empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProviders(); }, [loadProviders]);

  const handleStatusChange = async (id: string, newStatus: ProviderStatus) => {
    const action = newStatus === 'approved' ? 'approve' : 'reject';
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Provider`,
      `Are you sure you want to ${action} this provider?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          style: newStatus === 'rejected' ? 'destructive' : 'default',
          onPress: async () => {
            const { error } = await supabase.from('users').update({ status: newStatus }).eq('id', id);
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              setProviders((prev) => prev.map((p) => p.id === id ? { ...p, status: newStatus } : p));
            }
          },
        },
      ],
    );
  };

  const filtered = filter === 'all' ? providers : providers.filter((p) => p.status === filter);

  return (
    <ScreenWrapper>
      <View style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 8 }}>
        <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>Providers</Text>
        <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
          {providers.length} total · {providers.filter((p) => p.status === 'pending').length} pending
        </Text>
      </View>

      {/* Filter chips */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 24, marginTop: 16, marginBottom: 16 }}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count = f.key === 'all' ? providers.length : providers.filter((p) => p.status === f.key).length;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 9999,
                backgroundColor: active ? C.accent : C.surface,
                borderWidth: 1,
                borderColor: active ? C.accent : C.line,
              }}
              activeOpacity={0.85}
            >
              <Text style={{ color: active ? '#000' : C.textMuted, fontSize: 13, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }}>
                {f.label}{count > 0 ? ` (${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={C.accent} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={filter === 'all' ? 'No providers yet' : `No ${filter} providers`}
          subtitle="Provider applications will appear here once they register."
          iconName="users"
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ProviderCard provider={item} onStatusChange={handleStatusChange} />}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenWrapper>
  );
}
