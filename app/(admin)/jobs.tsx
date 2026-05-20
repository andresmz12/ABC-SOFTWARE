import { View, Text } from 'react-native';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import EmptyState from '@/components/ui/EmptyState';
import { C } from '@/constants/theme';

export default function AdminJobs() {
  return (
    <ScreenWrapper>
      <View style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 8 }}>
        <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>All Jobs</Text>
        <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 4 }}>Monitor all job requests on the platform</Text>
      </View>
      <EmptyState
        title="No job requests yet"
        subtitle="Job requests posted by clients will appear here."
        iconName="briefcase"
      />
    </ScreenWrapper>
  );
}
