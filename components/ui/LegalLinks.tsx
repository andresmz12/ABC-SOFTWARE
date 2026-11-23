import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { C } from '@/constants/theme';
import { useLang } from '@/context/LanguageContext';

/** Privacy Policy · Terms of Use links (required by both app stores). */
export default function LegalLinks() {
  const router = useRouter();
  const { lang } = useLang();
  const es = lang === 'es';
  const go = (type: 'privacy' | 'terms') =>
    router.push({ pathname: '/(shared)/legal', params: { type } } as any);
  const link = { color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', textDecorationLine: 'underline' as const };
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, paddingVertical: 12 }}>
      <TouchableOpacity onPress={() => go('privacy')}><Text style={link}>{es ? 'Política de Privacidad' : 'Privacy Policy'}</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => go('terms')}><Text style={link}>{es ? 'Términos de Uso' : 'Terms of Use'}</Text></TouchableOpacity>
    </View>
  );
}
