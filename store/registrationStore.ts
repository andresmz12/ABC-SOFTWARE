import { create } from 'zustand';
import { storage } from '@/lib/storage';
import type { Country } from '@/types';

type ProviderRole = 'company' | 'independent' | 'client';

interface RegistrationState {
  country: Country | null;
  role: ProviderRole | null;
  formData: Record<string, any>;
  setCountry: (country: Country) => void;
  setRole: (role: ProviderRole) => void;
  setFormData: (data: Record<string, any>) => void;
  mergeFormData: (data: Record<string, any>) => void;
  reset: () => void;
  loadCountry: () => Promise<void>;
}

export const useRegistrationStore = create<RegistrationState>((set) => ({
  country: null,
  role: null,
  formData: {},
  setCountry: (country) => {
    storage.setItem('reg_country', country).catch(() => {});
    set({ country });
  },
  setRole: (role) => set({ role }),
  setFormData: (data) => set({ formData: data }),
  mergeFormData: (data) => set((state) => ({ formData: { ...state.formData, ...data } })),
  reset: () => {
    storage.removeItem('reg_country').catch(() => {});
    set({ country: null, role: null, formData: {} });
  },
  loadCountry: async () => {
    const country = await storage.getItem('reg_country');
    if (country) set({ country: country as Country });
  },
}));
