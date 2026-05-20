import { View, Text, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import { ADMIN_DOC_QUEUE } from '@/constants/demoData';
import type { AdminDocQueue } from '@/constants/demoData';

const DOC_STATUS: Record<string, { icon: string; bg: string; text: string }> = {
  approved: { icon: '✅', bg: 'bg-green-50',  text: 'text-green-700' },
  rejected: { icon: '❌', bg: 'bg-red-50',    text: 'text-red-700' },
  pending:  { icon: '⏳', bg: 'bg-yellow-50', text: 'text-yellow-700' },
};

function QueueCard({ entry }: { entry: AdminDocQueue }) {
  const router = useRouter();
  const pendingCount = entry.docs.filter((d) => d.status === 'pending').length;

  return (
    <View
      className="bg-white rounded-2xl p-4 mb-3"
      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 5, elevation: 2 }}
    >
      {/* Provider header */}
      <View className="flex-row items-center mb-3">
        <View className="w-10 h-10 bg-primary rounded-full items-center justify-center mr-3">
          <Text className="text-white font-body-bold text-sm">
            {entry.providerName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-text-main font-body-bold text-sm">{entry.providerName}</Text>
          <Text className="text-text-muted font-body text-xs capitalize">{entry.type} · Submitted {entry.submittedDate}</Text>
        </View>
        {pendingCount > 0 && (
          <View className="bg-yellow-100 px-2 py-0.5 rounded-full">
            <Text className="text-yellow-700 text-xs font-body-bold">{pendingCount} pending</Text>
          </View>
        )}
      </View>

      {/* Doc list */}
      <View className="mb-3">
        {entry.docs.map((doc, idx) => {
          const meta = DOC_STATUS[doc.status];
          return (
            <View
              key={idx}
              className={`flex-row items-center py-2 ${idx < entry.docs.length - 1 ? 'border-b border-gray-50' : ''}`}
            >
              <Text className="text-sm mr-2">{meta.icon}</Text>
              <Text className="text-text-main font-body text-xs flex-1">{doc.label}</Text>
              <View className={`${meta.bg} px-2 py-0.5 rounded-full`}>
                <Text className={`${meta.text} text-xs font-body-medium capitalize`}>{doc.status}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Actions */}
      <View className="flex-row gap-2">
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/(admin)/provider-detail', params: { id: entry.providerId } } as any)}
          className="flex-1 bg-primary rounded-xl py-2.5 items-center"
        >
          <Text className="text-white font-body-bold text-xs">Review Documents</Text>
        </TouchableOpacity>
        {pendingCount > 0 && (
          <TouchableOpacity
            onPress={() => Alert.alert('Approve All', `Approve all pending docs for ${entry.providerName}?`, [{ text: 'Cancel' }, { text: 'Approve All', style: 'default' }])}
            className="flex-1 bg-green-50 border border-green-300 rounded-xl py-2.5 items-center"
          >
            <Text className="text-green-700 font-body-bold text-xs">Approve All</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function AdminDocuments() {
  const pendingTotal = ADMIN_DOC_QUEUE.reduce((sum, e) => sum + e.docs.filter((d) => d.status === 'pending').length, 0);

  return (
    <ScreenWrapper>
      <View className="px-5 pt-8 pb-4">
        <Text className="text-primary text-3xl font-heading">Document Review</Text>
        <Text className="text-text-muted font-body text-sm mt-0.5">
          {pendingTotal} document{pendingTotal !== 1 ? 's' : ''} awaiting review
        </Text>
      </View>

      {/* Summary banner */}
      <View className="mx-5 mb-4 bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex-row items-center">
        <Text className="text-2xl mr-3">📋</Text>
        <View className="flex-1">
          <Text className="text-yellow-800 font-body-bold text-sm">{ADMIN_DOC_QUEUE.length} providers in queue</Text>
          <Text className="text-yellow-700 font-body text-xs mt-0.5">{pendingTotal} total documents need a decision</Text>
        </View>
      </View>

      <FlatList
        data={ADMIN_DOC_QUEUE}
        keyExtractor={(item) => item.providerId}
        renderItem={({ item }) => <QueueCard entry={item} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
      />
    </ScreenWrapper>
  );
}
