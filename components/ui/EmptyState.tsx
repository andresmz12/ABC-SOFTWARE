import { View, Text } from 'react-native';

interface Props {
  title: string;
  subtitle?: string;
  icon?: string;
}

export default function EmptyState({ title, subtitle, icon }: Props) {
  return (
    <View className="flex-1 items-center justify-center py-16 px-8">
      {icon && <Text className="text-5xl mb-4">{icon}</Text>}
      <Text className="text-text-main font-body-bold text-lg text-center mb-2">{title}</Text>
      {subtitle && <Text className="text-text-muted font-body text-sm text-center">{subtitle}</Text>}
    </View>
  );
}
