import { View, Text, TouchableOpacity } from 'react-native';

interface Props {
  title: string;
  subtitle?: string;
  icon?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export default function EmptyState({ title, subtitle, icon, ctaLabel, onCta }: Props) {
  return (
    <View className="flex-1 items-center justify-center py-16 px-8">
      {icon && (
        <View className="w-20 h-20 bg-accent rounded-full items-center justify-center mb-4">
          <Text className="text-4xl">{icon}</Text>
        </View>
      )}
      <Text className="text-text-main font-body-bold text-lg text-center mb-2">{title}</Text>
      {subtitle && (
        <Text className="text-text-muted font-body text-sm text-center leading-5 mb-4">{subtitle}</Text>
      )}
      {ctaLabel && onCta && (
        <TouchableOpacity onPress={onCta} className="bg-primary rounded-xl px-6 py-3 mt-2" activeOpacity={0.85}>
          <Text className="text-white font-body-bold text-sm">{ctaLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
