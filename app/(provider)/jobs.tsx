import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import EmptyState from '@/components/ui/EmptyState';
import { C } from '@/constants/theme';

type Tab = 'applied' | 'active' | 'completed';

const TABS: { key: Tab; label: string }[] = [
  { key: 'applied',   label: 'Applied' },
  { key: 'active',    label: 'Active' },
  { key: 'completed', label: 'Completed' },
];

const EMPTY: Record<Tab, { title: string; subtitle: string; icon: 'send' | 'briefcase' | 'check-circle' }> = {
  applied:   { title: 'No pending applications', subtitle: 'Jobs you apply to will appear here', icon: 'send' },
  active:    { title: 'No active jobs',           subtitle: 'Your accepted jobs will show up here', icon: 'briefcase' },
  completed: { title: 'No completed jobs yet',    subtitle: 'Completed jobs will be tracked here',  icon: 'check-circle' },
};

export default function ProviderJobs() {
  const [tab, setTab] = useState<Tab>('applied');

  return (
    <ScreenWrapper>
      <View style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 8 }}>
        <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>
          My Jobs
        </Text>
        <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
          Track your applications and active work
        </Text>
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
      />
    </ScreenWrapper>
  );
}
