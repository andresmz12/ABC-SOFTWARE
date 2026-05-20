import { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput } from 'react-native';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import ProviderCard from '@/components/cards/ProviderCard';
import { DEMO_PROVIDERS } from '@/constants/demoData';

type Filter = 'all' | 'company' | 'independent';

const FILTER_LABELS: Record<Filter, string> = {
  all:         'All',
  company:     'Companies',
  independent: 'Independents',
};

export default function BrowseProviders() {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const results = DEMO_PROVIDERS.filter((p) => {
    const matchesFilter = filter === 'all' || p.type === filter;
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || p.name.toLowerCase().includes(q) || p.serviceType.toLowerCase().includes(q) || p.location.toLowerCase().includes(q);
    return matchesFilter && matchesQuery;
  });

  return (
    <ScreenWrapper>
      <View className="px-5 pt-8 pb-4">
        <Text className="text-primary text-3xl font-heading">Find Providers</Text>
        <Text className="text-text-muted font-body text-sm mt-0.5">Verified professionals near you</Text>
      </View>

      {/* Search bar */}
      <View className="mx-5 mb-3">
        <View className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex-row items-center" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
          <Text className="text-text-muted mr-2">🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name, service, or area..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 text-text-main font-body text-sm"
            style={{ fontFamily: 'DMSans_400Regular' }}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Text className="text-text-muted text-base">✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <View className="flex-row gap-2 px-5 mb-4">
        {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full border ${filter === f ? 'bg-primary border-primary' : 'bg-white border-gray-200'}`}
          >
            <Text className={`text-xs font-body-medium ${filter === f ? 'text-white' : 'text-text-muted'}`}>
              {FILTER_LABELS[f]}
            </Text>
          </TouchableOpacity>
        ))}
        <View className="flex-1" />
        <Text className="text-text-muted font-body text-xs self-center">{results.length} found</Text>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ProviderCard provider={item} onPress={() => {}} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      />
    </ScreenWrapper>
  );
}
