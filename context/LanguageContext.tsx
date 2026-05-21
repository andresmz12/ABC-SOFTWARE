import React, { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from '../locales/en.json';
import es from '../locales/es.json';

type Lang = 'en' | 'es';

const translations: Record<Lang, any> = { en, es };

function getNestedValue(obj: any, key: string): string {
  return key.split('.').reduce((o, k) => o?.[k], obj) ?? key;
}

interface LangContextType {
  lang: Lang;
  t: (key: string) => string;
  setLang: (lang: Lang) => void;
}

const LangContext = createContext<LangContextType>({
  lang: 'en',
  t: (key) => key,
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  const setLang = useCallback(async (newLang: Lang) => {
    setLangState(newLang);
    await AsyncStorage.setItem('app_lang', newLang);
  }, []);

  const t = useCallback((key: string) => {
    return getNestedValue(translations[lang], key);
  }, [lang]);

  React.useEffect(() => {
    AsyncStorage.getItem('app_lang').then((saved) => {
      if (saved === 'en' || saved === 'es') setLangState(saved);
    });
  }, []);

  return (
    <LangContext.Provider value={{ lang, t, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
