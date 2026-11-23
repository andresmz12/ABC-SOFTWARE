/** Privacy Policy / Terms of Use — ?type=privacy | terms */
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useLang } from '@/context/LanguageContext';
import { C } from '@/constants/theme';
import { LEGAL_DOCS } from '@/constants/legal';

export default function Legal() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const router = useRouter();
  const { lang } = useLang();
  const es = lang === 'es';
  const doc = LEGAL_DOCS[type === 'terms' ? 'terms' : 'privacy'];
  const body = es ? doc.es : doc.en;

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.line, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Feather name="arrow-left" size={20} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={{ color: C.textPrimary, fontSize: 20, fontFamily: 'Inter_700Bold' }}>{body.title}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 16 }}>
          {es ? 'Última actualización: ' : 'Last updated: '}{LEGAL_DOCS.updated}
        </Text>
        {body.sections.map((s) => (
          <View key={s.h} style={{ marginBottom: 18 }}>
            <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_600SemiBold', marginBottom: 6 }}>{s.h}</Text>
            <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 21 }}>{s.p}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
