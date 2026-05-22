import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useLang } from '@/context/LanguageContext';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Feather } from '@expo/vector-icons';
import Input from '@/components/ui/Input';
import LocationSelector from '@/components/ui/LocationSelector';
import ScrollPicker from '@/components/ui/ScrollPicker';
import { useAuthStore } from '@/store/authStore';
import { useJobStore } from '@/store/jobStore';
import { supabase } from '@/lib/supabase';
import { C } from '@/constants/theme';

const schema = z.object({
  serviceType: z.enum(['commercial', 'residential']),
  city: z.string().min(2),
  zip: z.string().min(1),
  state: z.string().min(2),
  estimatedHours: z.string().min(1),
  budget: z.string().min(1),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

// Build lists of dates (today + 60 days) and times (every 30 min)
function buildDateItems(): { label: string; date: Date }[] {
  const items = [];
  for (let i = 0; i <= 60; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    items.push({ label: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }), date: d });
  }
  return items;
}

function buildTimeItems(): { label: string; hours: number; minutes: number }[] {
  const items = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const suffix = h < 12 ? 'AM' : 'PM';
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const mm = m === 0 ? '00' : '30';
      items.push({ label: `${h12}:${mm} ${suffix}`, hours: h, minutes: m });
    }
  }
  return items;
}

export default function PostJob() {
  const { t, lang } = useLang();
  const router = useRouter();
  const { user } = useAuthStore();
  const { addJob } = useJobStore();
  const [submitting, setSubmitting] = useState(false);
  const isColombia = user?.country === 'colombia';
  const es = lang === 'es';

  const dateItems = useMemo(() => buildDateItems(), []);
  const timeItems = useMemo(() => buildTimeItems(), []);

  const [dateIndex, setDateIndex] = useState(0);
  const [timeIndex, setTimeIndex] = useState(16); // default 8:00 AM
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { serviceType: 'residential' },
  });

  const serviceType = watch('serviceType');

  const selectedDate = dateItems[dateIndex].date;
  const selectedTime = timeItems[timeIndex];

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    setSubmitting(true);
    try {
      const budgetNum = parseFloat(data.budget.replace(/[^0-9.]/g, ''));
      const d = selectedDate;
      const hh = String(selectedTime.hours).padStart(2, '0');
      const mm = String(selectedTime.minutes).padStart(2, '0');
      const insertData: Record<string, unknown> = {
        client_id: user.id,
        service_type: data.serviceType,
        city: data.city,
        state: data.state,
        zip: data.zip,
        country: user.country,
        scheduled_date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        scheduled_time: `${hh}:${mm}:00`,
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
        es ? '¡Publicado!' : 'Job Posted!',
        es
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
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28, marginTop: 12 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
              <Feather name="arrow-left" size={22} color={C.textSecondary} />
            </TouchableOpacity>
            <Text style={{ color: C.textPrimary, fontSize: 24, fontFamily: 'Inter_700Bold' }}>
              {t('client.postJob')}
            </Text>
          </View>

          {/* Service type */}
          <SectionLabel text={t('jobs.serviceType')} />
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
                  <Feather name={type === 'commercial' ? 'briefcase' : 'home'} size={18} color={isActive ? C.accent : C.textSecondary} style={{ marginBottom: 4 }} />
                  <Text style={{ fontSize: 13, fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_400Regular', color: isActive ? C.accent : C.textSecondary }}>
                    {t(`jobs.${type}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Location */}
          <SectionLabel text={t('jobs.location')} />
          <LocationSelector
            country={isColombia ? 'colombia' : 'usa'}
            state={watch('state') ?? ''}
            city={watch('city') ?? ''}
            onStateChange={(s) => { setValue('state', s, { shouldValidate: true }); setValue('city', '', { shouldValidate: false }); }}
            onCityChange={(c) => setValue('city', c, { shouldValidate: true })}
            stateError={errors.state?.message}
            cityError={errors.city?.message}
            es={es}
          />
          <Controller control={control} name="zip" render={({ field: { onChange, value } }) => (
            <Input
              label={isColombia ? t('registration.barrio') : t('registration.zip')}
              value={value}
              onChangeText={onChange}
              keyboardType={isColombia ? 'default' : 'number-pad'}
              error={errors.zip?.message}
            />
          )} />

          {/* Schedule */}
          <SectionLabel text={es ? 'Fecha y Hora' : 'Schedule'} />

          <TouchableOpacity
            onPress={() => { setShowTimePicker(false); setShowDatePicker(true); }}
            style={{ backgroundColor: '#1C1C1C', padding: 16, borderRadius: 12, marginBottom: 12 }}
          >
            <Text style={{ color: '#fff' }}>📅 {dateItems[dateIndex].label}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { setShowDatePicker(false); setShowTimePicker(true); }}
            style={{ backgroundColor: '#1C1C1C', padding: 16, borderRadius: 12, marginBottom: 12 }}
          >
            <Text style={{ color: '#fff' }}>🕐 {timeItems[timeIndex].label}</Text>
          </TouchableOpacity>

          <Controller control={control} name="estimatedHours" render={({ field: { onChange, value } }) => (
            <Input
              label={t('jobs.estimatedHours')}
              value={value}
              onChangeText={onChange}
              keyboardType="decimal-pad"
              error={errors.estimatedHours?.message}
            />
          )} />

          {/* Budget */}
          <SectionLabel text={t('jobs.budget')} />
          <Controller control={control} name="budget" render={({ field: { onChange, value } }) => (
            <Input
              label={isColombia ? `${t('jobs.budget')} (COP)` : `${t('jobs.budget')} (USD)`}
              placeholder={isColombia ? 'Ej: 350.000' : 'e.g. 150'}
              value={value}
              onChangeText={onChange}
              keyboardType="decimal-pad"
              iconName="dollar-sign"
              error={errors.budget?.message}
            />
          )} />

          {/* Description */}
          <SectionLabel text={t('jobs.description')} />
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
            onPress={handleSubmit(onSubmit, () => {
              Alert.alert(
                es ? 'Campos requeridos' : 'Required fields',
                es ? 'Por favor completa todos los campos obligatorios.' : 'Please complete all required fields.',
              );
            })}
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
                {t('common.submit')}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <ScrollPicker
        visible={showDatePicker}
        title={es ? 'Seleccionar Fecha' : 'Select Date'}
        items={dateItems.map((d) => d.label)}
        selectedIndex={dateIndex}
        onConfirm={(i) => setDateIndex(i)}
        onClose={() => setShowDatePicker(false)}
      />
      <ScrollPicker
        visible={showTimePicker}
        title={es ? 'Seleccionar Hora' : 'Select Time'}
        items={timeItems.map((t) => t.label)}
        selectedIndex={timeIndex}
        onConfirm={(i) => setTimeIndex(i)}
        onClose={() => setShowTimePicker(false)}
      />
    </View>
  );
}
