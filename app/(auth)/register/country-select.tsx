import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import { useRegistrationStore } from '@/store/registrationStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useLang } from '@/context/LanguageContext';
import type { Country } from '@/types';

interface CountryCard {
  country: Country;
  flag: string;
  title: string;
  description: string;
  lang: 'en' | 'es';
  accent: string;
  border: string;
}

const CARDS: CountryCard[] = [
  {
    country: 'usa',
    flag: '🇺🇸',
    title: 'United States',
    description: 'Register as a cleaning provider or client in the US',
    lang: 'en',
    accent: 'bg-blue-50',
    border: 'border-blue-200',
  },
  {
    country: 'colombia',
    flag: '🇨🇴',
    title: 'Colombia',
    description: 'Regístrate como proveedor o cliente en Colombia',
    lang: 'es',
    accent: 'bg-yellow-50',
    border: 'border-yellow-300',
  },
];

export default function CountrySelect() {
  const router = useRouter();
  const { setCountry } = useRegistrationStore();
  const { setCountry: setSettingsCountry } = useSettingsStore();
  const { setLang } = useLang();

  const handleSelect = async (card: CountryCard) => {
    setCountry(card.country);
    setLang(card.lang);
    await setSettingsCountry(card.country);
    router.push('/(auth)/register/role-select' as any);
  };

  return (
    <ScreenWrapper scroll className="px-6">
      <View className="items-center py-12">
        <View className="w-16 h-16 bg-primary rounded-2xl items-center justify-center mb-4">
          <Text className="text-white text-2xl font-heading">P</Text>
        </View>
        <Text className="text-primary text-3xl font-heading mb-2">ProVendor</Text>
        <Text className="text-text-main font-body-bold text-xl mt-4 mb-2 text-center">
          Select your country
        </Text>
        <Text className="text-text-muted font-body text-center text-sm">
          Everything adapts to your location
        </Text>
      </View>

      <View className="gap-4 pb-10">
        {CARDS.map((card) => (
          <TouchableOpacity
            key={card.country}
            onPress={() => handleSelect(card)}
            activeOpacity={0.85}
            className={`rounded-2xl border-2 ${card.border} ${card.accent} p-6 shadow-sm`}
          >
            <View className="flex-row items-center mb-3">
              <Text className="text-5xl mr-4">{card.flag}</Text>
              <Text className="text-primary text-2xl font-heading">{card.title}</Text>
            </View>
            <Text className="text-text-muted font-body text-base leading-6">
              {card.description}
            </Text>
            <View className="mt-4 bg-primary rounded-xl py-3 items-center">
              <Text className="text-white font-body-bold">
                {card.country === 'usa' ? 'Continue →' : 'Continuar →'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScreenWrapper>
  );
}
