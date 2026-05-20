import { View, Text, TouchableOpacity } from 'react-native';
import { useI18n } from '@/hooks/useI18n';
import { C } from '@/constants/theme';

export default function LanguageToggle() {
  const { language, switchLanguage } = useI18n();
  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: C.surface2,
      borderRadius: 9999,
      padding: 4,
      borderWidth: 1,
      borderColor: C.line,
    }}>
      {(['en', 'es'] as const).map((lang) => {
        const active = language === lang;
        return (
          <TouchableOpacity
            key={lang}
            onPress={() => switchLanguage(lang)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 6,
              borderRadius: 9999,
              backgroundColor: active ? C.accent : 'transparent',
            }}
            activeOpacity={0.8}
          >
            <Text style={{
              fontFamily: 'Inter_600SemiBold',
              fontSize: 13,
              color: active ? '#000' : C.textMuted,
            }}>
              {lang.toUpperCase()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
