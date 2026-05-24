import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useLang } from '@/context/LanguageContext';
import { fetchJobBids, acceptBid } from '@/lib/jobService';
import { formatUSD, formatCOP } from '@/lib/countryData';
import { supabase } from '@/lib/supabase';
import { C } from '@/constants/theme';
import type { BidWithProvider } from '@/lib/jobService';
import type { JobRequest } from '@/types';

function timeAgo(iso: string, es: boolean): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return es ? 'Hoy' : 'Today';
  if (days === 1) return es ? 'Ayer' : 'Yesterday';
  return es ? `Hace ${days}d` : `${days}d ago`;
}

export default function JobOffers() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { lang } = useLang();
  const es = lang === 'es';
  const isColombia = user?.country === 'colombia';

  const [job, setJob] = useState<JobRequest | null>(null);
  const [bids, setBids] = useState<BidWithProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    (async () => {
      try {
        const [jobRes, bidsData] = await Promise.all([
          supabase.from('job_requests').select('*').eq('id', jobId).single(),
          fetchJobBids(jobId),
        ]);
        setJob(jobRes.data ?? null);
        setBids(bidsData);
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId]);

  const handleAccept = async (bid: BidWithProvider) => {
    if (!job) return;
    const amount = bidAmount(bid);
    Alert.alert(
      es ? '¿Aceptar oferta?' : 'Accept this bid?',
      es
        ? `¿Confirmas aceptar la oferta de ${bid.provider_name} por ${amount}?`
        : `Confirm accepting ${bid.provider_name}'s bid for ${amount}?`,
      [
        { text: es ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: es ? 'Aceptar' : 'Accept',
          onPress: async () => {
            setAccepting(bid.id);
            try {
              await acceptBid(bid.id, job.id);
              // Update local state so the accepted bid shows its badge immediately
              setBids((prev) =>
                prev.map((b) =>
                  b.id === bid.id
                    ? { ...b, status: 'accepted' }
                    : { ...b, status: b.status === 'pending' ? 'rejected' : b.status },
                ),
              );
              // Update local job status
              setJob((prev) => prev ? { ...prev, status: 'accepted' as any } : prev);
              Alert.alert(
                es ? '¡Oferta aceptada!' : 'Offer accepted!',
                es
                  ? '¡Trabajo en camino! El proveedor recibirá una notificación.'
                  : 'Job confirmed! The provider will be notified.',
                [{ text: 'OK', onPress: () => router.replace('/(client)/my-requests' as any) }],
              );
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Failed to accept bid.');
            } finally {
              setAccepting(null);
            }
          },
        },
      ],
    );
  };

  const bidAmount = (bid: BidWithProvider) =>
    bid.bid_amount_usd
      ? formatUSD(bid.bid_amount_usd)
      : bid.bid_amount_cop
      ? formatCOP(bid.bid_amount_cop)
      : '—';

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 48, paddingBottom: 20 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}
        >
          <Feather name="arrow-left" size={20} color={C.textSecondary} />
          <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', marginLeft: 8 }}>
            {es ? 'Volver' : 'Back'}
          </Text>
        </TouchableOpacity>
        <Text style={{ color: C.textPrimary, fontSize: 26, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>
          {es ? 'Ofertas Recibidas' : 'Bids Received'}
        </Text>
        {!loading && (
          <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
            {bids.length}{' '}
            {es
              ? bids.length === 1 ? 'oferta' : 'ofertas'
              : bids.length === 1 ? 'bid' : 'bids'}
          </Text>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent} size="large" />
        </View>
      ) : bids.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Feather name="inbox" size={48} color={C.textMuted} />
          <Text style={{ color: C.textSecondary, fontSize: 17, fontFamily: 'Inter_600SemiBold', marginTop: 16 }}>
            {es ? 'Aún no hay ofertas' : 'No bids yet'}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 8, textAlign: 'center' }}>
            {es
              ? 'Los proveedores en tu área verán tu solicitud pronto.'
              : 'Providers in your area will see your request soon.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}
        >
          {bids.map((bid) => {
            const isAccepted = bid.status === 'accepted';
            const isRejected = bid.status === 'rejected';
            const isLoadingBid = accepting === bid.id;
            const canAccept = bid.status === 'pending' && job?.status === 'open';

            return (
              <View
                key={bid.id}
                style={{
                  backgroundColor: C.surface,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: isAccepted ? C.success : C.line,
                  opacity: isRejected ? 0.5 : 1,
                }}
              >
                {/* Provider row */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
                  <View style={{
                    width: 44,
                    height: 44,
                    backgroundColor: bid.provider_type === 'company' ? `${C.accent2}20` : `${C.accent}20`,
                    borderRadius: 22,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}>
                    <Feather
                      name={bid.provider_type === 'company' ? 'briefcase' : 'user'}
                      size={18}
                      color={bid.provider_type === 'company' ? C.accent2 : C.accent}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.textPrimary, fontSize: 16, fontFamily: 'Inter_600SemiBold' }}>
                      {bid.provider_name}
                    </Text>
                    <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                      {bid.provider_type === 'company'
                        ? (es ? 'Empresa' : 'Company')
                        : (es ? 'Independiente' : 'Independent')}
                      {' · '}{timeAgo(bid.applied_at, es)}
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: C.surface2,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: C.accent,
                  }}>
                    <Text style={{ color: C.accent, fontSize: 17, fontFamily: 'Inter_700Bold' }}>
                      {bidAmount(bid)}
                    </Text>
                  </View>
                </View>

                {bid.message ? (
                  <Text style={{
                    color: C.textSecondary,
                    fontSize: 13,
                    fontFamily: 'Inter_400Regular',
                    lineHeight: 20,
                    marginBottom: 12,
                    fontStyle: 'italic',
                  }}>
                    "{bid.message}"
                  </Text>
                ) : null}

                {isAccepted && (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: `${C.success}15`,
                    borderRadius: 10,
                    padding: 12,
                  }}>
                    <Feather name="check-circle" size={15} color={C.success} style={{ marginRight: 8 }} />
                    <Text style={{ color: C.success, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                      {es ? 'Oferta aceptada' : 'Bid accepted'}
                    </Text>
                  </View>
                )}

                {canAccept && (
                  <TouchableOpacity
                    onPress={() => handleAccept(bid)}
                    disabled={!!accepting}
                    style={{
                      backgroundColor: C.accent,
                      borderRadius: 10,
                      paddingVertical: 13,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 6,
                      opacity: accepting ? 0.6 : 1,
                    }}
                    activeOpacity={0.85}
                  >
                    {isLoadingBid ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Feather name="check" size={16} color="#FFFFFF" />
                        <Text style={{ color: '#FFFFFF', fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>
                          {es ? 'Aceptar Oferta' : 'Accept Bid'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
