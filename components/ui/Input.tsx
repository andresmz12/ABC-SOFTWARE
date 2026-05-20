import { View, Text, TextInput, TextInputProps } from 'react-native';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export default function Input({ label, error, leftIcon, rightIcon, className, ...props }: Props) {
  return (
    <View className="mb-4">
      {label && <Text className="text-text-main font-body-medium text-sm mb-1">{label}</Text>}
      <View className={`flex-row items-center bg-white border rounded-xl px-4 h-12 ${error ? 'border-danger' : 'border-gray-200'}`}>
        {leftIcon && <View className="mr-2">{leftIcon}</View>}
        <TextInput
          className="flex-1 text-text-main font-body text-base"
          placeholderTextColor="#6B7280"
          {...props}
        />
        {rightIcon && <View className="ml-2">{rightIcon}</View>}
      </View>
      {error && <Text className="text-danger text-xs mt-1">{error}</Text>}
    </View>
  );
}
