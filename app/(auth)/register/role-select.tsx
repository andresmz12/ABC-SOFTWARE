import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useLang } from '@/context/LanguageContext';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import { useRegistrationStore } from '@/store/registrationStore';

export default function RoleSelect() {
  const router = useRouter();
  const { t } = useLang();
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
  const countryName = country === 'colombia' ? 'Colombia' : 'United States';

  return (
    <ScreenWrapper scroll className="px-6">
      <TouchableOpacity onPress={() => router.back()} className="pt-6 pb-2">
        <Text className="text-primary font-body">← {t('common.back')}</Text>
      </TouchableOpacity>

      <View className="flex-row items-center bg-accent rounded-xl px-4 py-2 mb-6 self-start">
        <Text className="text-lg mr-2">{countryFlag}</Text>
        <Text className="text-primary font-body-medium text-sm">{countryName}</Text>
      </View>

      <Text className="text-primary text-3xl font-heading mb-2">{t('roles.selectRole')}</Text>
      <Text className="text-text-muted font-body mb-8">{t('roles.selectRoleSubtitle')}</Text>

      {roles.map((role) => (
        <TouchableOpacity
          key={role.key}
          onPress={() => handleSelect(role)}
          className="bg-white border border-gray-200 rounded-2xl p-5 mb-3 shadow-sm active:bg-accent"
        >
          <View className="flex-row items-center mb-2">
            <Text className="text-2xl mr-3">{role.icon}</Text>
            <Text className="text-primary font-body-bold text-lg">{role.label}</Text>
          </View>
          <Text className="text-text-muted font-body text-sm leading-5">{role.desc}</Text>
        </TouchableOpacity>
      ))}
    </ScreenWrapper>
  );
}
