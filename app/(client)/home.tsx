import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '@/store/authStore';
import { useLang } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Feather } from '@expo/vector-icons';
import { formatUSD, formatCOP } from '@/lib/countryData';
import { SkeletonStatCard, SkeletonRow } from '@/components/ui/Skeleton';
import { C } from '@/constants/theme';
import type { JobRequest } from '@/types';

interface DashboardStats {
  open: number;
  active: number;
  bids: number;
}

const StatCard = React.memo(function StatCard({ icon, value, label, color, onPress }: { icon: keyof typeof Feather.glyphMap; value: number; label: string; color: string; onPress?: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      style={{
        flex: 1,
        backgroundColor: C.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: C.line,
        alignItems: 'center',
      }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${color}20`, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={{ color: C.textPrimary, fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>{value}</Text>
      <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2, textAlign: 'center' }}>{label}</Text>
    </TouchableOpacity>
  );
});

const MiniJobCard = React.memo(function MiniJobCard({ job, isColombia, es, onPress }: { job: JobRequest; isColombia: boolean; es: boolean; onPress: () => void }) {
  const isCommercial = job.service_type === 'commercial';
  const accentColor = isCommercial ? C.accent2 : C.accent;
  const STATUS_COLORS: Record<string, string> = { open: C.accent, in_progress: '#3B82F6', completed: C.success };
  const STATUS_LABELS: Record<string, string> = {
    open: es ? 'ABIERTA' : 'OPEN',
    in_progress: es ? 'ACTIVA' : 'ACTIVE',
    completed: es ? 'LISTA' : 'DONE',
  };
  const statusColor = STATUS_COLORS[job.status] ?? C.textMuted;
  const budgetText = job.budget_usd ? formatUSD(job.budget_usd) : job.budget_cop ? formatCOP(job.budget_cop) : null;
  const location = isColombia ? job.city : `${job.city}, ${job.state}`;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: C.surface,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: C.line,
        borderLeftWidth: 3,
        borderLeftColor: accentColor,
        flexDirection: 'row',
        alignItems: 'center',
      }}
      activeOpacity={0.85}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 3 }} numberOfLines={1}>
          {isCommercial ? (es ? 'Limpieza Comercial' : 'Commercial Cleaning') : (es ? 'Limpieza Residencial' : 'Residential Cleaning')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="map-pin" size={11} color={C.textMuted} />
          <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' }}>{location}</Text>
          {budgetText && (
            <>
              <Text style={{ color: C.textMuted, fontSize: 12 }}>·</Text>
              <Text style={{ color: C.accent, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>{budgetText}</Text>
            </>
          )}
        </View>
      </View>
      <View style={{ backgroundColor: `${statusColor}20`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 10 }}>
        <Text style={{ color: statusColor, fontSize: 10, fontFamily: 'Inter_600SemiBold' }}>{STATUS_LABELS[job.status] ?? job.status.toUpperCase()}</Text>
      </View>
    </TouchableOpacity>
  );
});

export default function ClientHome() {
  const { user } = useAuthStore(useShallow((s) => ({ user: s.user })));
  const router = useRouter();
  const { lang } = useLang();
  const es = lang === 'es';
  const isColombia = user?.country === 'colombia';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clientName, setClientName] = useState('');
  const [stats, setStats] = useState<DashboardStats>({ open: 0, active: 0, bids: 0 });
  const [recentJobs, setRecentJobs] = useState<JobRequest[]>([]);

  const loadDashboard = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [profileRes, jobsRes] = await Promise.all([
        supabase.from('clients').select('full_name').eq('user_id', user.id).single(),
        supabase.from('job_requests').select('*').eq('client_id', user.id).order('created_at', { ascending: false }),
      ]);

      setClientName(profileRes.data?.full_name ?? user.email?.split('@')[0] ?? '');

      const allJobs = (jobsRes.data ?? []) as JobRequest[];
      const openJobs = allJobs.filter((j) => j.status === 'open');
      const activeJobs = allJobs.filter((j) => j.status === 'in_progress');
      setRecentJobs(allJobs.slice(0, 4));

      let bidCount = 0;
      if (openJobs.length > 0) {
        const { count } = await supabase
          .from('job_applications')
          .select('id', { count: 'exact', head: true })
          .in('job_request_id', openJobs.map((j) => j.id))
          .eq('status', 'pending');
        bidCount = count ?? 0;
      }

      setStats({ open: openJobs.length, active: activeJobs.length, bids: bidCount });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  // Reload whenever the screen comes into focus (e.g. after posting a job)
  useFocusEffect(useCallback(() => { loadDashboard(); }, [loadDashboard]));

  const onRefresh = () => { setRefreshing(true); loadDashboard(); };

  const greeting = () => {
    const h = new Date().getHours();
    if (es) return h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches';
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 24 }}>
          <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular' }}>{greeting()}</Text>
          <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', marginTop: 2, letterSpacing: -0.5 }}>
            {loading ? '...' : clientName || (es ? 'Mi Panel' : 'My Dashboard')}
          </Text>
        </View>

        {loading ? (
          <View style={{ paddingHorizontal: 20 }}>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
            </View>
            <View style={{ height: 100, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.line, marginBottom: 24 }} />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 24 }}>
              <StatCard icon="clipboard" value={stats.open}   label={es ? 'Solicitudes\nAbiertas' : 'Open\nRequests'}   color={C.accent} />
              <StatCard icon="zap"       value={stats.active} label={es ? 'Servicios\nActivos'    : 'Active\nServices'}   color="#3B82F6" />
              <StatCard icon="tag"       value={stats.bids}   label={es ? 'Ofertas\nRecibidas'   : 'Bids\nReceived'}     color={C.success} onPress={() => router.push('/(client)/my-requests' as any)} />
            </View>

            <TouchableOpacity
              onPress={() => router.push('/(client)/post-job' as any)}
              style={{
                marginHorizontal: 20,
                backgroundColor: C.accent,
                borderRadius: 16,
                padding: 20,
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 24,
              }}
              activeOpacity={0.85}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                  {es ? 'Nueva Solicitud' : 'New Request'}
                </Text>
                <Text style={{ color: '#FFFFFF', fontSize: 20, fontFamily: 'Inter_700Bold', letterSpacing: -0.3 }}>
                  {es ? 'Publicar Trabajo' : 'Post a Job'}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
                  {es ? 'Recibe ofertas de proveedores verificados' : 'Get bids from verified professionals'}
                </Text>
              </View>
              <View style={{ width: 48, height: 48, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 16 }}>
                <Feather name="plus" size={22} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            {recentJobs.length > 0 && (
              <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1 }}>
                    {es ? 'Solicitudes Recientes' : 'Recent Requests'}
                  </Text>
                  <TouchableOpacity onPress={() => router.push('/(client)/my-requests' as any)}>
                    <Text style={{ color: C.accent, fontSize: 13, fontFamily: 'Inter_500Medium' }}>
                      {es ? 'Ver todas' : 'View all'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {recentJobs.map((job) => (
                  <MiniJobCard
                    key={job.id}
                    job={job}
                    isColombia={isColombia}
                    es={es}
                    onPress={() => {
                      if (job.status === 'open') {
                        router.push({ pathname: '/(client)/job-offers', params: { jobId: job.id } } as any);
                      } else {
                        router.push('/(client)/my-requests' as any);
                      }
                    }}
                  />
                ))}
              </View>
            )}

            {recentJobs.length === 0 && (
              <View style={{
                marginHorizontal: 20,
                backgroundColor: C.surface,
                borderWidth: 1,
                borderColor: C.line,
                borderRadius: 16,
                padding: 24,
                alignItems: 'center',
                marginBottom: 24,
              }}>
                <Feather name="clipboard" size={32} color={C.textMuted} />
                <Text style={{ color: C.textSecondary, fontSize: 15, fontFamily: 'Inter_600SemiBold', marginTop: 12 }}>
                  {es ? 'Aún no tienes solicitudes' : 'No requests yet'}
                </Text>
                <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 6, textAlign: 'center' }}>
                  {es ? 'Publica tu primer trabajo para recibir ofertas de proveedores verificados.' : 'Post your first job to receive bids from verified professionals.'}
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => router.navigate('/(client)/browse-providers' as any)}
              style={{
                marginHorizontal: 20,
                backgroundColor: C.surface,
                borderWidth: 1,
                borderColor: C.line,
                borderRadius: 16,
                padding: 18,
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 16,
              }}
              activeOpacity={0.85}
            >
              <View style={{ width: 44, height: 44, backgroundColor: `${C.accent}15`, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Feather name="search" size={20} color={C.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>
                  {es ? 'Buscar Proveedores' : 'Browse Providers'}
                </Text>
                <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                  {es ? 'Ver perfiles y calificaciones' : 'View profiles, ratings & availability'}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={C.textMuted} />
            </TouchableOpacity>

            {/* Contact Support */}
            <TouchableOpacity
              onPress={() => router.push('/(shared)/chat' as any)}
              style={{
                marginHorizontal: 20,
                backgroundColor: C.surface,
                borderWidth: 1,
                borderColor: C.line,
                borderRadius: 16,
                padding: 18,
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 16,
              }}
              activeOpacity={0.85}
            >
              <View style={{ width: 44, height: 44, backgroundColor: `${C.accent}15`, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Feather name="message-circle" size={20} color={C.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>
                  {es ? 'Contactar Soporte' : 'Contact Support'}
                </Text>
                <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                  {es ? '¿Necesitas ayuda? Chatea con nosotros.' : 'Need help? Chat with our team.'}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={C.textMuted} />
            </TouchableOpacity>

          </>
        )}
      </ScrollView>
    </View>
  );
}
