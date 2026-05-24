import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export default function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
  className = '',
}: Props) {
  const styles: Record<Variant, { bg: string; text: string; border?: string }> = {
    primary:   { bg: 'bg-accent',       text: 'text-white' },
    secondary: { bg: 'bg-transparent',  text: 'text-accent',   border: 'border border-accent' },
    ghost:     { bg: 'bg-transparent',  text: 'text-primary' },
    danger:    { bg: 'bg-danger',       text: 'text-white' },
  };

  const s = styles[variant];
  const baseClasses = [
    s.bg,
    s.border ?? '',
    'rounded-xl items-center justify-center',
    fullWidth ? 'w-full' : '',
    disabled || loading ? 'opacity-40' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={{ height: 56 }}
      className={baseClasses}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : '#00B4D8'} />
      ) : (
        <Text
          className={`${s.text} text-base`}
          style={{ fontFamily: 'Inter_600SemiBold' }}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}
