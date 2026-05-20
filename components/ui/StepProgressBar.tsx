import { View, Text } from 'react-native';
import { C } from '@/constants/theme';

interface Props {
  current: number;
  total: number;
}

export default function StepProgressBar({ current, total }: Props) {
  return (
    <View style={{ marginBottom: 24 }}>
      <View style={{ height: 3, backgroundColor: C.line, borderRadius: 9999, overflow: 'hidden' }}>
        <View
          style={{
            height: '100%',
            backgroundColor: C.accent,
            borderRadius: 9999,
            width: `${(current / total) * 100}%`,
          }}
        />
      </View>
      <Text style={{
        color: C.textMuted,
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        marginTop: 6,
        textAlign: 'right',
      }}>
        Step {current} of {total}
      </Text>
    </View>
  );
}
