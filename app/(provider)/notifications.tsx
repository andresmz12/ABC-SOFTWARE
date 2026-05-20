import { View, Text } from 'react-native';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import EmptyState from '@/components/ui/EmptyState';
import { C } from '@/constants/theme';

export default function ProviderNotifications() {
  return (
    <ScreenWrapper>
      <View style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 8 }}>
        <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>Notifications</Text>
        <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 4 }}>Stay updated on jobs and account activity</Text>
      </View>
      <EmptyState
        title="No notifications yet"
        subtitle="You'll receive alerts for new jobs, application updates, and account changes here."
        iconName="bell"
      />
    </ScreenWrapper>
  );
}
