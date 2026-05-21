import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { C } from '@/constants/theme';

type ProviderStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

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
    city?: string;
    state?: string;
  };
  documents?: Array<{
    id: string;
    doc_type: string;
    status: string;
    file_name?: string;
  }>;
}

const STATUS_CONFIG: Record<ProviderStatus, { bg: string; border: string; color: string; label: string }> = {
  pending:   { bg: '#2a1e0a', border: C.warning,  color: C.warning,  label: 'Pending Review' },
  approved:  { bg: '#0d2d1a', border: C.success,  color: C.success,  label: 'Approved' },
  rejected:  { bg: '#2d0d0d', border: C.danger,   color: C.danger,   label: 'Rejected' },
  suspended: { bg: C.surface2, border: C.line,    color: C.textSecondary, label: 'Suspended' },
};

export default function ProviderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [provider, setProvider] = useState<ProviderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { if (id) loadProvider(); }, [id]);

  const loadProvider = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.from('users').select('*').eq('id', id).single();
      if (!userData) { setLoading(false); return; }

      let profile: ProviderData['profile'];
      if (userData.role === 'company') {
        const { data: co } = await supabase
          .from('companies').select('company_name, phone, city, state').eq('user_id', id).single();
        if (co) profile = { name: co.company_name, phone: co.phone, city: co.city, state: co.state };
      } else if (userData.role === 'independent') {
        const { data: ind } = await supabase
          .from('independents').select('full_name, phone, city, state').eq('user_id', id).single();
        if (ind) profile = { name: ind.full_name, phone: ind.phone, city: ind.city, state: ind.state };
      }

      const { data: docs } = await supabase
        .from('documents').select('id, doc_type, status, file_name').eq('user_id', id);

      setProvider({ ...userData, profile, documents: docs ?? [] });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!modalAction || !provider) return;
    setActionLoading(true);
    try {
      const newStatus = modalAction === 'approve' ? 'approved' : 'rejected';
      const { error } = await supabase.from('users').update({ status: newStatus }).eq('id', provider.id);
      if (error) throw error;

      const isApprove = modalAction === 'approve';
      await supabase.from('notifications').insert({
        user_id: provider.id,
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

      setProvider((prev) => prev ? { ...prev, status: newStatus as ProviderStatus } : null);
      setModalAction(null);
      Alert.alert(
        isApprove ? 'Provider Approved' : 'Provider Rejected',
        `${provider.profile?.name ?? provider.email} has been ${isApprove ? 'approved' : 'rejected'} and notified.`,
      );
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to update status.');
    } finally {
      setActionLoading(false);
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
          <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', marginLeft: 8 }}>Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="user-x" size={40} color={C.textMuted} />
          <Text style={{ color: C.textSecondary, fontSize: 15, fontFamily: 'Inter_400Regular', marginTop: 12 }}>
            Provider not found
          </Text>
        </View>
      </View>
    );
  }

  const sc = STATUS_CONFIG[provider.status] ?? STATUS_CONFIG.pending;
  const displayName = provider.profile?.name ?? provider.email;
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const joinedDate = new Date(provider.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}
        >
          <Feather name="arrow-left" size={20} color={C.textSecondary} />
          <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', marginLeft: 8 }}>
            Back to Providers
          </Text>
        </TouchableOpacity>

        {/* Provider header */}
        <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: C.line }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{
              width: 56,
              height: 56,
              backgroundColor: C.surface2,
              borderRadius: 28,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 16,
              borderWidth: 1,
              borderColor: C.accent,
            }}>
              <Text style={{ color: C.accent, fontSize: 18, fontFamily: 'Inter_700Bold' }}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.textPrimary, fontSize: 17, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2, textTransform: 'capitalize' }}>
                {provider.role} · {provider.country}
              </Text>
            </View>
          </View>

          <View style={{ backgroundColor: sc.bg, borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: sc.border }}>
            <Text style={{ color: sc.color, fontSize: 13, fontFamily: 'Inter_600SemiBold', flex: 1 }}>{sc.label}</Text>
            <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' }}>Joined {joinedDate}</Text>
          </View>
        </View>

        {/* Contact info */}
        <View style={{ backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.line }}>
          <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 12 }}>Contact</Text>
          {[
            ['Email', provider.email],
            ['Phone', provider.profile?.phone ?? '—'],
            ['City', [provider.profile?.city, provider.profile?.state].filter(Boolean).join(', ') || '—'],
          ].map(([label, value], idx, arr) => (
            <View key={label} style={{
              flexDirection: 'row',
              paddingVertical: 8,
              borderBottomWidth: idx < arr.length - 1 ? 1 : 0,
              borderBottomColor: C.line,
            }}>
              <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', width: 56 }}>{label}</Text>
              <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 }}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Documents */}
        {(provider.documents?.length ?? 0) > 0 && (
          <View style={{ backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.line }}>
            <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 12 }}>
              Documents ({provider.documents?.length})
            </Text>
            {provider.documents?.map((doc, idx) => {
              const docColor = doc.status === 'approved' ? C.success : doc.status === 'rejected' ? C.danger : C.warning;
              const iconName = doc.status === 'approved' ? 'check-circle' : doc.status === 'rejected' ? 'x-circle' : 'clock';
              return (
                <View key={doc.id} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 10,
                  borderBottomWidth: idx < (provider.documents?.length ?? 0) - 1 ? 1 : 0,
                  borderBottomColor: C.line,
                }}>
                  <Feather name={iconName as any} size={15} color={docColor} style={{ marginRight: 10 }} />
                  <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 }}>
                    {doc.file_name ?? doc.doc_type}
                  </Text>
                  <Text style={{ color: docColor, fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'capitalize' }}>
                    {doc.status}
                  </Text>
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
              <Text style={{ color: '#000', fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setModalAction('reject')}
              style={{ flex: 1, backgroundColor: '#2d0d0d', borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: C.danger }}
              activeOpacity={0.85}
            >
              <Text style={{ color: C.danger, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {provider.status === 'approved' && (
          <View style={{ backgroundColor: '#0d2d1a', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.success }}>
            <Feather name="check-circle" size={18} color={C.success} style={{ marginRight: 10 }} />
            <Text style={{ color: C.success, fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 }}>
              This provider is approved and active on the platform.
            </Text>
          </View>
        )}

        {provider.status === 'rejected' && (
          <View style={{ backgroundColor: '#2d0d0d', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.danger }}>
            <Feather name="x-circle" size={18} color={C.danger} style={{ marginRight: 10 }} />
            <Text style={{ color: C.danger, fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 }}>
              This provider's application has been rejected.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Confirm modal */}
      <Modal visible={modalAction !== null} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: C.surface, borderRadius: 24, padding: 24, width: '100%', borderWidth: 1, borderColor: C.line }}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: modalAction === 'approve' ? '#0d2d1a' : '#2d0d0d',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}>
                <Feather
                  name={modalAction === 'approve' ? 'check-circle' : 'x-circle'}
                  size={24}
                  color={modalAction === 'approve' ? C.success : C.danger}
                />
              </View>
              <Text style={{ color: C.textPrimary, fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 8 }}>
                {modalAction === 'approve' ? 'Approve Provider' : 'Reject Provider'}
              </Text>
              <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 }}>
                {modalAction === 'approve'
                  ? `${displayName} will be notified and can start accepting jobs.`
                  : `${displayName} will be notified and can resubmit their application.`}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setModalAction(null)}
                disabled={actionLoading}
                style={{ flex: 1, backgroundColor: C.surface2, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: C.line }}
              >
                <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirm}
                disabled={actionLoading}
                style={{
                  flex: 1,
                  backgroundColor: modalAction === 'approve' ? C.success : C.danger,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                  opacity: actionLoading ? 0.6 : 1,
                }}
                activeOpacity={0.85}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                    {modalAction === 'approve' ? 'Approve' : 'Reject'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
