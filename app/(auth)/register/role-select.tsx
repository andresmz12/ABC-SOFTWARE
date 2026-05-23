import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from '@/context/LanguageContext';
import { useRegistrationStore } from '@/store/registrationStore';
import { C } from '@/constants/theme';

export default function RoleSelect() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, lang } = useLang();
  const es = lang === 'es';
  const { country, setRole } = useRegistrationStore();

  const roles = [
    {
      key: 'company' as const,
      icon: '🏢',
      label: t('roles.company'),
      desc: t('roles.companyDescription'),
      route: '/(auth)/register/company/step1',
    },
    {
      key: 'independent' as const,
      icon: '🧹',
      label: t('roles.independent'),
      desc: t('roles.independentDescription'),
      route: '/(auth)/register/independent/step1',
    },
    {
      key: 'client' as const,
      icon: '🏠',
      label: t('roles.client'),
      desc: t('roles.clientDescription'),
      route: '/(auth)/register/client',
    },
  ];

  const handleSelect = (role: typeof roles[0]) => {
    setRole(role.key);
    router.push(role.route as any);
  };

  const countryFlag = country === 'colombia' ? '🇨🇴' : '🇺🇸';
  const countryName = country === 'colombia' ? 'Colombia' : (es ? 'Estados Unidos' : 'United States');

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 8, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ paddingTop: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' }}
        >
          <Text style={{ color: C.textSecondary, fontSize: 15, fontFamily: 'Inter_400Regular' }}>
            ← {t('common.back')}
          </Text>
        </TouchableOpacity>

        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: `${C.accent}20`,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 8,
          marginTop: 8,
          marginBottom: 24,
          alignSelf: 'flex-start',
          borderWidth: 1,
          borderColor: `${C.accent}40`,
        }}>
          <Text style={{ fontSize: 18, marginRight: 8 }}>{countryFlag}</Text>
          <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_500Medium' }}>{countryName}</Text>
        </View>

        <Text style={{ color: C.textPrimary, fontSize: 30, fontFamily: 'Inter_700Bold', letterSpacing: -0.5, marginBottom: 8 }}>
          {t('roles.selectRole')}
        </Text>
        <Text style={{ color: C.textMuted, fontSize: 15, fontFamily: 'Inter_400Regular', marginBottom: 32 }}>
          {t('roles.selectRoleSubtitle')}
        </Text>

        {roles.map((role) => (
          <TouchableOpacity
            key={role.key}
            onPress={() => handleSelect(role)}
            activeOpacity={0.85}
            style={{
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.line,
              borderRadius: 20,
              padding: 20,
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 24, marginRight: 12 }}>{role.icon}</Text>
              <Text style={{ color: C.textPrimary, fontSize: 17, fontFamily: 'Inter_600SemiBold' }}>{role.label}</Text>
            </View>
            <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 }}>
              {role.desc}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
