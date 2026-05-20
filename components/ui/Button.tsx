import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';

type Variant = 'primary' | 'secondary' | 'outline' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}

const variantStyles: Record<Variant, { container: string; text: string }> = {
  primary:   { container: 'bg-primary',   text: 'text-white' },
  secondary: { container: 'bg-secondary', text: 'text-white' },
  outline:   { container: 'bg-transparent border border-primary', text: 'text-primary' },
  danger:    { container: 'bg-danger',    text: 'text-white' },
};

export default function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
  className = '',
}: Props) {
  const styles = variantStyles[variant];
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`${styles.container} rounded-xl py-4 items-center justify-center ${fullWidth ? 'w-full' : ''} ${disabled || loading ? 'opacity-50' : ''} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#1B3A6B' : '#fff'} />
      ) : (
        <Text className={`${styles.text} font-body-bold text-base`}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}
