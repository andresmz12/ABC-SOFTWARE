import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/store/settingsStore';
import type { Language } from '@/types';

export const useI18n = () => {
  const { t, i18n } = useTranslation();
  const { setLanguage } = useSettingsStore();

  const switchLanguage = async (lang: Language) => {
    await setLanguage(lang);
  };

  // Use i18n.language as the source of truth — it is always in sync
  // because setLanguage now calls i18n.changeLanguage internally.
  return { t, language: i18n.language as Language, switchLanguage };
};
