import { View, Text } from 'react-native';

interface Props {
  current: number;
  total: number;
}

export default function StepProgressBar({ current, total }: Props) {
  return (
    <View className="mb-6">
      <View className="flex-row gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            className={`flex-1 h-1.5 rounded-full ${i < current ? 'bg-primary' : 'bg-gray-200'}`}
          />
        ))}
      </View>
      <Text className="text-text-muted text-xs mt-2 text-right">Step {current} of {total}</Text>
    </View>
  );
}
