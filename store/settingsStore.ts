import { create } from 'zustand';
import { storage } from '@/lib/storage';
import type { Language, Country } from '@/types';

interface SettingsState {
  language: Language;
  country: Country;
  setLanguage: (lang: Language) => Promise<void>;
  setCountry: (country: Country) => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  language: 'en',
  country: 'usa',
  setLanguage: async (lang) => {
    await storage.setItem('preferred_language', lang);
    set({ language: lang });
  },
  setCountry: async (country) => {
    await storage.setItem('selected_country', country);
    set({ country });
  },
  loadSettings: async () => {
    const [lang, country] = await Promise.all([
      storage.getItem('preferred_language'),
      storage.getItem('selected_country'),
    ]);
    if (lang) set({ language: lang as Language });
    if (country) set({ country: country as Country });
  },
}));
