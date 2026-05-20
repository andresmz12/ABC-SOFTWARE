import { View, Text } from 'react-native';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import EmptyState from '@/components/ui/EmptyState';
import { C } from '@/constants/theme';

export default function AdminDocuments() {
  return (
    <ScreenWrapper>
      <View style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 8 }}>
        <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>Document Review</Text>
        <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 4 }}>Review and approve provider documents</Text>
      </View>
      <EmptyState
        title="No documents pending review"
        subtitle="Provider document submissions will appear here for review and approval."
        iconName="file-text"
      />
    </ScreenWrapper>
  );
}
