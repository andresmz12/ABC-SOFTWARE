import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import EmptyState from '@/components/ui/EmptyState';
import { Feather } from '@expo/vector-icons';
import { C } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface Provider {
  id: string;
  email: string;
  role: 'company' | 'independent';
  country: string;
  name: string;
  serviceType: string;
}

function ProviderCard({ provider }: { provider: Provider }) {
  const isCompany = provider.role === 'company';
  return (
    <View style={{
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
    }}>
      <View style={{
        width: 48, height: 48,
        backgroundColor: `${C.accent}20`,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
      }}>
        <Text style={{ color: C.accent, fontSize: 18, fontFamily: 'Inter_700Bold' }}>
          {provider.name[0]?.toUpperCase() ?? 'P'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_600SemiBold', marginBottom: 2 }}>
          {provider.name}
        </Text>
        <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
          {isCompany ? 'Cleaning Company' : 'Independent Cleaner'} · {provider.serviceType}
        </Text>
      </View>
      <View style={{
        backgroundColor: `${C.success}15`,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
      }}>
        <Text style={{ color: C.success, fontSize: 10, fontFamily: 'Inter_600SemiBold' }}>VERIFIED</Text>
      </View>
    </View>
  );
}

export default function BrowseProviders() {
  const [query, setQuery] = useState('');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('users')
        .select('id, email, role, country, companies(company_name, service_type), independents(full_name, service_type)')
        .eq('status', 'approved')
        .in('role', ['company', 'independent']);

      if (data) {
        const mapped: Provider[] = data.map((u: any) => ({
          id: u.id,
          email: u.email,
          role: u.role,
          country: u.country,
          name: u.role === 'company'
            ? (u.companies?.[0]?.company_name ?? u.email.split('@')[0])
            : (u.independents?.[0]?.full_name ?? u.email.split('@')[0]),
          serviceType: u.role === 'company'
            ? (u.companies?.[0]?.service_type ?? 'Both')
            : (u.independents?.[0]?.service_type ?? 'Both'),
        }));
        setProviders(mapped);
      }
    } catch {
      // silently fail — show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProviders(); }, [loadProviders]);

  const filtered = query.length > 0
    ? providers.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.serviceType.toLowerCase().includes(query.toLowerCase())
      )
    : providers;

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
        marginBottom: 16,
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
          placeholder="Search by name or service..."
          placeholderTextColor={C.textMuted}
          style={{ flex: 1, color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_400Regular' }}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Feather name="x" size={16} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={C.accent} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={query.length > 0 ? 'No results found' : 'No approved providers yet'}
          subtitle={query.length > 0
            ? `No providers match "${query}"`
            : 'Verified providers in your area will appear here once they complete the approval process.'}
          iconName="users"
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ProviderCard provider={item} />}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenWrapper>
  );
}
