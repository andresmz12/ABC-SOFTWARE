export const C = {
  background: '#0A0A0A',
  surface:    '#141414',
  surface2:   '#1C1C1C',
  line:       '#2A2A2A',
  primary:    '#FFFFFF',
  accent:     '#C9A84C',
  accent2:    '#1B3A6B',
  success:    '#22C55E',
  danger:     '#EF4444',
  warning:    '#F59E0B',
  textPrimary:   '#FFFFFF',
  textSecondary: '#A3A3A3',
  textMuted:     '#525252',
} as const;

export const S = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
} as const;

export const R = {
  sm: 8, md: 12, lg: 16, xl: 24, full: 9999,
} as const;

export const cardShadow = {
  shadowColor: '#C9A84C',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 12,
  elevation: 4,
} as const;
