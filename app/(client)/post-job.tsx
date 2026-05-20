import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const schema = z.object({
  serviceType: z.enum(['commercial', 'residential']),
  city: z.string().min(2),
  zip: z.string().min(3),
  state: z.string().min(2),
  scheduledDate: z.string().min(8),
  scheduledTime: z.string().min(4),
  estimatedHours: z.string(),
  budget: z.string(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function PostJob() {
  const { t } = useTranslation();
  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { serviceType: 'residential' },
  });

  const serviceType = watch('serviceType');

  const onSubmit = (data: FormData) => {
    console.log('Post job:', data);
  };

  return (
    <ScreenWrapper scroll className="px-5">
      <View className="pt-6 pb-4">
        <Text className="text-primary text-2xl font-heading">{t('client.postJob')}</Text>
      </View>

      <Text className="text-text-main font-body-medium mb-3">{t('jobs.serviceType')}</Text>
      <View className="flex-row gap-3 mb-4">
        {(['commercial', 'residential'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            onPress={() => setValue('serviceType', type)}
            className={`flex-1 border rounded-xl py-3 items-center ${serviceType === type ? 'bg-primary border-primary' : 'border-gray-200'}`}
          >
            <Text className={`font-body-medium ${serviceType === type ? 'text-white' : 'text-text-main'}`}>
              {t(`jobs.${type}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Controller control={control} name="city" render={({ field: { onChange, value } }) => (
        <Input label={t('registration.city')} value={value} onChangeText={onChange} error={errors.city?.message} />
      )} />
      <Controller control={control} name="state" render={({ field: { onChange, value } }) => (
        <Input label={t('registration.state')} value={value} onChangeText={onChange} error={errors.state?.message} />
      )} />
      <Controller control={control} name="zip" render={({ field: { onChange, value } }) => (
        <Input label={t('registration.zip')} value={value} onChangeText={onChange} keyboardType="number-pad" error={errors.zip?.message} />
      )} />
      <Controller control={control} name="scheduledDate" render={({ field: { onChange, value } }) => (
        <Input label={t('jobs.scheduledDate')} value={value} onChangeText={onChange} placeholder="MM/DD/YYYY" error={errors.scheduledDate?.message} />
      )} />
      <Controller control={control} name="scheduledTime" render={({ field: { onChange, value } }) => (
        <Input label={t('jobs.scheduledTime')} value={value} onChangeText={onChange} placeholder="HH:MM AM/PM" error={errors.scheduledTime?.message} />
      )} />
      <Controller control={control} name="estimatedHours" render={({ field: { onChange, value } }) => (
        <Input label={t('jobs.estimatedHours')} value={value} onChangeText={onChange} keyboardType="decimal-pad" error={errors.estimatedHours?.message} />
      )} />
      <Controller control={control} name="budget" render={({ field: { onChange, value } }) => (
        <Input label={t('jobs.budget')} value={value} onChangeText={onChange} keyboardType="decimal-pad" error={errors.budget?.message} />
      )} />
      <Controller control={control} name="description" render={({ field: { onChange, value } }) => (
        <Input label={t('jobs.description')} value={value} onChangeText={onChange} multiline numberOfLines={3} />
      )} />

      <Button label={t('common.submit')} onPress={handleSubmit(onSubmit)} className="mt-2 mb-6" />
    </ScreenWrapper>
  );
}
