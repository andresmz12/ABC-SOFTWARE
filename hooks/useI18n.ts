import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import { useSettingsStore } from '@/store/settingsStore';
import type { Language } from '@/types';

export const useI18n = () => {
  const { t } = useTranslation();
  const { setLanguage } = useSettingsStore();
  const [language, setLang] = useState<Language>(i18n.language as Language);

  useEffect(() => {
    const handler = (lng: string) => setLang(lng as Language);
    i18n.on('languageChanged', handler);
    return () => i18n.off('languageChanged', handler);
  }, []);

  const switchLanguage = async (lang: Language) => {
    await i18n.changeLanguage(lang);
    setLanguage(lang);
  };

  return { t, language, switchLanguage };
};
