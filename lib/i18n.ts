// Polyfill Intl.PluralRules for Hermes (React Native) before i18next initialises
import '@formatjs/intl-pluralrules/polyfill';
import '@formatjs/intl-pluralrules/locale-data/en';
import '@formatjs/intl-pluralrules/locale-data/es';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from '@/locales/en.json';
import es from '@/locales/es.json';

const getStoredLanguage = async (): Promise<string> => {
  try {
    const stored = await AsyncStorage.getItem('preferred_language');
    if (stored) return stored;
  } catch {}
  const deviceLang = Localization.getLocales()[0]?.languageCode ?? 'en';
  return deviceLang.startsWith('es') ? 'es' : 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

getStoredLanguage().then((lang) => i18n.changeLanguage(lang));

export default i18n;
