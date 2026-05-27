/**
 * Analytics screen — visible only to role = 'company'
 * Shows: completed jobs this month vs last month, estimated revenue,
 * average rating, weekly jobs chart (last 8 weeks)
 */
import { useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useLang } from '@/context/LanguageContext';
import { C } from '@/constants/theme';

interface WeekBucket {
  label: string;
  count: number;
}

interface AnalyticsData {
  completedThisMonth: number;
  completedLastMonth: number;
  estimatedRevenue: number;
  currency: 'usd' | 'cop';
  averageRating: number;
  reviewCount: number;
  weeklyBuckets: WeekBucket[];
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function BarChart({ buckets, es }: { buckets: WeekBucket[]; es: boolean }) {
  const maxCount = Math.max(...buckets.map((b) => b.count), 1);
  const chartW = 300;
  const chartH = 120;
  const barW = 28;
  const gap = (chartW - barW * buckets.length) / (buckets.length + 1);

  return (
    <View style={{ alignItems: 'center', marginVertical: 8 }}>
      <Svg width={chartW} height={chartH + 30}>
        {/* Baseline */}
        <Line x1={0} y1={chartH} x2={chartW} y2={chartH} stroke={C.line} strokeWidth={1} />

        {buckets.map((b, i) => {
          const barH = maxCount > 0 ? (b.count / maxCount) * (chartH - 10) : 0;
          const x = gap + i * (barW + gap);
          const y = chartH - barH;
          return (
            <Svg key={i}>
              <Rect
                x={x}
                y={y}
                width={barW}
                height={barH || 2}
                rx={4}
                fill={b.count > 0 ? C.accent : C.line}
                opacity={b.count > 0 ? 1 : 0.4}
              />
              {b.count > 0 && (
                <SvgText
                  x={x + barW / 2}
                  y={y - 5}
                  textAnchor="middle"
                  fontSize={11}
                  fill={C.textPrimary}
                  fontWeight="bold"
                >
                  {b.count}
                </SvgText>
              )}
              <SvgText
                x={x + barW / 2}
                y={chartH + 18}
                textAnchor="middle"
                fontSize={9}
                fill={C.textMuted}
              >
                {b.label}
              </SvgText>
            </Svg>
          );
        })}
      </Svg>
    </View>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color }: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <View style={{
      flex: 1, minWidth: '45%',
      backgroundColor: C.surface,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: C.line,
      borderLeftWidth: 3,
      borderLeftColor: color,
    }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${color}15`, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -1 }}>{value}</Text>
      <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 }}>{label}</Text>
      {sub && (
        <Text style={{ color: color, fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 4 }}>{sub}</Text>
      )}
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const { user } = useAuthStore();
  const { lang } = useLang();
  const es = lang === 'es';
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

      // Find all accepted applications for this provider
      const { data: myApps } = await supabase
        .from('job_applications')
        .select('job_request_id, bid_amount_usd, bid_amount_cop')
        .eq('provider_id', user.id)
        .eq('status', 'accepted');

      const myJobIds = (myApps ?? []).map((a: any) => a.job_request_id);

      // Completed jobs
      const { data: completedJobs } = await supabase
        .from('job_requests')
        .select('id, created_at, country')
        .in('id', myJobIds.length > 0 ? myJobIds : ['none'])
        .eq('status', 'completed');

      const allCompleted = (completedJobs ?? []) as any[];
      const thisMonth = allCompleted.filter((j) => j.created_at >= startOfMonth).length;
      const lastMonth = allCompleted.filter((j) => j.created_at >= startOfLastMonth && j.created_at <= endOfLastMonth).length;

      // Revenue
      const appMap: Record<string, { usd?: number; cop?: number }> = {};
      (myApps ?? []).forEach((a: any) => {
        appMap[a.job_request_id] = { usd: a.bid_amount_usd, cop: a.bid_amount_cop };
      });
      const isColombia = user.country === 'colombia';
      let revenue = 0;
      allCompleted.forEach((j) => {
        const app = appMap[j.id];
        if (app) revenue += isColombia ? (app.cop ?? 0) : (app.usd ?? 0);
      });

      // Ratings
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('provider_id', user.id);
      const reviewList = (reviews ?? []) as any[];
      const avgRating = reviewList.length > 0
        ? reviewList.reduce((s, r) => s + r.rating, 0) / reviewList.length
        : 0;

      // Weekly buckets (last 8 weeks)
      const buckets: WeekBucket[] = [];
      for (let w = 7; w >= 0; w--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - w * 7 - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const count = allCompleted.filter((j) => {
          const d = new Date(j.created_at);
          return d >= weekStart && d <= weekEnd;
        }).length;

        const label = `${String(weekStart.getMonth() + 1).padStart(2, '0')}/${String(weekStart.getDate()).padStart(2, '0')}`;
        buckets.push({ label, count });
      }

      setData({
        completedThisMonth: thisMonth,
        completedLastMonth: lastMonth,
        estimatedRevenue: revenue,
        currency: isColombia ? 'cop' : 'usd',
        averageRating: Math.round(avgRating * 10) / 10,
        reviewCount: reviewList.length,
        weeklyBuckets: buckets,
      });
    } catch (e: any) {
      console.warn('[Analytics] error:', e.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.country]);

  useFocusEffect(useCallback(() => { loadAnalytics(); }, [loadAnalytics]));

  const formatRevenue = (amount: number, currency: 'usd' | 'cop') => {
    if (currency === 'cop') {
      return `$${amount.toLocaleString('es-CO')} COP`;
    }
    return `$${amount.toFixed(0)} USD`;
  };

  const monthDelta = data ? data.completedThisMonth - data.completedLastMonth : 0;
  const deltaStr = monthDelta === 0
    ? (es ? 'Igual que el mes pasado' : 'Same as last month')
    : monthDelta > 0
    ? (es ? `+${monthDelta} vs mes pasado` : `+${monthDelta} vs last month`)
    : (es ? `${monthDelta} vs mes pasado` : `${monthDelta} vs last month`);
  const deltaColor = monthDelta >= 0 ? C.success : C.danger;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 24, paddingBottom: 20 }}>
        <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1 }}>
          {user?.role === 'company' ? (es ? 'Mi empresa' : 'My Company') : (es ? 'Mi perfil' : 'My Profile')}
        </Text>
        <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', marginTop: 4 }}>
          Analytics
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
          <ActivityIndicator color={C.accent} size="large" />
        </View>
      ) : data ? (
        <View style={{ paddingHorizontal: 20, paddingBottom: 48 }}>
          {/* Stats grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
            <StatCard
              icon="check-circle"
              label={es ? 'Trabajos este mes' : 'Jobs this month'}
              value={String(data.completedThisMonth)}
              sub={deltaStr}
              color={C.success}
            />
            <StatCard
              icon="dollar-sign"
              label={es ? 'Ingresos estimados' : 'Estimated revenue'}
              value={formatRevenue(data.estimatedRevenue, data.currency)}
              color={C.accent}
            />
            <StatCard
              icon="star"
              label={es ? 'Calificación promedio' : 'Average rating'}
              value={data.averageRating > 0 ? `${data.averageRating} ★` : '—'}
              sub={data.reviewCount > 0 ? `${data.reviewCount} ${es ? 'reseñas' : 'reviews'}` : (es ? 'Sin reseñas aún' : 'No reviews yet')}
              color="#F59E0B"
            />
            <StatCard
              icon="trending-up"
              label={es ? 'Mes pasado' : 'Last month'}
              value={String(data.completedLastMonth)}
              color={C.accent2}
            />
          </View>

          {/* Weekly chart */}
          <View style={{
            backgroundColor: C.surface,
            borderRadius: 20,
            padding: 20,
            borderWidth: 1,
            borderColor: C.line,
            marginBottom: 24,
          }}>
            <Text style={{ color: C.textPrimary, fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 4 }}>
              {es ? 'Trabajos por semana' : 'Jobs per week'}
            </Text>
            <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 16 }}>
              {es ? 'Últimas 8 semanas' : 'Last 8 weeks'}
            </Text>
            <BarChart buckets={data.weeklyBuckets} es={es} />
          </View>

          {/* Quick links */}
          <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            {es ? 'Acciones rápidas' : 'Quick actions'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[
              { icon: 'briefcase' as const, label: es ? 'Ver trabajos' : 'Browse jobs', route: '/(provider)/jobs' },
              { icon: 'list' as const, label: es ? 'Mis trabajos' : 'My jobs', route: '/(provider)/my-jobs' },
            ].map((a) => (
              <TouchableOpacity
                key={a.label}
                onPress={() => router.push(a.route as any)}
                style={{
                  flex: 1, backgroundColor: C.surface, borderRadius: 16,
                  padding: 16, alignItems: 'center', borderWidth: 1, borderColor: C.line,
                }}
                activeOpacity={0.85}
              >
                <View style={{ width: 40, height: 40, backgroundColor: `${C.accent}15`, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <Feather name={a.icon} size={18} color={C.accent} />
                </View>
                <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_500Medium', textAlign: 'center' }}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
