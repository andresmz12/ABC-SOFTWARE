import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import { ADMIN_PROVIDERS, ADMIN_DOC_QUEUE } from '@/constants/demoData';
import type { AdminProvider } from '@/constants/demoData';

const STATUS_META: Record<AdminProvider['status'], { label: string; bg: string; text: string; border: string }> = {
  pending:   { label: 'Pending Review', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  approved:  { label: 'Approved',       bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  rejected:  { label: 'Rejected',       bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' },
  suspended: { label: 'Suspended',      bg: 'bg-gray-100',  text: 'text-gray-600',   border: 'border-gray-200' },
};

const DOC_STATUS_META: Record<string, { icon: string; bg: string; text: string }> = {
  approved: { icon: '✅', bg: 'bg-green-50',  text: 'text-green-700' },
  rejected: { icon: '❌', bg: 'bg-red-50',    text: 'text-red-700' },
  pending:  { icon: '⏳', bg: 'bg-yellow-50', text: 'text-yellow-700' },
};

function ConfirmModal({
  visible,
  action,
  providerName,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  action: 'approve' | 'reject';
  providerName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isApprove = action === 'approve';
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/40 items-center justify-center px-8">
        <View className="bg-white rounded-3xl p-6 w-full" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 12 }}>
          <Text className="text-3xl text-center mb-3">{isApprove ? '✅' : '❌'}</Text>
          <Text className="text-text-main font-heading text-xl text-center mb-2">
            {isApprove ? 'Approve Provider' : 'Reject Provider'}
          </Text>
          <Text className="text-text-muted font-body text-sm text-center leading-5 mb-6">
            {isApprove
              ? `${providerName} will be notified and can start accepting jobs on the platform.`
              : `${providerName} will be notified and can resubmit their application with corrected documents.`}
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={onCancel}
              className="flex-1 border border-gray-200 rounded-2xl py-3 items-center"
            >
              <Text className="text-text-muted font-body-bold text-sm">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              className={`flex-1 rounded-2xl py-3 items-center ${isApprove ? 'bg-green-500' : 'bg-red-500'}`}
            >
              <Text className="text-white font-body-bold text-sm">
                {isApprove ? 'Approve' : 'Reject'}
              </Text>
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
  const [status, setStatus] = useState<AdminProvider['status'] | null>(null);

  const provider = ADMIN_PROVIDERS.find((p) => p.id === id);
  const docEntry = ADMIN_DOC_QUEUE.find((e) => e.providerId === id);

  if (!provider) {
    return (
      <ScreenWrapper>
        <View className="flex-1 items-center justify-center">
          <Text className="text-text-muted font-body">Provider not found</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const currentStatus = status ?? provider.status;
  const meta = STATUS_META[currentStatus];
  const initials = provider.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  function handleConfirm() {
    if (!modalAction) return;
    setStatus(modalAction === 'approve' ? 'approved' : 'rejected');
    setModalAction(null);
    Alert.alert(
      modalAction === 'approve' ? 'Provider Approved' : 'Provider Rejected',
      `${provider!.name} has been ${modalAction === 'approve' ? 'approved' : 'rejected'} and notified.`,
    );
  }

  return (
    <ScreenWrapper scroll className="px-5">
      {/* Back button */}
      <TouchableOpacity onPress={() => router.back()} className="pt-8 pb-4 flex-row items-center">
        <Text className="text-primary font-body-medium text-sm">← Back to Providers</Text>
      </TouchableOpacity>

      {/* Provider header card */}
      <View
        className="bg-white rounded-2xl p-5 mb-4"
        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3 }}
      >
        <View className="flex-row items-center mb-4">
          <View className="w-16 h-16 bg-primary rounded-full items-center justify-center mr-4">
            <Text className="text-white text-2xl font-heading">{initials}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-text-main font-body-bold text-lg" numberOfLines={1}>{provider.name}</Text>
            <Text className="text-text-muted font-body text-sm capitalize">{provider.type} · {provider.location}</Text>
            <Text className="text-text-muted font-body text-xs mt-0.5">{provider.serviceType}</Text>
          </View>
        </View>

        {/* Status badge */}
        <View className={`${meta.bg} border ${meta.border} rounded-xl px-4 py-2.5 flex-row items-center`}>
          <Text className={`${meta.text} font-body-bold text-sm flex-1`}>{meta.label}</Text>
          <Text className="text-text-muted font-body text-xs">Joined {provider.joinedDate}</Text>
        </View>
      </View>

      {/* Contact info */}
      <View
        className="bg-white rounded-2xl p-4 mb-4"
        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
      >
        <Text className="text-text-main font-body-bold text-sm mb-3">Contact Information</Text>
        <View className="flex-row items-center mb-2">
          <Text className="text-text-muted font-body text-xs w-16">Email</Text>
          <Text className="text-text-main font-body text-sm flex-1">{provider.email}</Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-text-muted font-body text-xs w-16">Phone</Text>
          <Text className="text-text-main font-body text-sm flex-1">{provider.phone}</Text>
        </View>
      </View>

      {/* Documents */}
      {docEntry && (
        <View
          className="bg-white rounded-2xl p-4 mb-4"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
        >
          <Text className="text-text-main font-body-bold text-sm mb-3">
            Submitted Documents ({docEntry.docs.length})
          </Text>
          {docEntry.docs.map((doc, idx) => {
            const dm = DOC_STATUS_META[doc.status];
            return (
              <View
                key={idx}
                className={`flex-row items-center py-2.5 ${idx < docEntry.docs.length - 1 ? 'border-b border-gray-50' : ''}`}
              >
                <Text className="mr-2.5">{dm.icon}</Text>
                <Text className="text-text-main font-body text-sm flex-1">{doc.label}</Text>
                <View className={`${dm.bg} px-2 py-0.5 rounded-full`}>
                  <Text className={`${dm.text} text-xs font-body-medium capitalize`}>{doc.status}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Action buttons — only show for pending */}
      {currentStatus === 'pending' && (
        <View className="flex-row gap-3 mb-4">
          <TouchableOpacity
            onPress={() => setModalAction('approve')}
            className="flex-1 bg-green-500 rounded-2xl py-4 items-center"
            style={{ shadowColor: '#22c55e', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 }}
          >
            <Text className="text-white font-body-bold text-sm">✓ Approve Provider</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setModalAction('reject')}
            className="flex-1 bg-red-50 border border-red-300 rounded-2xl py-4 items-center"
          >
            <Text className="text-red-600 font-body-bold text-sm">✕ Reject</Text>
          </TouchableOpacity>
        </View>
      )}

      {currentStatus === 'approved' && (
        <View className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4 flex-row items-center">
          <Text className="text-2xl mr-3">✅</Text>
          <Text className="text-green-700 font-body-bold text-sm flex-1">This provider is approved and active on the platform.</Text>
        </View>
      )}

      {currentStatus === 'rejected' && (
        <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 flex-row items-center">
          <Text className="text-2xl mr-3">❌</Text>
          <Text className="text-red-700 font-body-bold text-sm flex-1">This provider's application has been rejected.</Text>
        </View>
      )}

      <View className="h-8" />

      <ConfirmModal
        visible={modalAction !== null}
        action={modalAction ?? 'approve'}
        providerName={provider.name}
        onConfirm={handleConfirm}
        onCancel={() => setModalAction(null)}
      />
    </ScreenWrapper>
  );
}
