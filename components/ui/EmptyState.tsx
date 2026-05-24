import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C } from '@/constants/theme';

type FeatherName = keyof typeof Feather.glyphMap;

interface Props {
  title: string;
  subtitle?: string;
  iconName?: FeatherName;
  ctaLabel?: string;
  onCta?: () => void;
}

export default function EmptyState({ title, subtitle, iconName = 'inbox', ctaLabel, onCta }: Props) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64, paddingHorizontal: 32 }}>
      <View style={{
        width: 72,
        height: 72,
        backgroundColor: C.surface2,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: C.line,
      }}>
        <Feather name={iconName} size={28} color={C.textMuted} />
      </View>
      <Text style={{ color: C.textPrimary, fontSize: 17, fontFamily: 'Inter_600SemiBold', textAlign: 'center', marginBottom: 8 }}>
        {title}
      </Text>
      {subtitle && (
        <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 }}>
          {subtitle}
        </Text>
      )}
      {ctaLabel && onCta && (
        <TouchableOpacity
          onPress={onCta}
          style={{
            backgroundColor: C.accent,
            borderRadius: 12,
            paddingHorizontal: 24,
            paddingVertical: 14,
            marginTop: 24,
          }}
          activeOpacity={0.85}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>{ctaLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
