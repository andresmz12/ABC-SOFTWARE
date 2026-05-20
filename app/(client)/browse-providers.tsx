import { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import EmptyState from '@/components/ui/EmptyState';
import { Feather } from '@expo/vector-icons';
import { C } from '@/constants/theme';

export default function BrowseProviders() {
  const [query, setQuery] = useState('');

  return (
    <ScreenWrapper>
      <View style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 8 }}>
        <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>Find Providers</Text>
        <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 4 }}>Verified professionals near you</Text>
      </View>

      {/* Search bar */}
      <View style={{
        marginHorizontal: 24,
        marginTop: 16,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.surface,
        borderWidth: 1.5,
        borderColor: query.length > 0 ? C.accent : C.line,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
      }}>
        <Feather name="search" size={16} color={C.textMuted} style={{ marginRight: 10 }} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, service, or area..."
          placeholderTextColor={C.textMuted}
          style={{ flex: 1, color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_400Regular' }}
        />
      </View>

      <EmptyState
        title="No approved providers yet"
        subtitle="Verified providers in your area will appear here once they complete the approval process."
        iconName="users"
      />
    </ScreenWrapper>
  );
}
