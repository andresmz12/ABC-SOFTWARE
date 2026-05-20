import 'intl-pluralrules';
import 'intl';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// require() with relative paths — most reliable for Metro bundler + JSON
const en = require('../locales/en.json');
const es = require('../locales/es.json');

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
    // initImmediate: false forces synchronous init when resources are inline.
    // Without this, init is scheduled async and components render before it
    // completes, showing raw keys instead of translated strings.
    initImmediate: false,
    react: { useSuspense: false },
  });

getStoredLanguage().then((lang) => i18n.changeLanguage(lang));

export default i18n;
