import { View, Text, TouchableOpacity } from 'react-native';
import { useLang } from '@/context/LanguageContext';
import { C } from '@/constants/theme';

export default function LanguageToggle() {
  const { lang, setLang } = useLang();
  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: C.surface2,
      borderRadius: 9999,
      padding: 4,
      borderWidth: 1,
      borderColor: C.line,
    }}>
      {(['en', 'es'] as const).map((item) => {
        const active = lang === item;
        return (
          <TouchableOpacity
            key={item}
            onPress={() => setLang(item)}
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
              {item.toUpperCase()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
