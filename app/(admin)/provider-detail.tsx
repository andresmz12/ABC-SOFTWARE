import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import StatusBadge from '@/components/ui/StatusBadge';
import { Feather } from '@expo/vector-icons';
import { C } from '@/constants/theme';

function ConfirmModal({ visible, action, name, onConfirm, onCancel }: {
  visible: boolean;
  action: 'approve' | 'reject';
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isApprove = action === 'approve';
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 24, padding: 28, width: '100%' }}>
          <View style={{
            width: 56, height: 56,
            backgroundColor: isApprove ? `${C.success}20` : `${C.danger}20`,
            borderRadius: 28,
            alignItems: 'center', justifyContent: 'center',
            alignSelf: 'center',
            marginBottom: 20,
          }}>
            <Feather name={isApprove ? 'check-circle' : 'x-circle'} size={28} color={isApprove ? C.success : C.danger} />
          </View>
          <Text style={{ color: C.textPrimary, fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center', marginBottom: 12 }}>
            {isApprove ? 'Approve Provider' : 'Reject Provider'}
          </Text>
          <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
            {isApprove
              ? `${name} will be notified and can start accepting jobs on the platform.`
              : `${name} will be notified and asked to resubmit with corrected documents.`}
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={onCancel} style={{ flex: 1, height: 48, backgroundColor: C.surface2, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: C.textSecondary, fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              style={{ flex: 1, height: 48, backgroundColor: isApprove ? C.success : C.danger, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>{isApprove ? 'Approve' : 'Reject'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ProviderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | null>(null);

  return (
    <ScreenWrapper scroll className="px-6">
      {/* Back */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 24, paddingBottom: 8 }}
      >
        <Feather name="chevron-left" size={20} color={C.textPrimary} />
        <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_400Regular', marginLeft: 4 }}>Back</Text>
      </TouchableOpacity>

      <View style={{ paddingTop: 8, paddingBottom: 24 }}>
        <Text style={{ color: C.textPrimary, fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>Provider Detail</Text>
        <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 4 }}>ID: {id}</Text>
      </View>

      {/* Placeholder — real data would come from Supabase */}
      <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 24, marginBottom: 24 }}>
        <View style={{ width: 64, height: 64, backgroundColor: `${C.accent}20`, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Feather name="user" size={28} color={C.accent} />
        </View>
        <Text style={{ color: C.textPrimary, fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 4 }}>Provider Profile</Text>
        <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular' }}>Full details will load from Supabase</Text>
        <View style={{ marginTop: 16 }}>
          <StatusBadge status="pending" />
        </View>
      </View>

      {/* Action buttons */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 40 }}>
        <TouchableOpacity
          onPress={() => setModalAction('approve')}
          style={{ flex: 1, height: 56, backgroundColor: C.success, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
        >
          <Feather name="check" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{ color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setModalAction('reject')}
          style={{ flex: 1, height: 56, backgroundColor: `${C.danger}15`, borderWidth: 1, borderColor: `${C.danger}50`, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
        >
          <Feather name="x" size={18} color={C.danger} style={{ marginRight: 8 }} />
          <Text style={{ color: C.danger, fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>Reject</Text>
        </TouchableOpacity>
      </View>

      <ConfirmModal
        visible={modalAction !== null}
        action={modalAction ?? 'approve'}
        name="Provider"
        onConfirm={() => { setModalAction(null); Alert.alert('Done', `Provider ${modalAction === 'approve' ? 'approved' : 'rejected'}.`); }}
        onCancel={() => setModalAction(null)}
      />
    </ScreenWrapper>
  );
}
