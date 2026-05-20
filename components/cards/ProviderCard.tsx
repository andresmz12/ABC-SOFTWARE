import { View, Text, TouchableOpacity } from 'react-native';
import type { DemoProvider } from '@/constants/demoData';

interface Props {
  provider: DemoProvider;
  onPress: () => void;
}

const BADGE_META: Record<string, { label: string; icon: string; bg: string; text: string }> = {
  identity_verified: { label: 'Verified',    icon: '✅', bg: 'bg-green-50',  text: 'text-green-700' },
  insured:           { label: 'Insured',      icon: '🛡️', bg: 'bg-blue-50',   text: 'text-blue-700'  },
  background_checked:{ label: 'BG Checked',  icon: '✔️', bg: 'bg-indigo-50', text: 'text-indigo-700'},
  top_rated:         { label: 'Top Rated',    icon: '⭐', bg: 'bg-amber-50',  text: 'text-amber-700' },
};

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <View className="flex-row items-center">
      {Array.from({ length: 5 }).map((_, i) => (
        <Text key={i} className="text-secondary text-sm">
          {i < full ? '★' : i === full && half ? '½' : '☆'}
        </Text>
      ))}
      <Text className="text-text-main font-body-bold text-sm ml-1">{rating.toFixed(1)}</Text>
    </View>
  );
}

export default function ProviderCard({ provider, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3 }}
      className="bg-white rounded-2xl p-4 mb-3"
    >
      {/* Header: avatar + name + rating */}
      <View className="flex-row items-center mb-3">
        <View className="w-12 h-12 bg-primary rounded-full items-center justify-center mr-3">
          <Text className="text-white font-body-bold text-base">{initials(provider.name)}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-text-main font-body-bold text-base" numberOfLines={1}>{provider.name}</Text>
          <Text className="text-text-muted font-body text-xs capitalize">{provider.type} · {provider.location}</Text>
        </View>
        <View className="items-end">
          <Stars rating={provider.rating} />
          <Text className="text-text-muted font-body text-xs">{provider.reviewCount} reviews</Text>
        </View>
      </View>

      {/* Badge row */}
      <View className="flex-row flex-wrap gap-1 mb-3">
        {provider.badges.map((b) => {
          const m = BADGE_META[b];
          if (!m) return null;
          return (
            <View key={b} className={`${m.bg} px-2 py-0.5 rounded-full flex-row items-center`}>
              <Text className="text-xs mr-0.5">{m.icon}</Text>
              <Text className={`${m.text} text-xs font-body-medium`}>{m.label}</Text>
            </View>
          );
        })}
      </View>

      {/* Service info row */}
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-text-muted font-body text-xs">{provider.serviceType}</Text>
        <View className="bg-secondary/10 px-3 py-1 rounded-full">
          <Text className="text-secondary font-body-bold text-xs">{provider.priceRange}</Text>
        </View>
      </View>

      {/* CTA */}
      <TouchableOpacity
        onPress={onPress}
        className="border border-primary rounded-xl py-2.5 items-center"
        activeOpacity={0.8}
      >
        <Text className="text-primary font-body-bold text-sm">View Profile</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}
