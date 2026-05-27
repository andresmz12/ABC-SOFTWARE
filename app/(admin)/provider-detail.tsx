import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, ActivityIndicator, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useLang } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { getUserProfile, updateProviderStatus } from '@/lib/userUtils';
import { C } from '@/constants/theme';

type ProviderStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
type DocStatus = 'pending' | 'approved' | 'rejected';

interface ProviderReview {
  id: string;
  rating: number;
  comment?: string | null;
  created_at: string;
}

interface ProviderData {
  id: string;
  email: string;
  role: string;
  status: ProviderStatus;
  country: string;
  created_at: string;
  profile?: {
    name?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    service_type?: string;
  };
  service_areas?: Array<{ state: string; city: string }>;
  documents?: Array<{
    id: string;
    doc_type: string;
    status: DocStatus;
    file_name?: string;
    file_url?: string;
  }>;
  reviews?: ProviderReview[];
  avgRating?: number | null;
}

function buildStatusConfig(es: boolean): Record<ProviderStatus, { bg: string; border: string; color: string; label: string }> {
  return {
    pending:   { bg: '#FFF3CD',  border: C.warning,       color: '#856404',       label: es ? 'En Revisión'  : 'Pending Review' },
    approved:  { bg: '#D1FAE5',  border: C.success,       color: '#065F46',       label: es ? 'Aprobado'     : 'Approved' },
    rejected:  { bg: '#FFE4E6',  border: C.danger,        color: '#9B1C1C',       label: es ? 'Rechazado'    : 'Rejected' },
    suspended: { bg: C.surface2, border: C.line,          color: C.textSecondary, label: es ? 'Suspendido'   : 'Suspended' },
  };
}

const serviceTypeLabel = (type: string | undefined, es: boolean): string => {
  if (!type) return '—';
  const map: Record<string, { en: string; es: string }> = {
    commercial:  { en: 'Commercial',  es: 'Comercial' },
    residential: { en: 'Residential', es: 'Residencial' },
    both:        { en: 'Both',        es: 'Ambos' },
  };
  return es ? (map[type]?.es ?? type) : (map[type]?.en ?? type);
};

export default function ProviderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useLang();
  const es = lang === 'es';
  const STATUS_CONFIG = buildStatusConfig(es);

  const [provider, setProvider] = useState<ProviderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | 'suspend' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [docLoading, setDocLoading] = useState<string | null>(null);

  useEffect(() => { if (id) loadProvider(); }, [id]);

  const loadProvider = async () => {
    setLoading(true);
    try {
      // Get user info from profile tables (no users table required)
      const unifiedUser = await getUserProfile(id);
      if (!unifiedUser) { setLoading(false); return; }

      let profile: ProviderData['profile'];
      if (unifiedUser.role === 'company') {
        const { data: co } = await supabase
          .from('companies')
          .select('company_name, phone, address, city, state, service_type')
          .eq('user_id', id).single();
        if (co) profile = { name: co.company_name, phone: co.phone, address: co.address, city: co.city, state: co.state, service_type: co.service_type };
      } else if (unifiedUser.role === 'independent') {
        const { data: ind } = await supabase
          .from('independents')
          .select('full_name, phone, address, city, state, service_type')
          .eq('user_id', id).single();
        if (ind) profile = { name: ind.full_name, phone: ind.phone, address: ind.address, city: ind.city, state: ind.state, service_type: ind.service_type };
      }

      const [docsRes, areasRes, reviewsRes] = await Promise.all([
        supabase.from('documents').select('id, doc_type, status, file_name, file_url').eq('user_id', id),
        supabase.from('service_areas').select('state, city').eq('provider_id', id),
        supabase.from('reviews').select('id, rating, comment, created_at').eq('provider_id', id).order('created_at', { ascending: false }),
      ]);

      const reviewsList = (reviewsRes.data ?? []) as ProviderReview[];
      const avgRating = reviewsList.length > 0
        ? reviewsList.reduce((sum, r) => sum + r.rating, 0) / reviewsList.length
        : null;

      setProvider({
        ...unifiedUser,
        status: (unifiedUser.status as ProviderStatus) || 'pending',
        created_at: unifiedUser.created_at ?? new Date().toISOString(),
        profile,
        documents: docsRes.data ?? [],
        service_areas: areasRes.data ?? [],
        reviews: reviewsList,
        avgRating,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProviderAction = async () => {
    if (!modalAction || !provider) return;
    setActionLoading(true);
    try {
      const newStatus = modalAction === 'approve' ? 'approved' : modalAction === 'reject' ? 'rejected' : 'suspended';
      const { error: statusErr } = await updateProviderStatus(provider.id, newStatus);
      if (statusErr) throw new Error(statusErr);

      const isApprove = modalAction === 'approve';
      const isSuspend = modalAction === 'suspend';
      const reasonText = modalAction === 'reject' && rejectReason.trim() ? ` ${es ? 'Motivo' : 'Reason'}: ${rejectReason.trim()}.` : '';
      await supabase.from('notifications').insert({
        user_id: provider.id,
        title_en: isApprove ? 'Account Approved' : isSuspend ? 'Account Suspended' : 'Application Not Approved',
        title_es: isApprove ? 'Cuenta Aprobada' : isSuspend ? 'Cuenta Suspendida' : 'Solicitud No Aprobada',
        body_en: isApprove
          ? 'Your account has been approved. You can now browse and apply to jobs.'
          : isSuspend
          ? 'Your account has been suspended. Please contact support for more information.'
          : `Your application was not approved. Please review your documents and resubmit.${reasonText}`,
        body_es: isApprove
          ? 'Tu cuenta ha sido aprobada. Ya puedes explorar y aplicar a trabajos.'
          : isSuspend
          ? 'Tu cuenta ha sido suspendida. Por favor contacta al soporte para más información.'
          : `Tu solicitud no fue aprobada. Por favor revisa tus documentos y vuelve a enviar.${reasonText}`,
        type: 'account_update',
        read: false,
      });

      setProvider((prev) => prev ? { ...prev, status: newStatus as ProviderStatus } : null);
      setModalAction(null);
      setRejectReason('');
      const name = provider.profile?.name ?? provider.email;
      Alert.alert(
        es
          ? (isApprove ? 'Proveedor Aprobado' : isSuspend ? 'Proveedor Suspendido' : 'Proveedor Rechazado')
          : (isApprove ? 'Provider Approved' : isSuspend ? 'Provider Suspended' : 'Provider Rejected'),
        es
          ? `${name} ha sido ${isApprove ? 'aprobado' : isSuspend ? 'suspendido' : 'rechazado'} y notificado.`
          : `${name} has been ${isApprove ? 'approved' : isSuspend ? 'suspended' : 'rejected'} and notified.`,
      );
    } catch (e: any) {
      Alert.alert('Error', e.message ?? (es ? 'Falló la actualización.' : 'Failed to update status.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDocAction = async (docId: string, newStatus: DocStatus) => {
    setDocLoading(docId);
    try {
      const { error } = await supabase.from('documents').update({ status: newStatus, reviewed_at: new Date().toISOString() }).eq('id', docId);
      if (error) throw error;
      setProvider((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          documents: prev.documents?.map((d) => d.id === docId ? { ...d, status: newStatus } : d),
        };
      });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? (es ? 'Error al actualizar documento.' : 'Failed to update document.'));
    } finally {
      setDocLoading(null);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 20, flexDirection: 'row', alignItems: 'center' }}>
          <Feather name="arrow-left" size={20} color={C.textSecondary} />
          <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', marginLeft: 8 }}>{es ? 'Atrás' : 'Back'}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="user-x" size={40} color={C.textMuted} />
          <Text style={{ color: C.textSecondary, fontSize: 15, fontFamily: 'Inter_400Regular', marginTop: 12 }}>
            {es ? 'Proveedor no encontrado' : 'Provider not found'}
          </Text>
        </View>
      </View>
    );
  }

  const sc = STATUS_CONFIG[provider.status] ?? STATUS_CONFIG.pending;
  const displayName = provider.profile?.name ?? provider.email;
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const joinedDate = new Date(provider.created_at).toLocaleDateString(es ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const allDocsApproved = (provider.documents?.length ?? 0) > 0 && provider.documents?.every((d) => d.status === 'approved');

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <Feather name="arrow-left" size={20} color={C.textSecondary} />
          <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', marginLeft: 8 }}>
            {es ? 'Volver a Proveedores' : 'Back to Providers'}
          </Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: C.line }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 56, height: 56, backgroundColor: C.surface2, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginRight: 16, borderWidth: 1, borderColor: C.accent }}>
              <Text style={{ color: C.accent, fontSize: 18, fontFamily: 'Inter_700Bold' }}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.textPrimary, fontSize: 17, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>{displayName}</Text>
              <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                {provider.role.charAt(0).toUpperCase() + provider.role.slice(1)} · {provider.country === 'colombia' ? '🇨🇴 Colombia' : '🇺🇸 USA'}
              </Text>
            </View>
          </View>
          <View style={{ backgroundColor: sc.bg, borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: sc.border }}>
            <Text style={{ color: sc.color, fontSize: 13, fontFamily: 'Inter_600SemiBold', flex: 1 }}>{sc.label}</Text>
            <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
              {es ? 'Desde' : 'Joined'} {joinedDate}
            </Text>
          </View>
        </View>

        {/* Contact info */}
        <View style={{ backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.line }}>
          <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 12 }}>
            {es ? 'Contacto' : 'Contact'}
          </Text>
          {([
            [es ? 'Correo' : 'Email', provider.email],
            [es ? 'Teléfono' : 'Phone', provider.profile?.phone ?? '—'],
            [es ? 'Dirección' : 'Address', provider.profile?.address ?? '—'],
            [es ? 'Ciudad' : 'City', [provider.profile?.city, provider.profile?.state].filter(Boolean).join(', ') || '—'],
            [es ? 'Tipo de Servicio' : 'Service Type', serviceTypeLabel(provider.profile?.service_type, es)],
          ] as [string, string][]).map(([label, value], idx, arr) => (
            <View key={label} style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: idx < arr.length - 1 ? 1 : 0, borderBottomColor: C.line }}>
              <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', width: 80 }}>{label}</Text>
              <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 }}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Service areas */}
        {(provider.service_areas?.length ?? 0) > 0 && (
          <View style={{ backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.line }}>
            <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 12 }}>
              {es ? 'Áreas de Servicio' : 'Service Areas'} ({provider.service_areas?.length})
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {provider.service_areas?.map((area, i) => (
                <View key={i} style={{ backgroundColor: C.surface2, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'center' }}>
                  <Feather name="map-pin" size={10} color={C.textMuted} style={{ marginRight: 4 }} />
                  <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
                    {area.city ? `${area.city}, ${area.state}` : area.state}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Documents */}
        {(provider.documents?.length ?? 0) > 0 && (
          <View style={{ backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.line }}>
            <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 12 }}>
              {es ? 'Documentos' : 'Documents'} ({provider.documents?.length})
            </Text>
            {provider.documents?.map((doc, idx) => {
              const docColor = doc.status === 'approved' ? C.success : doc.status === 'rejected' ? C.danger : C.warning;
              const iconName = doc.status === 'approved' ? 'check-circle' : doc.status === 'rejected' ? 'x-circle' : 'clock';
              const isDocLoading = docLoading === doc.id;
              return (
                <View key={doc.id} style={{ paddingVertical: 10, borderBottomWidth: idx < (provider.documents?.length ?? 0) - 1 ? 1 : 0, borderBottomColor: C.line }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: doc.status === 'pending' ? 8 : 0 }}>
                    <Feather name={iconName as any} size={15} color={docColor} style={{ marginRight: 10 }} />
                    <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 }}>
                      {doc.file_name ?? doc.doc_type}
                    </Text>
                    {isDocLoading ? (
                      <ActivityIndicator size="small" color={C.accent} />
                    ) : (
                      <Text style={{ color: docColor, fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>
                        {es
                          ? (doc.status === 'approved' ? 'Aprobado' : doc.status === 'rejected' ? 'Rechazado' : 'Pendiente')
                          : (doc.status === 'approved' ? 'Approved' : doc.status === 'rejected' ? 'Rejected' : 'Pending')}
                      </Text>
                    )}
                  </View>
                  {doc.status === 'pending' && !isDocLoading && (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => handleDocAction(doc.id, 'approved')}
                        style={{ flex: 1, height: 32, backgroundColor: `${C.success}15`, borderWidth: 1, borderColor: `${C.success}40`, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
                        activeOpacity={0.85}
                      >
                        <Feather name="check" size={12} color={C.success} style={{ marginRight: 4 }} />
                        <Text style={{ color: C.success, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>{es ? 'Aprobar' : 'Approve'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDocAction(doc.id, 'rejected')}
                        style={{ flex: 1, height: 32, backgroundColor: `${C.danger}15`, borderWidth: 1, borderColor: `${C.danger}40`, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
                        activeOpacity={0.85}
                      >
                        <Feather name="x" size={12} color={C.danger} style={{ marginRight: 4 }} />
                        <Text style={{ color: C.danger, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>{es ? 'Rechazar' : 'Reject'}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Reviews */}
        {(provider.reviews?.length ?? 0) > 0 && (
          <View style={{ backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.line }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
                {es ? 'Calificaciones' : 'Reviews'} ({provider.reviews?.length})
              </Text>
              {provider.avgRating != null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Feather name="star" size={13} color="#F59E0B" />
                  <Text style={{ color: '#F59E0B', fontSize: 13, fontFamily: 'Inter_700Bold' }}>
                    {provider.avgRating.toFixed(1)}
                  </Text>
                </View>
              )}
            </View>
            {provider.reviews?.map((review, idx) => (
              <View key={review.id} style={{ paddingVertical: 10, borderBottomWidth: idx < (provider.reviews?.length ?? 0) - 1 ? 1 : 0, borderBottomColor: C.line }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Feather key={star} name="star" size={12} color={star <= review.rating ? '#F59E0B' : C.line} />
                    ))}
                  </View>
                  <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular' }}>
                    {new Date(review.created_at).toLocaleDateString(es ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
                {review.comment ? (
                  <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 }}>
                    {review.comment}
                  </Text>
                ) : (
                  <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', fontStyle: 'italic' }}>
                    {es ? 'Sin comentario' : 'No comment'}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Action buttons */}
        {provider.status === 'pending' && (
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <TouchableOpacity
              onPress={() => setModalAction('approve')}
              style={{ flex: 1, backgroundColor: C.success, borderRadius: 12, paddingVertical: 16, alignItems: 'center' }}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>{es ? 'Aprobar Proveedor' : 'Approve Provider'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setModalAction('reject')}
              style={{ flex: 1, backgroundColor: '#FFE4E6', borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: C.danger }}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#9B1C1C', fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>{es ? 'Rechazar' : 'Reject'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {allDocsApproved && provider.status !== 'approved' && (
          <TouchableOpacity
            onPress={() => setModalAction('approve')}
            style={{ backgroundColor: C.success, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 12 }}
            activeOpacity={0.85}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
              {es ? 'Todos los docs aprobados — Aprobar Proveedor' : 'All docs approved — Approve Provider'}
            </Text>
          </TouchableOpacity>
        )}

        {provider.status === 'approved' && (
          <View>
            <View style={{ backgroundColor: '#D1FAE5', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.success, marginBottom: 12 }}>
              <Feather name="check-circle" size={18} color={C.success} style={{ marginRight: 10 }} />
              <Text style={{ color: C.success, fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 }}>
                {es ? 'Este proveedor está aprobado y activo en la plataforma.' : 'This provider is approved and active on the platform.'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setModalAction('suspend')}
              style={{ backgroundColor: C.surface2, borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: C.warning, flexDirection: 'row', justifyContent: 'center' }}
              activeOpacity={0.85}
            >
              <Feather name="slash" size={15} color={C.warning} style={{ marginRight: 8 }} />
              <Text style={{ color: C.warning, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                {es ? 'Suspender Proveedor' : 'Suspend Provider'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {provider.status === 'rejected' && (
          <View style={{ backgroundColor: '#FFE4E6', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.danger }}>
            <Feather name="x-circle" size={18} color={C.danger} style={{ marginRight: 10 }} />
            <Text style={{ color: C.danger, fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 }}>
              {es ? 'La solicitud de este proveedor ha sido rechazada.' : "This provider's application has been rejected."}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Confirm modal — conditionally mounted so the transparent overlay never blocks touches when hidden */}
      {modalAction !== null && (
      <Modal visible={true} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(13,27,42,0.7)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: C.surface, borderRadius: 24, padding: 24, width: '100%', borderWidth: 1, borderColor: C.line }}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{
                width: 56, height: 56, borderRadius: 28,
                backgroundColor: modalAction === 'approve' ? '#D1FAE5' : modalAction === 'suspend' ? '#FFF3CD' : '#FFE4E6',
                alignItems: 'center', justifyContent: 'center', marginBottom: 12,
              }}>
                <Feather
                  name={modalAction === 'approve' ? 'check-circle' : modalAction === 'suspend' ? 'slash' : 'x-circle'}
                  size={24}
                  color={modalAction === 'approve' ? C.success : modalAction === 'suspend' ? C.warning : C.danger}
                />
              </View>
              <Text style={{ color: C.textPrimary, fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 8 }}>
                {es
                  ? (modalAction === 'approve' ? 'Aprobar Proveedor' : modalAction === 'suspend' ? 'Suspender Proveedor' : 'Rechazar Proveedor')
                  : (modalAction === 'approve' ? 'Approve Provider' : modalAction === 'suspend' ? 'Suspend Provider' : 'Reject Provider')}
              </Text>
              <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 }}>
                {es
                  ? (modalAction === 'approve'
                      ? `${displayName} será notificado y podrá comenzar a aceptar trabajos.`
                      : modalAction === 'suspend'
                      ? `${displayName} será suspendido y no podrá acceder a la plataforma.`
                      : `${displayName} será notificado y podrá volver a enviar su solicitud.`)
                  : (modalAction === 'approve'
                      ? `${displayName} will be notified and can start accepting jobs.`
                      : modalAction === 'suspend'
                      ? `${displayName} will be suspended and cannot access the platform.`
                      : `${displayName} will be notified and can resubmit their application.`)}
              </Text>
            </View>

            {modalAction === 'reject' && (
              <TextInput
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholder={es ? 'Motivo del rechazo (opcional)...' : 'Reason for rejection (optional)...'}
                placeholderTextColor={C.textMuted}
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: C.surface2,
                  borderRadius: 12,
                  padding: 12,
                  color: C.textPrimary,
                  fontSize: 13,
                  fontFamily: 'Inter_400Regular',
                  borderWidth: 1,
                  borderColor: C.line,
                  marginBottom: 16,
                  textAlignVertical: 'top',
                  minHeight: 80,
                }}
              />
            )}

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => { setModalAction(null); setRejectReason(''); }}
                disabled={actionLoading}
                style={{ flex: 1, backgroundColor: C.surface2, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: C.line }}
              >
                <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>{es ? 'Cancelar' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleProviderAction}
                disabled={actionLoading}
                style={{
                  flex: 1,
                  backgroundColor: modalAction === 'approve' ? C.success : modalAction === 'suspend' ? C.warning : C.danger,
                  borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: actionLoading ? 0.6 : 1,
                }}
                activeOpacity={0.85}
              >
                {actionLoading ? (
                  <ActivityIndicator color={modalAction === 'approve' ? '#000' : '#fff'} size="small" />
                ) : (
                  <Text style={{ color: modalAction === 'approve' ? '#000' : '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                    {es
                      ? (modalAction === 'approve' ? 'Aprobar' : modalAction === 'suspend' ? 'Suspender' : 'Rechazar')
                      : (modalAction === 'approve' ? 'Approve' : modalAction === 'suspend' ? 'Suspend' : 'Reject')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      )}
    </View>
  );
}
