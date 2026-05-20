import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { formatUSPhone, formatCOCelular, formatCOFijo } from '@/lib/countryData';
import type { Country } from '@/types';

interface Props {
  label?: string;
  country: Country;
  value: string;
  onChange: (formatted: string) => void;
  error?: string;
}

export default function PhoneInput({ label, country, value, onChange, error }: Props) {
  const [phoneType, setPhoneType] = useState<'celular' | 'fijo'>('celular');

  const handleChange = (raw: string) => {
    if (country === 'usa') {
      onChange(formatUSPhone(raw));
    } else {
      onChange(phoneType === 'celular' ? formatCOCelular(raw) : formatCOFijo(raw));
    }
  };

  const onPhoneTypeChange = (type: 'celular' | 'fijo') => {
    setPhoneType(type);
    onChange('');
  };

  const placeholder = country === 'usa'
    ? '+1 (555) 555-5555'
    : phoneType === 'celular' ? '+57 300 000 0000' : '+57 (4) 222 0000';

  return (
    <View className="mb-4">
      {label && <Text className="text-text-main font-body-medium text-sm mb-1">{label}</Text>}

      {country === 'colombia' && (
        <View className="flex-row gap-2 mb-2">
          {(['celular', 'fijo'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => onPhoneTypeChange(t)}
              className={`flex-1 border rounded-lg py-2 items-center ${phoneType === t ? 'bg-primary border-primary' : 'border-gray-200'}`}
            >
              <Text className={`text-sm font-body-medium ${phoneType === t ? 'text-white' : 'text-text-muted'}`}>
                {t === 'celular' ? 'Celular' : 'Teléfono fijo'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View className={`flex-row items-center bg-white border rounded-xl px-4 h-12 ${error ? 'border-danger' : 'border-gray-200'}`}>
        <Text className="text-text-muted font-body text-base mr-1">
          {country === 'usa' ? '🇺🇸' : '🇨🇴'}
        </Text>
        <TextInput
          className="flex-1 text-text-main font-body text-base"
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          keyboardType="phone-pad"
        />
      </View>
      {error && <Text className="text-danger text-xs mt-1">{error}</Text>}
    </View>
  );
}
