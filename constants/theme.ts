export const C = {
  background:    '#F5F7FA',
  surface:       '#FFFFFF',
  surface2:      '#EEF2F6',
  line:          '#DDE3EC',
  primary:       '#00B4D8',
  accent:        '#00B4D8',
  accent2:       '#0077B6',
  success:       '#06D6A0',
  danger:        '#EF476F',
  warning:       '#F59E0B',
  textPrimary:   '#0D1B2A',
  textSecondary: '#5A6A7A',
  textMuted:     '#9AAAB8',
} as const;

export const S = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
} as const;

export const R = {
  sm: 8, md: 12, lg: 16, xl: 24, full: 9999,
} as const;

export const cardShadow = {
  shadowColor: '#00B4D8',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 12,
  elevation: 4,
} as const;
