import { View, Text, TouchableOpacity } from 'react-native';
import { useI18n } from '@/hooks/useI18n';

export default function LanguageToggle() {
  const { language, switchLanguage } = useI18n();
  return (
    <View className="flex-row bg-gray-100 rounded-full p-1">
      {(['en', 'es'] as const).map((lang) => (
        <TouchableOpacity
          key={lang}
          onPress={() => switchLanguage(lang)}
          className={`px-4 py-1.5 rounded-full ${language === lang ? 'bg-primary' : ''}`}
        >
          <Text className={`text-sm font-body-medium ${language === lang ? 'text-white' : 'text-text-muted'}`}>
            {lang.toUpperCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
