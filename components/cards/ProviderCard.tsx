import { View, Text, TouchableOpacity } from 'react-native';
import type { ProviderProfile } from '@/types';

interface Props {
  provider: ProviderProfile;
  onPress: () => void;
}

const BADGE_LABELS: Record<string, string> = {
  identity_verified: '✅ Verified',
  insured: '🛡️ Insured',
  background_checked: '✔️ BG Checked',
  top_rated: '⭐ Top Rated',
};

export default function ProviderCard({ provider, onPress }: Props) {
  const name = 'company_name' in provider.profile
    ? (provider.profile as any).company_name
    : (provider.profile as any).full_name;
  return (
    <TouchableOpacity onPress={onPress} className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-text-main font-body-bold text-base">{name}</Text>
        <View className="flex-row items-center">
          <Text className="text-secondary font-body-bold text-sm mr-1">★</Text>
          <Text className="text-text-main font-body-medium text-sm">{provider.average_rating?.toFixed(1) ?? '—'}</Text>
        </View>
      </View>
      <View className="flex-row flex-wrap gap-1 mb-2">
        {provider.badges.map((badge) => (
          <View key={badge} className="bg-accent px-2 py-0.5 rounded-full">
            <Text className="text-primary text-xs">{BADGE_LABELS[badge]}</Text>
          </View>
        ))}
      </View>
      <Text className="text-text-muted text-sm">
        {provider.service_areas.map((a) => a.city).join(', ')}
      </Text>
    </TouchableOpacity>
  );
}
