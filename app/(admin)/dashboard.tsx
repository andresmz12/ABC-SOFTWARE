import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import { Feather } from '@expo/vector-icons';
import { C } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

function StatCard({ icon, label, value, borderColor, loading }: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  borderColor: string;
  loading?: boolean;
}) {
  return (
    <View style={{
      flex: 1,
      minWidth: '45%',
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.line,
      borderLeftWidth: 3,
      borderLeftColor: borderColor,
      borderRadius: 16,
      padding: 20,
    }}>
      <Feather name={icon} size={18} color={borderColor} />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 12, alignSelf: 'flex-start' }} color={borderColor} />
      ) : (
        <Text style={{ color: C.textPrimary, fontSize: 32, fontFamily: 'Inter_700Bold', marginTop: 12, letterSpacing: -1 }}>{value}</Text>
      )}
      <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 }}>{label}</Text>
    </View>
  );
}

interface Stats {
  pending: number;
  approved: number;
  jobs: number;
  clients: number;
}

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, jobs: 0, clients: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const [pendingRes, approvedRes, jobsRes, clientsRes] = await Promise.all([
          supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'pending').in('role', ['company', 'independent']),
          supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'approved').in('role', ['company', 'independent']),
          supabase.from('job_requests').select('*', { count: 'exact', head: true }).eq('status', 'open'),
          supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'client'),
        ]);
        setStats({
          pending:  pendingRes.count  ?? 0,
          approved: approvedRes.count ?? 0,
          jobs:     jobsRes.count     ?? 0,
          clients:  clientsRes.count  ?? 0,
        });
      } catch {
        // keep zeros
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <ScreenWrapper scroll className="px-6">
      <View style={{ paddingTop: 40, paddingBottom: 8 }}>
        <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1 }}>Admin Panel</Text>
        <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', marginTop: 4, letterSpacing: -0.5 }}>Dashboard</Text>
        <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 4 }}>{user?.email}</Text>
      </View>

      {/* Stats grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 24, marginBottom: 32 }}>
        <StatCard icon="clock"     label="Pending Review" value={String(stats.pending)}  borderColor={C.warning} loading={loadingStats} />
        <StatCard icon="check"     label="Approved"       value={String(stats.approved)} borderColor={C.success} loading={loadingStats} />
        <StatCard icon="briefcase" label="Active Jobs"    value={String(stats.jobs)}     borderColor="#3B82F6"   loading={loadingStats} />
        <StatCard icon="users"     label="Total Clients"  value={String(stats.clients)}  borderColor={C.accent}  loading={loadingStats} />
      </View>

      {/* Quick actions */}
      <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        Quick Actions
      </Text>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 32 }}>
        {[
          { icon: 'file-text' as const, label: 'Review Documents', route: '/(admin)/documents' },
          { icon: 'users' as const,     label: 'View Providers',   route: '/(admin)/providers' },
          { icon: 'briefcase' as const, label: 'All Jobs',         route: '/(admin)/jobs' },
        ].map((a) => (
          <TouchableOpacity
            key={a.label}
            onPress={() => router.push(a.route as any)}
            style={{
              flex: 1,
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.line,
              borderRadius: 16,
              padding: 16,
              alignItems: 'center',
            }}
            activeOpacity={0.85}
          >
            <View style={{ width: 44, height: 44, backgroundColor: `${C.accent}15`, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Feather name={a.icon} size={18} color={C.accent} />
            </View>
            <Text style={{ color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_500Medium', textAlign: 'center' }}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent activity placeholder */}
      <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        Recent Activity
      </Text>
      <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 40 }}>
        <Feather name="activity" size={28} color={C.textMuted} />
        <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 12, textAlign: 'center' }}>
          Activity will appear here as providers register and jobs are posted.
        </Text>
      </View>
    </ScreenWrapper>
  );
}
