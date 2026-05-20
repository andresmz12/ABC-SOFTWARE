import { create } from 'zustand';
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
}

export const useRegistrationStore = create<RegistrationState>((set) => ({
  country: null,
  role: null,
  formData: {},
  setCountry: (country) => set({ country }),
  setRole: (role) => set({ role }),
  setFormData: (data) => set({ formData: data }),
  mergeFormData: (data) => set((state) => ({ formData: { ...state.formData, ...data } })),
  reset: () => set({ country: null, role: null, formData: {} }),
}));
