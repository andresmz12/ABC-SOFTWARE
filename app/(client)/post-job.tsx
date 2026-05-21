import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useLang } from '@/context/LanguageContext';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Feather } from '@expo/vector-icons';
import Input from '@/components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import { useJobStore } from '@/store/jobStore';
import { supabase } from '@/lib/supabase';
import { C } from '@/constants/theme';

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
  const { t } = useLang();
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
      Alert.alert('Error', e.message ?? 'Failed to post job.');
    } finally {
      setSubmitting(false);
    }
  };

  const SectionLabel = ({ text }: { text: string }) => (
    <Text style={{ color: C.textSecondary, fontSize: 11, letterSpacing: 1, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', marginBottom: 10, marginTop: 4 }}>
      {text}
    </Text>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28, marginTop: 12 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
              <Feather name="arrow-left" size={22} color={C.textSecondary} />
            </TouchableOpacity>
            <Text style={{ color: C.textPrimary, fontSize: 24, fontFamily: 'Inter_700Bold' }}>
              {isColombia ? 'Publicar Trabajo' : t('client.postJob')}
            </Text>
          </View>

          <SectionLabel text={isColombia ? 'Tipo de Servicio' : t('jobs.serviceType')} />
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
            {(['commercial', 'residential'] as const).map((type) => {
              const isActive = serviceType === type;
              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => setValue('serviceType', type)}
                  style={{
                    flex: 1,
                    borderWidth: 1.5,
                    borderColor: isActive ? C.accent : C.line,
                    borderRadius: 12,
                    paddingVertical: 12,
                    alignItems: 'center',
                    backgroundColor: isActive ? '#2d1a0d' : C.surface,
                  }}
                  activeOpacity={0.75}
                >
                  <Feather
                    name={type === 'commercial' ? 'briefcase' : 'home'}
                    size={18}
                    color={isActive ? C.accent : C.textSecondary}
                    style={{ marginBottom: 4 }}
                  />
                  <Text style={{
                    fontSize: 13,
                    fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_400Regular',
                    color: isActive ? C.accent : C.textSecondary,
                  }}>
                    {t(`jobs.${type}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <SectionLabel text={isColombia ? 'Ubicación' : 'Location'} />
          <Controller control={control} name="city" render={({ field: { onChange, value } }) => (
            <Input
              label={isColombia ? 'Ciudad / Municipio' : t('registration.city')}
              value={value}
              onChangeText={onChange}
              iconName="map-pin"
              error={errors.city?.message}
            />
          )} />
          <Controller control={control} name="state" render={({ field: { onChange, value } }) => (
            <Input
              label={isColombia ? 'Departamento' : t('registration.state')}
              value={value}
              onChangeText={onChange}
              error={errors.state?.message}
            />
          )} />
          <Controller control={control} name="zip" render={({ field: { onChange, value } }) => (
            <Input
              label={isColombia ? 'Barrio (opcional)' : t('registration.zip')}
              value={value}
              onChangeText={onChange}
              keyboardType={isColombia ? 'default' : 'number-pad'}
              error={errors.zip?.message}
            />
          )} />

          <SectionLabel text={isColombia ? 'Fecha y Hora' : 'Schedule'} />
          <Controller control={control} name="scheduledDate" render={({ field: { onChange, value } }) => (
            <Input
              label={t('jobs.scheduledDate')}
              value={value}
              onChangeText={onChange}
              placeholder={isColombia ? 'DD/MM/AAAA' : 'MM/DD/YYYY'}
              iconName="calendar"
              error={errors.scheduledDate?.message}
            />
          )} />
          <Controller control={control} name="scheduledTime" render={({ field: { onChange, value } }) => (
            <Input
              label={t('jobs.scheduledTime')}
              value={value}
              onChangeText={onChange}
              placeholder="HH:MM"
              iconName="clock"
              error={errors.scheduledTime?.message}
            />
          )} />
          <Controller control={control} name="estimatedHours" render={({ field: { onChange, value } }) => (
            <Input
              label={t('jobs.estimatedHours')}
              value={value}
              onChangeText={onChange}
              keyboardType="decimal-pad"
              error={errors.estimatedHours?.message}
            />
          )} />

          <SectionLabel text={isColombia ? 'Presupuesto' : 'Budget'} />
          <Controller control={control} name="budget" render={({ field: { onChange, value } }) => (
            <Input
              label={isColombia ? 'Presupuesto (COP)' : t('jobs.budget')}
              placeholder={isColombia ? 'Ej: 350000' : 'e.g. 150'}
              value={value}
              onChangeText={onChange}
              keyboardType="decimal-pad"
              iconName="dollar-sign"
              error={errors.budget?.message}
            />
          )} />

          <SectionLabel text={isColombia ? 'Descripción' : 'Description'} />
          <Controller control={control} name="description" render={({ field: { onChange, value } }) => (
            <Input
              label={t('jobs.description')}
              value={value}
              onChangeText={onChange}
              multiline
              numberOfLines={3}
            />
          )} />

          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={submitting}
            style={{
              backgroundColor: C.accent,
              borderRadius: 12,
              height: 56,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: submitting ? 0.6 : 1,
              marginTop: 12,
            }}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={{ color: '#000', fontSize: 16, fontFamily: 'Inter_600SemiBold' }}>
                {isColombia ? 'Publicar Trabajo' : t('common.submit')}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
