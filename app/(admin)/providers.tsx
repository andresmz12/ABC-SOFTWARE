import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import EmptyState from '@/components/ui/EmptyState';
import { C } from '@/constants/theme';

type Filter = 'all' | 'pending' | 'approved' | 'rejected';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'pending',  label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

export default function AdminProviders() {
  const [filter, setFilter] = useState<Filter>('all');

  return (
    <ScreenWrapper>
      <View style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 8 }}>
        <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>Providers</Text>
        <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 4 }}>Manage provider applications and accounts</Text>
      </View>

      {/* Filter chips */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 24, marginTop: 16, marginBottom: 8 }}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 9999,
                backgroundColor: active ? C.accent : C.surface,
                borderWidth: 1,
                borderColor: active ? C.accent : C.line,
              }}
              activeOpacity={0.85}
            >
              <Text style={{
                color: active ? '#000' : C.textMuted,
                fontSize: 13,
                fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular',
              }}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <EmptyState
        title={filter === 'all' ? 'No providers yet' : `No ${filter} providers`}
        subtitle="Provider applications will appear here once they register on the platform."
        iconName="users"
      />
    </ScreenWrapper>
  );
}
