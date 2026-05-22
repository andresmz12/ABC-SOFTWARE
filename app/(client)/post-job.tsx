import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useLang } from '@/context/LanguageContext';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Feather } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import Input from '@/components/ui/Input';
import LocationSelector from '@/components/ui/LocationSelector';
import { useAuthStore } from '@/store/authStore';
import { useJobStore } from '@/store/jobStore';
import { supabase } from '@/lib/supabase';
import { C } from '@/constants/theme';

const schema = z.object({
  serviceType: z.enum(['commercial', 'residential']),
  city: z.string().min(2),
  zip: z.string().min(1),
  state: z.string().min(2),
  scheduledDate: z.string().min(8),
  scheduledTime: z.string().min(4),
  estimatedHours: z.string().min(1),
  budget: z.string().min(1),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function PostJob() {
  const { t, lang } = useLang();
  const router = useRouter();
  const { user } = useAuthStore();
  const { addJob } = useJobStore();
  const [submitting, setSubmitting] = useState(false);
  const isColombia = user?.country === 'colombia';
  const es = lang === 'es';

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [pickerTime, setPickerTime] = useState(new Date());

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { serviceType: 'residential' },
  });

  const serviceType = watch('serviceType');
  const scheduledDate = watch('scheduledDate');
  const scheduledTime = watch('scheduledTime');

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) {
      setPickerDate(date);
      setValue('scheduledDate', format(date, 'yyyy-MM-dd'), { shouldValidate: true });
    }
  };

  const handleTimeChange = (event: DateTimePickerEvent, time?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (time) {
      setPickerTime(time);
      setValue('scheduledTime', format(time, 'HH:mm'), { shouldValidate: true });
    }
  };

  const dateDisplay = scheduledDate
    ? (es ? format(new Date(scheduledDate + 'T12:00:00'), 'dd/MM/yyyy') : format(new Date(scheduledDate + 'T12:00:00'), 'MM/dd/yyyy'))
    : t('jobs.selectDate');
  const timeDisplay = scheduledTime || t('jobs.selectTime');

  const onSubmit = async (data: FormData) => {
    console.log('Post Job submit:', data);
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

      console.log('Inserting job:', insertData);
      const { data: newJob, error } = await supabase
        .from('job_requests')
        .insert(insertData)
        .select()
        .single();

      console.log('Insert result:', newJob, error);
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
      console.log('Post job error:', e);
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

  const PickerField = ({
    label, value, onPress, iconName, hasValue, error,
  }: { label: string; value: string; onPress: () => void; iconName: keyof typeof Feather.glyphMap; hasValue: boolean; error?: string }) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
        {label}
      </Text>
      <TouchableOpacity
        onPress={onPress}
        style={{
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: error ? C.danger : C.line,
          borderRadius: 12,
          height: 52,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
        }}
        activeOpacity={0.75}
      >
        <Feather name={iconName} size={16} color={C.textMuted} style={{ marginRight: 10 }} />
        <Text style={{ flex: 1, color: hasValue ? C.textPrimary : C.textMuted, fontSize: 15, fontFamily: 'Inter_400Regular' }}>
          {value}
        </Text>
        <Feather name="chevron-down" size={16} color={C.textMuted} />
      </TouchableOpacity>
      {error && <Text style={{ color: C.danger, fontSize: 12, marginTop: 4 }}>{error}</Text>}
    </View>
  );

  const DatePickerModal = ({ mode, visible, onClose, value, onChange }: {
    mode: 'date' | 'time'; visible: boolean; onClose: () => void;
    value: Date; onChange: (e: DateTimePickerEvent, d?: Date) => void;
  }) => (
    <Modal transparent animationType="slide" visible={visible}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <View style={{
          backgroundColor: C.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingTop: 16,
          paddingBottom: 40,
          paddingHorizontal: 20,
          borderTopWidth: 1,
          borderTopColor: C.line,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: C.textMuted, fontSize: 16, fontFamily: 'Inter_400Regular' }}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={{ color: C.textPrimary, fontSize: 16, fontFamily: 'Inter_600SemiBold' }}>
              {mode === 'date' ? t('jobs.selectDate') : t('jobs.selectTime')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: C.accent, fontSize: 16, fontFamily: 'Inter_600SemiBold' }}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            mode={mode}
            display="spinner"
            value={value}
            minimumDate={mode === 'date' ? new Date() : undefined}
            onChange={onChange}
            style={{ height: 200 }}
            textColor={C.textPrimary}
          />
        </View>
      </View>
    </Modal>
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
          <PickerField
            label={t('jobs.scheduledDate')}
            value={dateDisplay}
            hasValue={!!scheduledDate}
            onPress={() => setShowDatePicker(true)}
            iconName="calendar"
            error={errors.scheduledDate?.message}
          />
          <PickerField
            label={t('jobs.scheduledTime')}
            value={timeDisplay}
            hasValue={!!scheduledTime}
            onPress={() => setShowTimePicker(true)}
            iconName="clock"
            error={errors.scheduledTime?.message}
          />
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
            onPress={handleSubmit(onSubmit, (errs) => {
              console.log('Validation errors:', errs);
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

      {/* iOS pickers */}
      {Platform.OS === 'ios' && (
        <>
          <DatePickerModal
            mode="date"
            visible={showDatePicker}
            onClose={() => setShowDatePicker(false)}
            value={pickerDate}
            onChange={handleDateChange}
          />
          <DatePickerModal
            mode="time"
            visible={showTimePicker}
            onClose={() => setShowTimePicker(false)}
            value={pickerTime}
            onChange={handleTimeChange}
          />
        </>
      )}

      {/* Android pickers */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker mode="date" display="default" value={pickerDate} minimumDate={new Date()} onChange={handleDateChange} />
      )}
      {showTimePicker && Platform.OS === 'android' && (
        <DateTimePicker mode="time" display="default" value={pickerTime} onChange={handleTimeChange} />
      )}
    </View>
  );
}
