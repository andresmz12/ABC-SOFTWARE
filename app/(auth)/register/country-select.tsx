import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useRegistrationStore } from '@/store/registrationStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useLang } from '@/context/LanguageContext';
import { C } from '@/constants/theme';
import type { Country } from '@/types';

interface CountryCard {
  country: Country;
  flag: string;
  title: string;
  description: string;
  lang: 'en' | 'es';
}

const CARDS: CountryCard[] = [
  {
    country: 'usa',
    flag: '🇺🇸',
    title: 'United States',
    description: 'Register as a cleaning provider or client in the US',
    lang: 'en',
  },
  {
    country: 'colombia',
    flag: '🇨🇴',
    title: 'Colombia',
    description: 'Regístrate como proveedor o cliente en Colombia',
    lang: 'es',
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
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <View style={{
            width: 64,
            height: 64,
            backgroundColor: C.accent,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}>
            <Text style={{ color: '#000', fontSize: 26, fontFamily: 'Inter_700Bold' }}>P</Text>
          </View>
          <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', marginBottom: 6 }}>
            ProVendor
          </Text>
          <Text style={{ color: C.textPrimary, fontSize: 18, fontFamily: 'Inter_600SemiBold', marginBottom: 6 }}>
            Select your country
          </Text>
          <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' }}>
            Everything adapts to your location
          </Text>
        </View>

        <View style={{ gap: 16 }}>
          {CARDS.map((card) => (
            <TouchableOpacity
              key={card.country}
              onPress={() => handleSelect(card)}
              activeOpacity={0.8}
              style={{
                backgroundColor: C.surface,
                borderRadius: 20,
                padding: 24,
                borderWidth: 1.5,
                borderColor: card.country === 'usa' ? C.accent2 : C.accent,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ fontSize: 44, marginRight: 16 }}>{card.flag}</Text>
                <Text style={{ color: C.textPrimary, fontSize: 22, fontFamily: 'Inter_700Bold' }}>
                  {card.title}
                </Text>
              </View>
              <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22, marginBottom: 18 }}>
                {card.description}
              </Text>
              <View style={{
                backgroundColor: card.country === 'usa' ? C.accent2 : C.accent,
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: 'center',
              }}>
                <Text style={{
                  color: card.country === 'usa' ? '#FFFFFF' : '#000000',
                  fontSize: 15,
                  fontFamily: 'Inter_600SemiBold',
                }}>
                  {card.country === 'usa' ? 'Continue →' : 'Continuar →'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
