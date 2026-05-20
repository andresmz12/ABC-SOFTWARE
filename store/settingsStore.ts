import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Language, Country } from '@/types';

interface SettingsState {
  language: Language;
  country: Country;
  setLanguage: (lang: Language) => Promise<void>;
  setCountry: (country: Country) => void;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  language: 'en',
  country: 'usa',
  setLanguage: async (lang) => {
    await AsyncStorage.setItem('preferred_language', lang);
    set({ language: lang });
  },
  setCountry: (country) => set({ country }),
  loadSettings: async () => {
    const lang = await AsyncStorage.getItem('preferred_language');
    if (lang) set({ language: lang as Language });
  },
}));
