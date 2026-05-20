import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import StepProgressBar from '@/components/ui/StepProgressBar';

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(7),
  country: z.enum(['usa', 'colombia']),
  city: z.string().min(2),
  zip: z.string().min(3),
});

type FormData = z.infer<typeof schema>;

export default function ClientRegister() {
  const router = useRouter();
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { country: 'usa' },
  });

  const country = watch('country');

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });
    if (authError || !authData.user) {
      Alert.alert('Error', authError?.message ?? 'Registration failed');
      setLoading(false);
      return;
    }
    await supabase.from('users').insert({
      id: authData.user.id,
      email: data.email,
      role: 'client',
      status: 'approved',
      country: data.country,
    });
    await supabase.from('clients').insert({
      user_id: authData.user.id,
      full_name: data.fullName,
      phone: data.phone,
      address: '',
      city: data.city,
      zip: data.zip,
      country: data.country,
    });
    setLoading(false);
    router.replace('/(client)/home');
  };

  return (
    <ScreenWrapper scroll className="px-6">
      <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : router.back()} className="pt-6 pb-4">
        <Text className="text-primary font-body">← {t('common.back')}</Text>
      </TouchableOpacity>
      <StepProgressBar current={step} total={3} />
      <Text className="text-primary text-2xl font-heading mb-6">
        {step === 1 ? t('registration.personalInfo') : step === 2 ? t('registration.serviceInfo') : t('registration.review')}
      </Text>

      {step === 1 && (
        <>
          <Controller control={control} name="fullName" render={({ field: { onChange, value } }) => (
            <Input label={t('registration.fullName')} value={value} onChangeText={onChange} error={errors.fullName?.message} />
          )} />
          <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
            <Input label={t('auth.email')} value={value} onChangeText={onChange} keyboardType="email-address" autoCapitalize="none" error={errors.email?.message} />
          )} />
          <Controller control={control} name="password" render={({ field: { onChange, value } }) => (
            <Input label={t('auth.password')} value={value} onChangeText={onChange} secureTextEntry error={errors.password?.message} />
          )} />
          <Controller control={control} name="phone" render={({ field: { onChange, value } }) => (
            <Input label={t('registration.phone')} value={value} onChangeText={onChange} keyboardType="phone-pad" error={errors.phone?.message} />
          )} />
          <Button label={t('common.next')} onPress={() => setStep(2)} />
        </>
      )}
      {step === 2 && (
        <>
          <Text className="text-text-main font-body-medium mb-3">{t('registration.selectCountry')}</Text>
          <View className="flex-row gap-3 mb-4">
            {(['usa', 'colombia'] as const).map((c) => (
              <Controller key={c} control={control} name="country" render={({ field: { onChange, value } }) => (
                <TouchableOpacity onPress={() => onChange(c)} className={`flex-1 border rounded-xl py-3 items-center ${value === c ? 'bg-primary border-primary' : 'border-gray-200'}`}>
                  <Text className={value === c ? 'text-white font-body-bold' : 'text-text-main'}>{c === 'usa' ? t('registration.usa') : t('registration.colombia')}</Text>
                </TouchableOpacity>
              )} />
            ))}
          </View>
          <Controller control={control} name="city" render={({ field: { onChange, value } }) => (
            <Input label={t('registration.city')} value={value} onChangeText={onChange} error={errors.city?.message} />
          )} />
          <Controller control={control} name="zip" render={({ field: { onChange, value } }) => (
            <Input label={t('registration.zip')} value={value} onChangeText={onChange} keyboardType="number-pad" error={errors.zip?.message} />
          )} />
          <Button label={t('common.next')} onPress={() => setStep(3)} />
        </>
      )}
      {step === 3 && (
        <View>
          <Text className="text-text-muted font-body mb-6">{t('registration.accountCreatedMessage')}</Text>
          <Button label={t('registration.createAccount')} onPress={handleSubmit(onSubmit)} loading={loading} />
        </View>
      )}
    </ScreenWrapper>
  );
}
