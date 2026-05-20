import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/store/settingsStore';

export const useI18n = () => {
  const { t, i18n } = useTranslation();
  const { language, setLanguage } = useSettingsStore();

  const switchLanguage = async (lang: 'en' | 'es') => {
    await setLanguage(lang);
    await i18n.changeLanguage(lang);
  };

  return { t, language, switchLanguage };
};
