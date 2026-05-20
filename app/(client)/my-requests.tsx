import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import EmptyState from '@/components/ui/EmptyState';
import { C } from '@/constants/theme';

type Tab = 'open' | 'active' | 'completed';

const TABS: { key: Tab; label: string }[] = [
  { key: 'open',      label: 'Open' },
  { key: 'active',    label: 'Active' },
  { key: 'completed', label: 'Completed' },
];

const EMPTY: Record<Tab, { title: string; subtitle: string; icon: 'list' | 'briefcase' | 'check-circle' }> = {
  open:      { title: 'No open requests',      subtitle: 'Post a job to receive quotes from providers', icon: 'list' },
  active:    { title: 'No active jobs',         subtitle: 'Jobs in progress will appear here', icon: 'briefcase' },
  completed: { title: 'No completed jobs yet',  subtitle: 'Your job history will be shown here', icon: 'check-circle' },
};

export default function MyRequests() {
  const [tab, setTab] = useState<Tab>('open');
  const router = useRouter();

  return (
    <ScreenWrapper>
      <View style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 8 }}>
        <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>My Requests</Text>
        <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 4 }}>Track and manage your service requests</Text>
      </View>

      {/* Segmented tabs */}
      <View style={{
        flexDirection: 'row',
        marginHorizontal: 24,
        marginTop: 16,
        marginBottom: 8,
        backgroundColor: C.surface,
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: C.line,
      }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              style={{
                flex: 1,
                paddingVertical: 10,
                alignItems: 'center',
                borderRadius: 10,
                backgroundColor: active ? C.surface2 : 'transparent',
              }}
              activeOpacity={0.8}
            >
              <Text style={{
                fontSize: 13,
                fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular',
                color: active ? C.textPrimary : C.textMuted,
              }}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <EmptyState
        title={EMPTY[tab].title}
        subtitle={EMPTY[tab].subtitle}
        iconName={EMPTY[tab].icon}
        ctaLabel={tab === 'open' ? 'Post a Job' : undefined}
        onCta={tab === 'open' ? () => router.push('/(client)/post-job' as any) : undefined}
      />
    </ScreenWrapper>
  );
}
