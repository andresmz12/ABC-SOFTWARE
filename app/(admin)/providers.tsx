import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import EmptyState from '@/components/ui/EmptyState';
import { Feather } from '@expo/vector-icons';
import { useLang } from '@/context/LanguageContext';
import { C } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { updateProviderStatus } from '@/lib/userUtils';

type Filter = 'all' | 'pending' | 'approved' | 'rejected';
type ProviderStatus = 'pending' | 'approved' | 'rejected';

interface ProviderRow {
  id: string;
  email: string;
  role: 'company' | 'independent';
  status: ProviderStatus;
  country: string;
  state: string;
  name: string;
  created_at: string;
}

const FILTERS: { key: Filter; labelEn: string; labelEs: string }[] = [
  { key: 'all',      labelEn: 'All',      labelEs: 'Todos' },
  { key: 'pending',  labelEn: 'Pending',  labelEs: 'Pendientes' },
  { key: 'approved', labelEn: 'Approved', labelEs: 'Aprobados' },
  { key: 'rejected', labelEn: 'Rejected', labelEs: 'Rechazados' },
];

function buildStatusColors(es: boolean): Record<ProviderStatus, { bg: string; text: string; label: string }> {
  return {
    pending:  { bg: `${C.warning}20`,  text: C.warning,  label: es ? 'PENDIENTE' : 'PENDING' },
    approved: { bg: `${C.success}20`,  text: C.success,  label: es ? 'APROBADO'  : 'APPROVED' },
    rejected: { bg: `${C.danger}20`,   text: C.danger,   label: es ? 'RECHAZADO' : 'REJECTED' },
  };
}

function ProviderCard({ provider, es, onStatusChange, onPress }: { provider: ProviderRow; es: boolean; onStatusChange: (id: string, status: ProviderStatus) => void; onPress: () => void }) {
  const STATUS_COLORS = buildStatusColors(es);
  const statusMeta = STATUS_COLORS[provider.status];
  const isCompany = provider.role === 'company';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
      }}
    >
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
            {isCompany ? (es ? 'Empresa' : 'Company') : (es ? 'Independiente' : 'Independent')}
            {' · '}{provider.country === 'colombia' ? '🇨🇴' : '🇺🇸'}
            {provider.state ? ` ${provider.state}` : ''}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ backgroundColor: statusMeta.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: statusMeta.text, fontSize: 10, fontFamily: 'Inter_600SemiBold' }}>
              {statusMeta.label}
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={C.textMuted} />
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
            <Text style={{ color: C.success, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>{es ? 'Aprobar' : 'Approve'}</Text>
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
            <Text style={{ color: C.danger, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>{es ? 'Rechazar' : 'Reject'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function AdminProviders() {
  const { lang } = useLang();
  const es = lang === 'es';
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const [companiesRes, independentsRes] = await Promise.all([
        supabase.from('companies').select('user_id, company_name, country, state, status, created_at').order('created_at', { ascending: false }),
        supabase.from('independents').select('user_id, full_name, country, state, status, created_at').order('created_at', { ascending: false }),
      ]);

      if (companiesRes.error) console.warn('[Providers] companies error:', companiesRes.error.message);
      if (independentsRes.error) console.warn('[Providers] independents error:', independentsRes.error.message);

      const rows = [
        ...(companiesRes.data ?? []).map((c: any) => ({
          id: c.user_id,
          email: '',
          role: 'company' as const,
          status: (c.status ?? 'pending') as ProviderStatus,
          country: c.country ?? 'usa',
          state: c.state ?? '',
          created_at: c.created_at,
          name: c.company_name ?? '',
        })),
        ...(independentsRes.data ?? []).map((i: any) => ({
          id: i.user_id,
          email: '',
          role: 'independent' as const,
          status: (i.status ?? 'pending') as ProviderStatus,
          country: i.country ?? 'usa',
          state: i.state ?? '',
          created_at: i.created_at,
          name: i.full_name ?? '',
        })),
      ];
      rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      // Always update state (even when empty, to clear stale data)
      setProviders(rows);
    } catch (e: any) {
      console.warn('[Providers] load error:', e?.message ?? e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProviders(); }, [loadProviders]);

  const handleStatusChange = async (id: string, newStatus: ProviderStatus) => {
    const isApprove = newStatus === 'approved';
    Alert.alert(
      es
        ? `${isApprove ? 'Aprobar' : 'Rechazar'} Proveedor`
        : `${isApprove ? 'Approve' : 'Reject'} Provider`,
      es
        ? `¿Confirmas ${isApprove ? 'aprobar' : 'rechazar'} a este proveedor?`
        : `Are you sure you want to ${isApprove ? 'approve' : 'reject'} this provider?`,
      [
        { text: es ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: es ? (isApprove ? 'Aprobar' : 'Rechazar') : (isApprove ? 'Approve' : 'Reject'),
          style: newStatus === 'rejected' ? 'destructive' : 'default',
          onPress: async () => {
            const { error: statusError } = await updateProviderStatus(id, newStatus);
            const error = statusError ? { message: statusError } : null;
            if (error) {
              Alert.alert('Error', error.message);
              return;
            }
            setProviders((prev) => prev.map((p) => p.id === id ? { ...p, status: newStatus } : p));
            // Notify the provider
            await supabase.from('notifications').insert({
              user_id: id,
              title_en: isApprove ? 'Account Approved' : 'Application Not Approved',
              title_es: isApprove ? 'Cuenta Aprobada' : 'Solicitud No Aprobada',
              body_en: isApprove
                ? 'Your account has been approved. You can now browse and apply to jobs.'
                : 'Your application was not approved. Please review your documents and resubmit.',
              body_es: isApprove
                ? 'Tu cuenta ha sido aprobada. Ya puedes explorar y aplicar a trabajos.'
                : 'Tu solicitud no fue aprobada. Por favor revisa tus documentos y vuelve a enviar.',
              type: 'account_update',
              read: false,
            });
          },
        },
      ],
    );
  };

  const filtered = filter === 'all' ? providers : providers.filter((p) => p.status === filter);

  return (
    <ScreenWrapper>
      <View style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 8 }}>
        <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>
          {es ? 'Proveedores' : 'Providers'}
        </Text>
        <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
          {providers.length} {es ? 'totales' : 'total'} · {providers.filter((p) => p.status === 'pending').length} {es ? 'pendientes' : 'pending'}
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
                {es ? f.labelEs : f.labelEn}{count > 0 ? ` (${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={C.accent} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={es
            ? filter === 'all' ? 'Aún no hay proveedores' : `Sin proveedores ${filter === 'pending' ? 'pendientes' : filter === 'approved' ? 'aprobados' : 'rechazados'}`
            : filter === 'all' ? 'No providers yet' : `No ${filter} providers`}
          subtitle={es ? 'Las solicitudes aparecerán aquí cuando se registren.' : 'Provider applications will appear here once they register.'}
          iconName="users"
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProviderCard
              provider={item}
              es={es}
              onStatusChange={handleStatusChange}
              onPress={() => router.push({ pathname: '/(admin)/provider-detail', params: { id: item.id } } as any)}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenWrapper>
  );
}
