import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, ActivityIndicator, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useLang } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { C } from '@/constants/theme';

type ProviderStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
type DocStatus = 'pending' | 'approved' | 'rejected';

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
}

function buildStatusConfig(es: boolean): Record<ProviderStatus, { bg: string; border: string; color: string; label: string }> {
  return {
    pending:   { bg: '#2a1e0a',  border: C.warning,       color: C.warning,       label: es ? 'En Revisión'  : 'Pending Review' },
    approved:  { bg: '#0d2d1a',  border: C.success,       color: C.success,       label: es ? 'Aprobado'     : 'Approved' },
    rejected:  { bg: '#2d0d0d',  border: C.danger,        color: C.danger,        label: es ? 'Rechazado'    : 'Rejected' },
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
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [docLoading, setDocLoading] = useState<string | null>(null);

  useEffect(() => { if (id) loadProvider(); }, [id]);

  const loadProvider = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.from('users').select('*').eq('id', id).single();
      if (!userData) { setLoading(false); return; }

      let profile: ProviderData['profile'];
      if (userData.role === 'company') {
        const { data: co } = await supabase
          .from('companies')
          .select('company_name, phone, address, city, state, service_type')
          .eq('user_id', id).single();
        if (co) profile = { name: co.company_name, phone: co.phone, address: co.address, city: co.city, state: co.state, service_type: co.service_type };
      } else if (userData.role === 'independent') {
        const { data: ind } = await supabase
          .from('independents')
          .select('full_name, phone, address, city, state, service_type')
          .eq('user_id', id).single();
        if (ind) profile = { name: ind.full_name, phone: ind.phone, address: ind.address, city: ind.city, state: ind.state, service_type: ind.service_type };
      }

      const [docsRes, areasRes] = await Promise.all([
        supabase.from('documents').select('id, doc_type, status, file_name, file_url').eq('user_id', id),
        supabase.from('service_areas').select('state, city').eq('provider_id', id),
      ]);

      setProvider({
        ...userData,
        profile,
        documents: docsRes.data ?? [],
        service_areas: areasRes.data ?? [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProviderAction = async () => {
    if (!modalAction || !provider) return;
    setActionLoading(true);
    try {
      const newStatus = modalAction === 'approve' ? 'approved' : 'rejected';
      const { error } = await supabase.from('users').update({ status: newStatus }).eq('id', provider.id);
      if (error) throw error;

      const isApprove = modalAction === 'approve';
      const reasonText = !isApprove && rejectReason.trim() ? ` ${es ? 'Motivo' : 'Reason'}: ${rejectReason.trim()}.` : '';
      await supabase.from('notifications').insert({
        user_id: provider.id,
        title_en: isApprove ? 'Account Approved' : 'Application Not Approved',
        title_es: isApprove ? 'Cuenta Aprobada' : 'Solicitud No Aprobada',
        body_en: isApprove
          ? 'Your account has been approved. You can now browse and apply to jobs.'
          : `Your application was not approved. Please review your documents and resubmit.${reasonText}`,
        body_es: isApprove
          ? 'Tu cuenta ha sido aprobada. Ya puedes explorar y aplicar a trabajos.'
          : `Tu solicitud no fue aprobada. Por favor revisa tus documentos y vuelve a enviar.${reasonText}`,
        type: 'account_update',
        read: false,
      });

      setProvider((prev) => prev ? { ...prev, status: newStatus as ProviderStatus } : null);
      setModalAction(null);
      setRejectReason('');
      const name = provider.profile?.name ?? provider.email;
      Alert.alert(
        es ? (isApprove ? 'Proveedor Aprobado' : 'Proveedor Rechazado') : (isApprove ? 'Provider Approved' : 'Provider Rejected'),
        es
          ? `${name} ha sido ${isApprove ? 'aprobado' : 'rechazado'} y notificado.`
          : `${name} has been ${isApprove ? 'approved' : 'rejected'} and notified.`,
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
              <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2, textTransform: 'capitalize' }}>
                {provider.role} · {provider.country === 'colombia' ? '🇨🇴 Colombia' : '🇺🇸 USA'}
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

        {/* Action buttons */}
        {provider.status === 'pending' && (
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <TouchableOpacity
              onPress={() => setModalAction('approve')}
              style={{ flex: 1, backgroundColor: C.success, borderRadius: 12, paddingVertical: 16, alignItems: 'center' }}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#000', fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>{es ? 'Aprobar Proveedor' : 'Approve Provider'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setModalAction('reject')}
              style={{ flex: 1, backgroundColor: '#2d0d0d', borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: C.danger }}
              activeOpacity={0.85}
            >
              <Text style={{ color: C.danger, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>{es ? 'Rechazar' : 'Reject'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {allDocsApproved && provider.status !== 'approved' && provider.status !== 'pending' && (
          <TouchableOpacity
            onPress={() => setModalAction('approve')}
            style={{ backgroundColor: C.success, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 12 }}
            activeOpacity={0.85}
          >
            <Text style={{ color: '#000', fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
              {es ? 'Todos los docs aprobados — Aprobar Proveedor' : 'All docs approved — Approve Provider'}
            </Text>
          </TouchableOpacity>
        )}

        {provider.status === 'approved' && (
          <View style={{ backgroundColor: '#0d2d1a', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.success }}>
            <Feather name="check-circle" size={18} color={C.success} style={{ marginRight: 10 }} />
            <Text style={{ color: C.success, fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 }}>
              {es ? 'Este proveedor está aprobado y activo en la plataforma.' : 'This provider is approved and active on the platform.'}
            </Text>
          </View>
        )}

        {provider.status === 'rejected' && (
          <View style={{ backgroundColor: '#2d0d0d', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.danger }}>
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
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: C.surface, borderRadius: 24, padding: 24, width: '100%', borderWidth: 1, borderColor: C.line }}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: modalAction === 'approve' ? '#0d2d1a' : '#2d0d0d', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Feather name={modalAction === 'approve' ? 'check-circle' : 'x-circle'} size={24} color={modalAction === 'approve' ? C.success : C.danger} />
              </View>
              <Text style={{ color: C.textPrimary, fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 8 }}>
                {es
                  ? (modalAction === 'approve' ? 'Aprobar Proveedor' : 'Rechazar Proveedor')
                  : (modalAction === 'approve' ? 'Approve Provider' : 'Reject Provider')}
              </Text>
              <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 }}>
                {es
                  ? (modalAction === 'approve'
                      ? `${displayName} será notificado y podrá comenzar a aceptar trabajos.`
                      : `${displayName} será notificado y podrá volver a enviar su solicitud.`)
                  : (modalAction === 'approve'
                      ? `${displayName} will be notified and can start accepting jobs.`
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
                style={{ flex: 1, backgroundColor: modalAction === 'approve' ? C.success : C.danger, borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: actionLoading ? 0.6 : 1 }}
                activeOpacity={0.85}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                    {es ? (modalAction === 'approve' ? 'Aprobar' : 'Rechazar') : (modalAction === 'approve' ? 'Approve' : 'Reject')}
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
