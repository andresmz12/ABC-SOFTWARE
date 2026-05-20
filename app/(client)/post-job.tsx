import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { useJobStore } from '@/store/jobStore';
import { supabase } from '@/lib/supabase';

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
  const router = useRouter();
  const { user } = useAuthStore();
  const { addJob } = useJobStore();
  const [submitting, setSubmitting] = useState(false);
  const isColombia = user?.country === 'colombia';

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { serviceType: 'residential' },
  });

  const serviceType = watch('serviceType');

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    setSubmitting(true);
    try {
      const budgetNum = parseFloat(data.budget.replace(/[^0-9.]/g, ''));
      const insertData: Record<string, unknown> = {
        client_id: user.id,
        service_type: data.serviceType,
        city: data.city,
        state: data.state,
        zip: data.zip,
        country: user.country,
        scheduled_date: data.scheduledDate,
        scheduled_time: data.scheduledTime,
        estimated_hours: parseFloat(data.estimatedHours),
        description: data.description ?? null,
        status: 'open',
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      };

      if (isColombia) {
        insertData.budget_cop = budgetNum;
      } else {
        insertData.budget_usd = budgetNum;
      }

      const { data: newJob, error } = await supabase
        .from('job_requests')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      addJob(newJob);
      Alert.alert(
        isColombia ? '¡Publicado!' : 'Job Posted!',
        isColombia
          ? 'Tu solicitud ha sido publicada. Los proveedores cercanos podrán aplicar.'
          : 'Your job has been posted. Providers in your area can now apply.',
        [{ text: 'OK', onPress: () => router.push('/(client)/my-requests' as any) }],
      );
    } catch (e: any) {
      Alert.alert(
        isColombia ? 'Error' : 'Error',
        e.message ?? 'Failed to post job.',
      );
    } finally {
      setSubmitting(false);
    }
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
        <Input label={isColombia ? 'Ciudad / Municipio' : t('registration.city')} value={value} onChangeText={onChange} error={errors.city?.message} />
      )} />
      <Controller control={control} name="state" render={({ field: { onChange, value } }) => (
        <Input label={isColombia ? 'Departamento' : t('registration.state')} value={value} onChangeText={onChange} error={errors.state?.message} />
      )} />
      {!isColombia && (
        <Controller control={control} name="zip" render={({ field: { onChange, value } }) => (
          <Input label={t('registration.zip')} value={value} onChangeText={onChange} keyboardType="number-pad" error={errors.zip?.message} />
        )} />
      )}
      {isColombia && (
        <Controller control={control} name="zip" render={({ field: { onChange, value } }) => (
          <Input label="Barrio (opcional)" value={value} onChangeText={onChange} />
        )} />
      )}
      <Controller control={control} name="scheduledDate" render={({ field: { onChange, value } }) => (
        <Input label={t('jobs.scheduledDate')} value={value} onChangeText={onChange} placeholder={isColombia ? 'DD/MM/AAAA' : 'MM/DD/YYYY'} error={errors.scheduledDate?.message} />
      )} />
      <Controller control={control} name="scheduledTime" render={({ field: { onChange, value } }) => (
        <Input label={t('jobs.scheduledTime')} value={value} onChangeText={onChange} placeholder="HH:MM" error={errors.scheduledTime?.message} />
      )} />
      <Controller control={control} name="estimatedHours" render={({ field: { onChange, value } }) => (
        <Input label={t('jobs.estimatedHours')} value={value} onChangeText={onChange} keyboardType="decimal-pad" error={errors.estimatedHours?.message} />
      )} />
      <Controller control={control} name="budget" render={({ field: { onChange, value } }) => (
        <Input
          label={isColombia ? 'Presupuesto (COP)' : t('jobs.budget')}
          placeholder={isColombia ? 'Ej: 350000' : 'e.g. 150'}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          error={errors.budget?.message}
        />
      )} />
      <Controller control={control} name="description" render={({ field: { onChange, value } }) => (
        <Input label={t('jobs.description')} value={value} onChangeText={onChange} multiline numberOfLines={3} />
      )} />

      {submitting ? (
        <ActivityIndicator className="my-4" />
      ) : (
        <Button label={isColombia ? 'Publicar Trabajo' : t('common.submit')} onPress={handleSubmit(onSubmit)} className="mt-2 mb-6" />
      )}
    </ScreenWrapper>
  );
}
