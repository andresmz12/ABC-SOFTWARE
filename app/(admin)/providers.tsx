import { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import { ADMIN_PROVIDERS } from '@/constants/demoData';
import type { AdminProvider } from '@/constants/demoData';

type Filter = 'all' | 'pending' | 'approved' | 'rejected';

const STATUS_META: Record<AdminProvider['status'], { label: string; bg: string; text: string }> = {
  pending:   { label: 'Pending',   bg: 'bg-yellow-50', text: 'text-yellow-700' },
  approved:  { label: 'Approved',  bg: 'bg-green-50',  text: 'text-green-700' },
  rejected:  { label: 'Rejected',  bg: 'bg-red-50',    text: 'text-red-700' },
  suspended: { label: 'Suspended', bg: 'bg-gray-100',  text: 'text-gray-600' },
};

function ProviderRow({ provider, onView }: { provider: AdminProvider; onView: () => void }) {
  const meta = STATUS_META[provider.status];

  return (
    <TouchableOpacity
      onPress={onView}
      activeOpacity={0.85}
      className="bg-white rounded-2xl p-4 mb-3"
      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 5, elevation: 2 }}
    >
      <View className="flex-row items-center mb-2">
        <View className="w-10 h-10 bg-primary rounded-full items-center justify-center mr-3">
          <Text className="text-white font-body-bold text-sm">
            {provider.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-text-main font-body-bold text-sm" numberOfLines={1}>{provider.name}</Text>
          <Text className="text-text-muted font-body text-xs capitalize">{provider.type} · {provider.location}</Text>
        </View>
        <View className={`${meta.bg} px-2.5 py-0.5 rounded-full`}>
          <Text className={`${meta.text} text-xs font-body-medium`}>{meta.label}</Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-text-muted font-body text-xs">Joined {provider.joinedDate}</Text>
        <Text className="text-text-muted font-body text-xs">
          Docs: {provider.docsCount - provider.docsPending}/{provider.docsCount} ready
          {provider.docsPending > 0 && (
            <Text className="text-yellow-600"> · {provider.docsPending} pending</Text>
          )}
        </Text>
      </View>

      {provider.status === 'pending' && (
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => Alert.alert('Approve', `Approve ${provider.name}?`, [{ text: 'Cancel' }, { text: 'Approve', style: 'default' }])}
            className="flex-1 bg-green-500 rounded-xl py-2 items-center"
          >
            <Text className="text-white font-body-bold text-xs">✓ Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Alert.alert('Reject', `Reject ${provider.name}?`, [{ text: 'Cancel' }, { text: 'Reject', style: 'destructive' }])}
            className="flex-1 bg-red-50 border border-red-200 rounded-xl py-2 items-center"
          >
            <Text className="text-red-600 font-body-bold text-xs">✕ Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onView}
            className="flex-1 border border-primary rounded-xl py-2 items-center"
          >
            <Text className="text-primary font-body-bold text-xs">View Details</Text>
          </TouchableOpacity>
        </View>
      )}

      {provider.status !== 'pending' && (
        <TouchableOpacity
          onPress={onView}
          className="border border-gray-200 rounded-xl py-2 items-center"
        >
          <Text className="text-text-muted font-body-medium text-xs">View Full Profile →</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export default function AdminProviders() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = filter === 'all'
    ? ADMIN_PROVIDERS
    : ADMIN_PROVIDERS.filter((p) => p.status === filter);

  const counts: Record<Filter, number> = {
    all:      ADMIN_PROVIDERS.length,
    pending:  ADMIN_PROVIDERS.filter((p) => p.status === 'pending').length,
    approved: ADMIN_PROVIDERS.filter((p) => p.status === 'approved').length,
    rejected: ADMIN_PROVIDERS.filter((p) => p.status === 'rejected').length,
  };

  return (
    <ScreenWrapper>
      <View className="px-5 pt-8 pb-4">
        <Text className="text-primary text-3xl font-heading">Providers</Text>
        <Text className="text-text-muted font-body text-sm mt-0.5">
          {counts.pending > 0 ? `${counts.pending} awaiting review` : 'All caught up'}
        </Text>
      </View>

      {/* Filter chips */}
      <View className="flex-row gap-2 px-5 mb-4">
        {(['all', 'pending', 'approved', 'rejected'] as Filter[]).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full border flex-row items-center gap-1 ${filter === f ? 'bg-primary border-primary' : 'bg-white border-gray-200'}`}
          >
            <Text className={`text-xs font-body-medium capitalize ${filter === f ? 'text-white' : 'text-text-muted'}`}>{f}</Text>
            {counts[f] > 0 && (
              <View className={`w-4 h-4 rounded-full items-center justify-center ${filter === f ? 'bg-white/20' : 'bg-gray-100'}`}>
                <Text className={`text-xs ${filter === f ? 'text-white' : 'text-text-muted'}`} style={{ fontSize: 9 }}>{counts[f]}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProviderRow
            provider={item}
            onView={() => router.push({ pathname: '/(admin)/provider-detail', params: { id: item.id } } as any)}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
      />
    </ScreenWrapper>
  );
}
