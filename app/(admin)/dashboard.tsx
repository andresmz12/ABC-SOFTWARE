/**
 * Admin Dashboard — Country-tabbed overview
 * Tabs: Global · USA 🇺🇸 · Colombia 🇨🇴
 * Sections: Stats · Jobs · Providers · Clients
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useLang } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { updateProviderStatus } from '@/lib/userUtils';
import { formatUSD, formatCOP } from '@/lib/countryData';
import { C } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type CountryTab   = 'global' | 'usa' | 'colombia';
type JobFilter    = 'all' | 'open' | 'in_progress' | 'completed' | 'cancelled';
type ProvFilter   = 'all' | 'pending' | 'approved' | 'rejected';
type ProvStatus   = 'pending' | 'approved' | 'rejected';

interface DashStats {
  activeJobs: number;
  pendingProviders: number;
  clients: number;
  revenue: number;
}

interface DashJob {
  id: string;
  service_type: string;
  city: string;
  country: string;
  status: string;
  scheduled_date: string;
  budget_usd?: number | null;
  budget_cop?: number | null;
  created_at: string;
}

interface DashProvider {
  id: string;
  name: string;
  role: 'company' | 'independent';
  status: ProvStatus;
  country: string;
  state: string;
}

interface DashClient {
  id: string;
  name: string;
  country: string;
  created_at: string;
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function greet(es: boolean): string {
  const h = new Date().getHours();
  if (es) return h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches';
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

const STATUS_COLOR: Record<string, string> = {
  open: C.accent, in_progress: '#3B82F6', completed: C.success,
  cancelled: C.danger, expired: C.textMuted, accepted: '#8B5CF6',
  pending: C.warning, approved: C.success, rejected: C.danger,
};

function statusLabel(s: string, es: boolean): string {
  const m: Record<string, [string, string]> = {
    open:        ['Open',        'Abierto'],
    in_progress: ['In Progress', 'En Progreso'],
    completed:   ['Completed',   'Completado'],
    cancelled:   ['Cancelled',   'Cancelado'],
    expired:     ['Expired',     'Expirado'],
    accepted:    ['Accepted',    'Asignado'],
    pending:     ['Pending',     'Pendiente'],
    approved:    ['Approved',    'Aprobado'],
    rejected:    ['Rejected',    'Rechazado'],
  };
  return m[s]?.[es ? 1 : 0] ?? s;
}

function StatusBadge({ status, es }: { status: string; es: boolean }) {
  const color = STATUS_COLOR[status] ?? C.textMuted;
  return (
    <View style={{ backgroundColor: `${color}20`, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
      <Text style={{ color, fontSize: 10, fontFamily: 'Inter_700Bold' }}>
        {statusLabel(status, es).toUpperCase()}
      </Text>
    </View>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, color, loading,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string | number;
  color: string;
  loading?: boolean;
}) {
  return (
    <View style={{
      flex: 1, minWidth: '45%',
      backgroundColor: C.surface,
      borderWidth: 1, borderColor: C.line,
      borderLeftWidth: 3, borderLeftColor: color,
      borderRadius: 16, padding: 16,
    }}>
      <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: `${color}18`, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <Feather name={icon} size={15} color={color} />
      </View>
      {loading ? (
        <ActivityIndicator color={color} style={{ alignSelf: 'flex-start', marginBottom: 4 }} />
      ) : (
        <Text style={{ color: C.textPrimary, fontSize: 26, fontFamily: 'Inter_700Bold', letterSpacing: -0.5, marginBottom: 2 }}>
          {value}
        </Text>
      )}
      <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 15 }}>{label}</Text>
    </View>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  title, icon, badge, onSeeAll, es,
}: {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  badge?: number;
  onSeeAll?: () => void;
  es: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 28, marginBottom: 12 }}>
      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: `${C.accent}15`, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
        <Feather name={icon} size={13} color={C.accent} />
      </View>
      <Text style={{ flex: 1, color: C.textPrimary, fontSize: 16, fontFamily: 'Inter_700Bold' }}>{title}</Text>
      {badge != null && badge > 0 && (
        <View style={{ backgroundColor: C.danger, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, marginRight: 10 }}>
          <Text style={{ color: '#FFF', fontSize: 11, fontFamily: 'Inter_700Bold' }}>{badge}</Text>
        </View>
      )}
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }} activeOpacity={0.75}>
          <Text style={{ color: C.accent, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>{es ? 'Ver todos' : 'See all'}</Text>
          <Feather name="chevron-right" size={13} color={C.accent} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Filter chips ─────────────────────────────────────────────────────────────

function FilterChips<T extends string>({
  options, active, onSelect,
}: {
  options: { key: T; label: string }[];
  active: T;
  onSelect: (v: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 2 }}
      style={{ marginBottom: 10 }}
    >
      {options.map((o) => {
        const isActive = active === o.key;
        return (
          <TouchableOpacity
            key={o.key}
            onPress={() => onSelect(o.key)}
            style={{
              paddingHorizontal: 13, paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: isActive ? C.accent : C.surface,
              borderWidth: 1, borderColor: isActive ? C.accent : C.line,
            }}
            activeOpacity={0.8}
          >
            <Text style={{ color: isActive ? '#000' : C.textMuted, fontSize: 12, fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_400Regular' }}>
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── Job row ──────────────────────────────────────────────────────────────────

function JobRow({ job, es, onPress }: { job: DashJob; es: boolean; onPress: () => void }) {
  const isCommercial = job.service_type === 'commercial';
  const budget = job.budget_usd
    ? formatUSD(job.budget_usd)
    : job.budget_cop
    ? formatCOP(job.budget_cop)
    : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        backgroundColor: C.surface,
        borderRadius: 14, borderWidth: 1, borderColor: C.line,
        padding: 14, marginHorizontal: 20, marginBottom: 8,
        flexDirection: 'row', alignItems: 'center',
      }}
    >
      <View style={{
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: isCommercial ? `${C.accent2}18` : `${C.accent}18`,
        alignItems: 'center', justifyContent: 'center', marginRight: 12,
      }}>
        <Feather name={isCommercial ? 'briefcase' : 'home'} size={15} color={isCommercial ? C.accent2 : C.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 2 }} numberOfLines={1}>
          {isCommercial ? (es ? 'Comercial' : 'Commercial') : (es ? 'Residencial' : 'Residential')}
          {budget ? `  ·  ${budget}` : ''}
        </Text>
        <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular' }}>
          {job.city}  ·  {job.scheduled_date}  ·  {job.country === 'colombia' ? '🇨🇴' : '🇺🇸'}
        </Text>
      </View>
      <StatusBadge status={job.status} es={es} />
    </TouchableOpacity>
  );
}

// ─── Provider row ─────────────────────────────────────────────────────────────

function ProviderRow({
  provider, es, onApprove, onReject, onPress,
}: {
  provider: DashProvider;
  es: boolean;
  onApprove: () => void;
  onReject: () => void;
  onPress: () => void;
}) {
  const isCompany = provider.role === 'company';
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        backgroundColor: C.surface,
        borderRadius: 14, borderWidth: 1,
        borderColor: provider.status === 'pending' ? `${C.warning}50` : C.line,
        padding: 14, marginHorizontal: 20, marginBottom: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: provider.status === 'pending' ? 10 : 0 }}>
        <View style={{
          width: 36, height: 36, borderRadius: 10,
          backgroundColor: `${C.accent}18`,
          alignItems: 'center', justifyContent: 'center', marginRight: 12,
        }}>
          <Feather name={isCompany ? 'briefcase' : 'user'} size={15} color={C.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 2 }} numberOfLines={1}>
            {provider.name || (es ? 'Sin nombre' : 'No name')}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular' }}>
            {isCompany ? (es ? 'Empresa' : 'Company') : (es ? 'Independiente' : 'Independent')}
            {' · '}{provider.country === 'colombia' ? '🇨🇴' : '🇺🇸'}
            {provider.state ? ` ${provider.state}` : ''}
          </Text>
        </View>
        <StatusBadge status={provider.status} es={es} />
      </View>

      {provider.status === 'pending' && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={onApprove}
            style={{ flex: 1, height: 34, backgroundColor: `${C.success}15`, borderWidth: 1, borderColor: `${C.success}40`, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
            activeOpacity={0.8}
          >
            <Feather name="check" size={13} color={C.success} style={{ marginRight: 5 }} />
            <Text style={{ color: C.success, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>{es ? 'Aprobar' : 'Approve'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onReject}
            style={{ flex: 1, height: 34, backgroundColor: `${C.danger}15`, borderWidth: 1, borderColor: `${C.danger}40`, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
            activeOpacity={0.8}
          >
            <Feather name="x" size={13} color={C.danger} style={{ marginRight: 5 }} />
            <Text style={{ color: C.danger, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>{es ? 'Rechazar' : 'Reject'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Client row ───────────────────────────────────────────────────────────────

function ClientRow({ client, es }: { client: DashClient; es: boolean }) {
  return (
    <View style={{
      backgroundColor: C.surface,
      borderRadius: 14, borderWidth: 1, borderColor: C.line,
      padding: 14, marginHorizontal: 20, marginBottom: 8,
      flexDirection: 'row', alignItems: 'center',
    }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${C.accent}18`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
        <Feather name="user" size={15} color={C.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>
          {client.name || (es ? 'Sin nombre' : 'No name')}
        </Text>
        <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 }}>
          {client.country === 'colombia' ? '🇨🇴 Colombia' : '🇺🇸 USA'}
        </Text>
      </View>
    </View>
  );
}

// ─── Empty section ────────────────────────────────────────────────────────────

function EmptySection({ text }: { text: string }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingVertical: 16, alignItems: 'center' }}>
      <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular' }}>{text}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const { lang } = useLang();
  const es = lang === 'es';
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab]     = useState<CountryTab>('global');
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [stats, setStats]             = useState<DashStats>({ activeJobs: 0, pendingProviders: 0, clients: 0, revenue: 0 });
  const [jobs, setJobs]               = useState<DashJob[]>([]);
  const [providers, setProviders]     = useState<DashProvider[]>([]);
  const [clients, setClients]         = useState<DashClient[]>([]);
  const [jobFilter, setJobFilter]     = useState<JobFilter>('all');
  const [provFilter, setProvFilter]   = useState<ProvFilter>('all');

  // ── Load all data ─────────────────────────────────────────────────────────

  const loadAll = useCallback(async (tab: CountryTab) => {
    setLoading(true);
    try {
      const countryEq = tab !== 'global' ? tab : null;

      // ── Stats counts ──────────────────────────────────────────────────────
      // companies/independents have NO status column — pending count comes from documents
      let pendingDocsQ = supabase.from('documents').select('user_id', { count: 'exact', head: true }).eq('status', 'pending');
      let clientsQ     = supabase.from('clients').select('user_id',   { count: 'exact', head: true });
      let activeJQ     = supabase.from('job_requests').select('id',   { count: 'exact', head: true }).in('status', ['open', 'in_progress', 'accepted']);

      if (countryEq) {
        clientsQ = (clientsQ as any).eq('country', countryEq);
        activeJQ = (activeJQ as any).eq('country', countryEq);
        // documents table doesn't have country — filter pending by joining via user existence in country
        // For simplicity, pending count is global (not filtered by country)
      }

      // Revenue: sum bid_amounts of accepted applications
      const revenueQ = supabase
        .from('job_applications')
        .select('bid_amount')
        .eq('status', 'accepted');

      const [pendingDocsRes, clientsCountRes, activeJobsRes, revenueRes] = await Promise.all([
        pendingDocsQ, clientsQ, activeJQ, revenueQ,
      ]);

      const revenue = (revenueRes.data ?? []).reduce((s: number, r: any) => s + (r.bid_amount ?? 0), 0);

      setStats({
        activeJobs:       activeJobsRes.count ?? 0,
        pendingProviders: pendingDocsRes.count ?? 0,
        clients:          clientsCountRes.count ?? 0,
        revenue,
      });

      // ── Jobs ──────────────────────────────────────────────────────────────
      let jobsQ: any = supabase
        .from('job_requests')
        .select('id, service_type, city, country, status, scheduled_date, budget_usd, budget_cop, created_at')
        .order('created_at', { ascending: false })
        .limit(40);
      if (countryEq) jobsQ = jobsQ.eq('country', countryEq);
      const { data: jobsData, error: jobsErr } = await jobsQ;
      if (jobsErr) console.warn('[Dashboard] jobs error:', jobsErr.message);
      setJobs((jobsData ?? []) as DashJob[]);

      // ── Providers ───────────────────────────────────────────────────────────────────────────
      // companies/independents have NO status column — approval lives in documents
      let compQ: any  = supabase.from('companies').select('user_id, company_name, country, state').order('created_at', { ascending: false }).limit(60);
      let indepQ: any = supabase.from('independents').select('user_id, full_name, country, state').order('created_at', { ascending: false }).limit(60);
      if (countryEq) {
        compQ  = compQ.eq('country', countryEq);
        indepQ = indepQ.eq('country', countryEq);
      }
      const [compRes, indepRes, docsRes] = await Promise.all([
        compQ, indepQ,
        supabase.from('documents').select('user_id, status'),
      ]);
      if (compRes.error)  console.warn('[Dashboard] companies error:', compRes.error.message);
      if (indepRes.error) console.warn('[Dashboard] independents error:', indepRes.error.message);

      // Build status map from documents table (source of truth for provider approval)
      const docStatusMap: Record<string, string> = {};
      for (const doc of (docsRes.data ?? [])) {
        if (!docStatusMap[doc.user_id]) docStatusMap[doc.user_id] = doc.status;
      }

      const provRows: DashProvider[] = [
        ...(compRes.data  ?? []).map((r: any) => ({ id: r.user_id, name: r.company_name ?? '', role: 'company'     as const, status: (docStatusMap[r.user_id] ?? 'pending') as ProvStatus, country: r.country ?? 'usa', state: r.state ?? '' })),
        ...(indepRes.data ?? []).map((r: any) => ({ id: r.user_id, name: r.full_name    ?? '', role: 'independent' as const, status: (docStatusMap[r.user_id] ?? 'pending') as ProvStatus, country: r.country ?? 'usa', state: r.state ?? '' })),
      ];
      // Pending first, then alphabetical
      provRows.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return a.name.localeCompare(b.name);
      });
      setProviders(provRows);

      // ── Clients ───────────────────────────────────────────────────────────
      let clientsListQ: any = supabase
        .from('clients')
        .select('user_id, full_name, country, created_at')
        .order('created_at', { ascending: false })
        .limit(30);
      if (countryEq) clientsListQ = clientsListQ.eq('country', countryEq);
      const { data: clientsData, error: clientsErr } = await clientsListQ;
      if (clientsErr) console.warn('[Dashboard] clients error:', clientsErr.message);
      setClients((clientsData ?? []).map((r: any) => ({
        id: r.user_id, name: r.full_name ?? '', country: r.country ?? 'usa', created_at: r.created_at,
      })));

    } catch (e: any) {
      console.warn('[Dashboard] loadAll error:', e?.message ?? e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload when tab changes
  useEffect(() => {
    setJobFilter('all');
    setProvFilter('all');
    loadAll(activeTab);
  }, [activeTab, loadAll]);

  // Reload on focus
  useFocusEffect(useCallback(() => { loadAll(activeTab); }, [activeTab, loadAll]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll(activeTab);
    setRefreshing(false);
  };

  // ── Provider status change ────────────────────────────────────────────────

  const handleProvStatus = (id: string, newStatus: ProvStatus) => {
    const isApprove = newStatus === 'approved';
    Alert.alert(
      es ? `${isApprove ? 'Aprobar' : 'Rechazar'} Proveedor` : `${isApprove ? 'Approve' : 'Reject'} Provider`,
      es
        ? `¿Confirmas ${isApprove ? 'aprobar' : 'rechazar'} a este proveedor?`
        : `Are you sure you want to ${isApprove ? 'approve' : 'reject'} this provider?`,
      [
        { text: es ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: isApprove ? (es ? 'Aprobar' : 'Approve') : (es ? 'Rechazar' : 'Reject'),
          style: newStatus === 'rejected' ? 'destructive' : 'default',
          onPress: async () => {
            const { error } = await updateProviderStatus(id, newStatus);
            if (error) { Alert.alert('Error', error); return; }
            setProviders((prev) => prev.map((p) => p.id === id ? { ...p, status: newStatus } : p));
            // Refresh pending count in stats
            setStats((prev) => ({
              ...prev,
              pendingProviders: Math.max(0, prev.pendingProviders - 1),
            }));
          },
        },
      ],
    );
  };

  // ── Derived filtered lists ────────────────────────────────────────────────

  const filteredJobs = jobFilter === 'all'
    ? jobs
    : jobs.filter((j) => j.status === jobFilter);

  const filteredProviders = provFilter === 'all'
    ? providers
    : providers.filter((p) => p.status === provFilter);

  // ── Tab config ────────────────────────────────────────────────────────────

  const TABS: { key: CountryTab; flag: string; label: string }[] = [
    { key: 'global',   flag: '🌎', label: es ? 'Global'   : 'Global' },
    { key: 'usa',      flag: '🇺🇸', label: 'USA' },
    { key: 'colombia', flag: '🇨🇴', label: 'Colombia' },
  ];

  const JOB_FILTERS: { key: JobFilter; label: string }[] = [
    { key: 'all',         label: es ? 'Todos'       : 'All' },
    { key: 'open',        label: es ? 'Abiertos'    : 'Open' },
    { key: 'in_progress', label: es ? 'En Progreso' : 'In Progress' },
    { key: 'completed',   label: es ? 'Completados' : 'Completed' },
    { key: 'cancelled',   label: es ? 'Cancelados'  : 'Cancelled' },
  ];

  const PROV_FILTERS: { key: ProvFilter; label: string }[] = [
    { key: 'all',      label: es ? 'Todos'      : 'All' },
    { key: 'pending',  label: es ? 'Pendientes' : 'Pending' },
    { key: 'approved', label: es ? 'Aprobados'  : 'Approved' },
    { key: 'rejected', label: es ? 'Rechazados' : 'Rejected' },
  ];

  // ── Revenue display ───────────────────────────────────────────────────────

  const revenueDisplay = activeTab === 'colombia'
    ? formatCOP(stats.revenue)
    : formatUSD(stats.revenue);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.background }}
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
    >
      {/* ── Header ── */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 18, paddingBottom: 4 }}>
        <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.2 }}>
          Panel ProVendor
        </Text>
        <Text style={{ color: C.textPrimary, fontSize: 26, fontFamily: 'Inter_700Bold', marginTop: 3, letterSpacing: -0.5 }}>
          {greet(es)}, {user?.email?.split('@')[0] ?? 'Admin'} 👋
        </Text>
      </View>

      {/* ── Country tabs ── */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 16, marginBottom: 6 }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14,
                backgroundColor: isActive ? C.accent : C.surface,
                borderWidth: 1, borderColor: isActive ? C.accent : C.line,
              }}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 18 }}>{tab.flag}</Text>
              <Text style={{ color: isActive ? '#000' : C.textMuted, fontSize: 11, fontFamily: isActive ? 'Inter_700Bold' : 'Inter_400Regular', marginTop: 3 }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && !refreshing ? (
        <View style={{ alignItems: 'center', paddingTop: 60 }}>
          <ActivityIndicator color={C.accent} size="large" />
          <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 16 }}>
            {es ? 'Cargando datos...' : 'Loading data...'}
          </Text>
        </View>
      ) : (
        <>
          {/* ── Stats ── */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20, marginTop: 20, marginBottom: 4 }}>
            <StatCard
              icon="briefcase"
              label={es ? 'Trabajos activos' : 'Active Jobs'}
              value={stats.activeJobs}
              color="#3B82F6"
            />
            <StatCard
              icon="clock"
              label={es ? 'Prov. pendientes' : 'Pending Providers'}
              value={stats.pendingProviders}
              color={C.warning}
            />
            <StatCard
              icon="users"
              label={es ? 'Clientes registrados' : 'Registered Clients'}
              value={stats.clients}
              color={C.accent}
            />
            <StatCard
              icon="trending-up"
              label={es ? 'Ingresos estimados' : 'Est. Revenue'}
              value={revenueDisplay}
              color={C.success}
            />
          </View>

          {/* ══════════ JOBS SECTION ══════════ */}
          <SectionHeader
            title={es ? 'Trabajos' : 'Jobs'}
            icon="briefcase"
            onSeeAll={() => router.push('/(admin)/jobs' as any)}
            es={es}
          />
          <FilterChips options={JOB_FILTERS} active={jobFilter} onSelect={setJobFilter} />

          {filteredJobs.length === 0 ? (
            <EmptySection text={es ? 'Sin trabajos para este filtro' : 'No jobs for this filter'} />
          ) : (
            <>
              {filteredJobs.slice(0, 8).map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  es={es}
                  onPress={() => router.push('/(admin)/jobs' as any)}
                />
              ))}
              {filteredJobs.length > 8 && (
                <TouchableOpacity
                  onPress={() => router.push('/(admin)/jobs' as any)}
                  style={{ marginHorizontal: 20, marginTop: 4, marginBottom: 4, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface }}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: C.accent, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
                    {es ? `Ver ${filteredJobs.length - 8} más →` : `See ${filteredJobs.length - 8} more →`}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* ══════════ PROVIDERS SECTION ══════════ */}
          <SectionHeader
            title={es ? 'Proveedores' : 'Providers'}
            icon="users"
            badge={stats.pendingProviders}
            onSeeAll={() => router.push('/(admin)/providers' as any)}
            es={es}
          />
          <FilterChips options={PROV_FILTERS} active={provFilter} onSelect={setProvFilter} />

          {filteredProviders.length === 0 ? (
            <EmptySection text={es ? 'Sin proveedores para este filtro' : 'No providers for this filter'} />
          ) : (
            <>
              {filteredProviders.slice(0, 8).map((prov) => (
                <ProviderRow
                  key={prov.id}
                  provider={prov}
                  es={es}
                  onApprove={() => handleProvStatus(prov.id, 'approved')}
                  onReject={() => handleProvStatus(prov.id, 'rejected')}
                  onPress={() => router.push({ pathname: '/(admin)/provider-detail', params: { id: prov.id } } as any)}
                />
              ))}
              {filteredProviders.length > 8 && (
                <TouchableOpacity
                  onPress={() => router.push('/(admin)/providers' as any)}
                  style={{ marginHorizontal: 20, marginTop: 4, marginBottom: 4, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface }}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: C.accent, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
                    {es ? `Ver ${filteredProviders.length - 8} más →` : `See ${filteredProviders.length - 8} more →`}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* ══════════ CLIENTS SECTION ══════════ */}
          <SectionHeader
            title={es ? 'Clientes' : 'Clients'}
            icon="user"
            es={es}
          />

          {clients.length === 0 ? (
            <EmptySection text={es ? 'Sin clientes registrados' : 'No registered clients'} />
          ) : (
            <>
              {clients.slice(0, 6).map((client) => (
                <ClientRow key={client.id} client={client} es={es} />
              ))}
              {clients.length > 6 && (
                <View style={{ marginHorizontal: 20, marginTop: 4, alignItems: 'center', paddingVertical: 10 }}>
                  <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
                    {es ? `+ ${clients.length - 6} clientes más` : `+ ${clients.length - 6} more clients`}
                  </Text>
                </View>
              )}
            </>
          )}

          {/* ── Quick actions ── */}
          <View style={{ marginHorizontal: 20, marginTop: 28, marginBottom: 8 }}>
            <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 }}>
              {es ? 'Acciones Rápidas' : 'Quick Actions'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[
                { icon: 'file-text' as const, label: es ? 'Documentos' : 'Documents', route: '/(admin)/documents' },
                { icon: 'message-square' as const, label: es ? 'Mensajes' : 'Messages', route: '/(admin)/chats' },
                { icon: 'briefcase' as const, label: es ? 'Todos los trabajos' : 'All Jobs', route: '/(admin)/jobs' },
              ].map((a) => (
                <TouchableOpacity
                  key={a.label}
                  onPress={() => router.push(a.route as any)}
                  style={{
                    flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
                    borderRadius: 14, padding: 14, alignItems: 'center',
                  }}
                  activeOpacity={0.85}
                >
                  <View style={{ width: 38, height: 38, backgroundColor: `${C.accent}15`, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                    <Feather name={a.icon} size={16} color={C.accent} />
                  </View>
                  <Text style={{ color: C.textSecondary, fontSize: 10, fontFamily: 'Inter_500Medium', textAlign: 'center' }}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}
