import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Modal, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import EmptyState from '@/components/ui/EmptyState';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { fetchJobBids, acceptBid } from '@/lib/jobService';
import { formatUSD, formatCOP } from '@/lib/countryData';
import { C } from '@/constants/theme';
import { useLang } from '@/context/LanguageContext';
import type { JobRequest } from '@/types';
import type { BidWithProvider } from '@/lib/jobService';

type Tab = 'open' | 'in_progress' | 'completed';

const TAB_LABELS: Record<Tab, string> = { open: 'Open', in_progress: 'Active', completed: 'Done' };
const TAB_LABELS_ES: Record<Tab, string> = { open: 'Abiertas', in_progress: 'Activas', completed: 'Listas' };

function timeAgo(iso: string, es: boolean): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return es ? 'Hoy' : 'Today';
  if (days === 1) return es ? 'Ayer' : 'Yesterday';
  return es ? `Hace ${days}d` : `${days}d ago`;
}

interface BidsModalProps {
  job: JobRequest | null;
  visible: boolean;
  isColombia: boolean;
  es: boolean;
  onClose: () => void;
  onAccepted: () => void;
}

function BidsModal({ job, visible, isColombia, es, onClose, onAccepted }: BidsModalProps) {
  const [bids, setBids] = useState<BidWithProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    if (!job || !visible) return;
    setLoading(true);
    setBids([]);
    fetchJobBids(job.id)
      .then(setBids)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [job?.id, visible]);

  const handleAccept = async (bid: BidWithProvider) => {
    if (!job) return;
    Alert.alert(
      es ? '¿Aceptar oferta?' : 'Accept this bid?',
      es
        ? `¿Confirmas aceptar la oferta de ${bid.provider_name} por ${bid.bid_amount_usd ? formatUSD(bid.bid_amount_usd) : formatCOP(bid.bid_amount_cop ?? 0)}?`
        : `Confirm accepting ${bid.provider_name}'s bid for ${bid.bid_amount_usd ? formatUSD(bid.bid_amount_usd) : formatCOP(bid.bid_amount_cop ?? 0)}?`,
      [
        { text: es ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: es ? 'Aceptar' : 'Accept',
          onPress: async () => {
            setAccepting(bid.id);
            try {
              await acceptBid(bid.id, job.id);
              onAccepted();
              onClose();
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
    bid.bid_amount_usd ? formatUSD(bid.bid_amount_usd) : bid.bid_amount_cop ? formatCOP(bid.bid_amount_cop) : '—';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
        <View style={{
          backgroundColor: C.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingTop: 20,
          paddingBottom: 48,
          maxHeight: '80%',
          borderTopWidth: 1,
          borderTopColor: C.line,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 16 }}>
            <View>
              <Text style={{ color: C.textPrimary, fontSize: 20, fontFamily: 'Inter_700Bold' }}>
                {es ? 'Ofertas Recibidas' : 'Bids Received'}
              </Text>
              {!loading && (
                <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                  {bids.length} {es ? (bids.length === 1 ? 'oferta' : 'ofertas') : (bids.length === 1 ? 'bid' : 'bids')}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, backgroundColor: C.surface2, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="x" size={18} color={C.textSecondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 48, alignItems: 'center' }}>
              <ActivityIndicator color={C.accent} size="large" />
            </View>
          ) : bids.length === 0 ? (
            <View style={{ paddingVertical: 48, alignItems: 'center', paddingHorizontal: 24 }}>
              <Feather name="inbox" size={36} color={C.textMuted} />
              <Text style={{ color: C.textSecondary, fontSize: 15, fontFamily: 'Inter_600SemiBold', marginTop: 14 }}>
                {es ? 'Aún no hay ofertas' : 'No bids yet'}
              </Text>
              <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 6, textAlign: 'center' }}>
                {es ? 'Los proveedores en tu área verán tu solicitud pronto.' : 'Providers in your area will see your request soon.'}
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>
              {bids.map((bid) => {
                const isAccepted = bid.status === 'accepted';
                const isRejected = bid.status === 'rejected';
                const isLoading = accepting === bid.id;
                const canAccept = bid.status === 'pending' && job?.status === 'open';

                return (
                  <View key={bid.id} style={{
                    backgroundColor: C.background,
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: isAccepted ? C.success : C.line,
                    opacity: isRejected ? 0.5 : 1,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
                      <View style={{
                        width: 40,
                        height: 40,
                        backgroundColor: bid.provider_type === 'company' ? `${C.accent2}20` : `${C.accent}20`,
                        borderRadius: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}>
                        <Feather
                          name={bid.provider_type === 'company' ? 'briefcase' : 'user'}
                          size={16}
                          color={bid.provider_type === 'company' ? C.accent2 : C.accent}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>{bid.provider_name}</Text>
                        <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 }}>
                          {bid.provider_type === 'company' ? (es ? 'Empresa' : 'Company') : (es ? 'Independiente' : 'Independent')}
                          {' · '}{timeAgo(bid.applied_at, es)}
                        </Text>
                      </View>
                      <View style={{
                        backgroundColor: C.surface2,
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderWidth: 1,
                        borderColor: C.accent,
                      }}>
                        <Text style={{ color: C.accent, fontSize: 16, fontFamily: 'Inter_700Bold' }}>{bidAmount(bid)}</Text>
                      </View>
                    </View>

                    {bid.message ? (
                      <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18, marginBottom: 12 }}>
                        "{bid.message}"
                      </Text>
                    ) : null}

                    {isAccepted && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${C.success}15`, borderRadius: 10, padding: 10 }}>
                        <Feather name="check-circle" size={14} color={C.success} style={{ marginRight: 6 }} />
                        <Text style={{ color: C.success, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
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
                          paddingVertical: 12,
                          alignItems: 'center',
                          flexDirection: 'row',
                          justifyContent: 'center',
                          opacity: accepting ? 0.6 : 1,
                        }}
                        activeOpacity={0.85}
                      >
                        {isLoading ? (
                          <ActivityIndicator size="small" color="#000" />
                        ) : (
                          <>
                            <Feather name="check" size={15} color="#000" style={{ marginRight: 6 }} />
                            <Text style={{ color: '#000', fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
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
      </View>
    </Modal>
  );
}

function RequestCard({
  req,
  isColombia,
  es,
  onViewBids,
}: {
  req: JobRequest;
  isColombia: boolean;
  es: boolean;
  onViewBids: () => void;
}) {
  const isCommercial = req.service_type === 'commercial';
  const accentColor = isCommercial ? C.accent2 : C.accent;
  const budgetText = req.budget_usd
    ? formatUSD(req.budget_usd)
    : req.budget_cop ? formatCOP(req.budget_cop) : null;
  const location = isColombia ? req.city : `${req.city}, ${req.state}`;

  return (
    <View style={{
      backgroundColor: C.surface,
      borderRadius: 16,
      marginBottom: 12,
      overflow: 'hidden',
      borderLeftWidth: 3,
      borderLeftColor: accentColor,
      borderWidth: 1,
      borderColor: C.line,
    }}>
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_600SemiBold', flex: 1, marginRight: 8 }} numberOfLines={1}>
            {isCommercial ? (isColombia ? 'Limpieza Comercial' : 'Commercial Cleaning') : (isColombia ? 'Limpieza Residencial' : 'Residential Cleaning')}
          </Text>
          <View style={{
            backgroundColor: isCommercial ? '#0d1a2d' : '#2d1a0d',
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: accentColor,
          }}>
            <Text style={{ color: accentColor, fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>
              {isCommercial ? (isColombia ? 'COMERCIAL' : 'COMMERCIAL') : (isColombia ? 'RESIDENCIAL' : 'RESIDENTIAL')}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Feather name="map-pin" size={11} color={C.textMuted} style={{ marginRight: 4 }} />
          <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginRight: 12 }}>
            {location}
          </Text>
          <Feather name="calendar" size={11} color={C.textMuted} style={{ marginRight: 4 }} />
          <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
            {req.scheduled_date}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {budgetText && (
            <View style={{
              backgroundColor: C.surface2,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: C.accent,
            }}>
              <Text style={{ color: C.accent, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>{budgetText}</Text>
            </View>
          )}
          <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginLeft: 'auto' }}>
            {timeAgo(req.created_at, es)}
          </Text>
        </View>
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: C.line, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        {req.status === 'open' ? (
          <TouchableOpacity onPress={onViewBids} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="tag" size={13} color={C.accent} style={{ marginRight: 4 }} />
            <Text style={{ color: C.accent, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
              {isColombia ? 'Ver Ofertas' : 'View Bids'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="check-circle" size={13} color={req.status === 'in_progress' ? '#3B82F6' : C.success} style={{ marginRight: 4 }} />
            <Text style={{ color: req.status === 'in_progress' ? '#3B82F6' : C.success, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
              {req.status === 'in_progress' ? (isColombia ? 'En Progreso' : 'In Progress') : (isColombia ? 'Completado' : 'Completed')}
            </Text>
          </View>
        )}
        <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
          {req.estimated_hours}h
        </Text>
      </View>
    </View>
  );
}

export default function MyRequests() {
  const [activeTab, setActiveTab] = useState<Tab>('open');
  const router = useRouter();
  const { user } = useAuthStore();
  const { lang } = useLang();
  const es = lang === 'es';
  const isColombia = user?.country === 'colombia';
  const labels = isColombia ? TAB_LABELS_ES : TAB_LABELS;

  const [jobs, setJobs] = useState<{ open: JobRequest[]; in_progress: JobRequest[]; completed: JobRequest[] }>({
    open: [], in_progress: [], completed: [],
  });
  const [loading, setLoading] = useState(false);
  const [bidsJob, setBidsJob] = useState<JobRequest | null>(null);

  const loadJobs = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('job_requests')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });
      const allJobs = (data ?? []) as JobRequest[];
      setJobs({
        open:        allJobs.filter((j) => j.status === 'open'),
        in_progress: allJobs.filter((j) => j.status === 'in_progress'),
        completed:   allJobs.filter((j) => j.status === 'completed'),
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const current = jobs[activeTab];

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 20 }}>
        <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold' }}>
          {isColombia ? 'Mis Solicitudes' : 'My Requests'}
        </Text>
        <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
          {isColombia ? 'Seguimiento de tus servicios' : 'Track your service requests'}
        </Text>
      </View>

      <View style={{
        flexDirection: 'row',
        marginHorizontal: 20,
        marginBottom: 16,
        backgroundColor: C.surface,
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: C.line,
      }}>
        {(Object.keys(labels) as Tab[]).map((tab) => {
          const isActive = activeTab === tab;
          const count = jobs[tab].length;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                paddingVertical: 8,
                alignItems: 'center',
                borderRadius: 8,
                backgroundColor: isActive ? C.accent : 'transparent',
                flexDirection: 'row',
                justifyContent: 'center',
              }}
              activeOpacity={0.75}
            >
              <Text style={{
                fontSize: 12,
                fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_400Regular',
                color: isActive ? '#000' : C.textSecondary,
              }}>
                {labels[tab]}
              </Text>
              {count > 0 && (
                <View style={{
                  marginLeft: 5,
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: isActive ? 'rgba(0,0,0,0.2)' : C.surface2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 9, color: isActive ? '#000' : C.textSecondary, fontFamily: 'Inter_600SemiBold' }}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent} size="large" />
        </View>
      ) : current.length === 0 ? (
        <EmptyState
          title={isColombia ? `Sin solicitudes ${labels[activeTab].toLowerCase()}` : `No ${labels[activeTab].toLowerCase()} requests`}
          subtitle={isColombia ? 'Publica un trabajo para comenzar' : 'Post a job to get started'}
          iconName="clipboard"
          ctaLabel={isColombia ? 'Publicar Trabajo' : 'Post a Job'}
          onCta={() => router.push('/(client)/post-job' as any)}
        />
      ) : (
        <FlatList
          data={current}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RequestCard
              req={item}
              isColombia={isColombia}
              es={es}
              onViewBids={() => setBidsJob(item)}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <BidsModal
        job={bidsJob}
        visible={!!bidsJob}
        isColombia={isColombia}
        es={es}
        onClose={() => setBidsJob(null)}
        onAccepted={() => { loadJobs(); setActiveTab('in_progress'); }}
      />
    </View>
  );
}
