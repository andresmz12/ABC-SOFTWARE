import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import Button from '@/components/ui/Button';
import StepProgressBar from '@/components/ui/StepProgressBar';

const SERVICE_TYPES = ['commercial', 'residential', 'both'] as const;
const US_STATES = ['Alabama','Arizona','California','Colorado','Florida','Georgia','Illinois','New York','Texas','Virginia'];

export default function IndependentStep2() {
  const router = useRouter();
  const { t } = useTranslation();
  const [serviceType, setServiceType] = useState('both');
  const [selectedStates, setSelectedStates] = useState<string[]>([]);

  const toggleState = (s: string) => setSelectedStates((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]);

  return (
    <ScreenWrapper scroll className="px-6">
      <TouchableOpacity onPress={() => router.back()} className="pt-6 pb-4">
        <Text className="text-primary font-body">← {t('common.back')}</Text>
      </TouchableOpacity>
      <StepProgressBar current={2} total={4} />
      <Text className="text-primary text-2xl font-heading mb-6">{t('registration.serviceInfo')}</Text>
      <Text className="text-text-main font-body-medium mb-3">{t('registration.serviceType')}</Text>
      <View className="flex-row gap-2 mb-6">
        {SERVICE_TYPES.map((type) => (
          <TouchableOpacity key={type} onPress={() => setServiceType(type)}
            className={`flex-1 border rounded-xl py-3 items-center ${serviceType === type ? 'bg-primary border-primary' : 'border-gray-200'}`}>
            <Text className={`text-sm font-body-medium ${serviceType === type ? 'text-white' : 'text-text-main'}`}>{t(`registration.${type}`)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text className="text-text-main font-body-medium mb-3">{t('registration.serviceAreas')}</Text>
      <View className="flex-row flex-wrap gap-2 mb-6">
        {US_STATES.map((state) => (
          <TouchableOpacity key={state} onPress={() => toggleState(state)}
            className={`border rounded-lg px-3 py-2 ${selectedStates.includes(state) ? 'bg-primary border-primary' : 'border-gray-300'}`}>
            <Text className={`text-xs ${selectedStates.includes(state) ? 'text-white' : 'text-text-muted'}`}>{state}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Button label={t('common.next')} onPress={() => router.push('/(auth)/register/independent/step3' as any)} disabled={selectedStates.length === 0} />
    </ScreenWrapper>
  );
}
