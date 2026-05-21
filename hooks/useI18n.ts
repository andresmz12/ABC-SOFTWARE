import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/store/settingsStore';
import type { Language } from '@/types';

export const useI18n = () => {
  const { t } = useTranslation();
  // language from Zustand — this triggers React re-renders reliably.
  // i18n.language is a plain object property and does NOT cause re-renders.
  const { language, setLanguage } = useSettingsStore();

  const switchLanguage = async (lang: Language) => {
    await setLanguage(lang);
  };

  return { t, language, switchLanguage };
};
