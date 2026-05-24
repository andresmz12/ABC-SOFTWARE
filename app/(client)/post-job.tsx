import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useLang } from '@/context/LanguageContext';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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
  estimatedHours: z.string().min(1),
  budget: z.string().min(1),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function formatDateInput(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

function formatTimeInput(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}:${d.slice(2)}`;
}

function parseDateInput(value: string): string | null {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, mm, dd, yyyy] = match;
  const d = new Date(`${yyyy}-${mm}-${dd}T12:00:00`);
  if (isNaN(d.getTime())) return null;
  return `${yyyy}-${mm}-${dd}`;
}

function parseTimeInput(value: string, ampm: 'AM' | 'PM'): string | null {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;
  if (ampm === 'AM') {
    if (hours === 12) hours = 0;
  } else {
    if (hours !== 12) hours += 12;
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
}

async function uploadJobPhoto(userId: string, uri: string, index: number): Promise<string | null> {
  try {
    const ext = uri.split('.').pop()?.split('?')[0] ?? 'jpg';
    const path = `${userId}/${Date.now()}_${index}.${ext}`;
    const response = await fetch(uri);
    const blob = await response.blob();
    const { error } = await supabase.storage.from('job-photos').upload(path, blob, { contentType: `image/${ext}` });
    if (error) throw error;
    const { data } = supabase.storage.from('job-photos').getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

export default function PostJob() {
  const { t, lang } = useLang();
  const router = useRouter();
  const { user } = useAuthStore();
  const { addJob } = useJobStore();
  const [submitting, setSubmitting] = useState(false);
  const isColombia = user?.country === 'colombia';
  const es = lang === 'es';

  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM');
  const [dateError, setDateError] = useState('');
  const [timeError, setTimeError] = useState('');
  const [county, setCounty] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { serviceType: 'residential' },
  });

  const serviceType = watch('serviceType');

  const pickPhoto = async () => {
    if (photos.length >= 3) {
      Alert.alert(es ? 'Límite alcanzado' : 'Limit reached', es ? 'Máximo 3 fotos.' : 'Maximum 3 photos.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(es ? 'Permiso requerido' : 'Permission required', es ? 'Se necesita acceso a la galería.' : 'Gallery access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: true });
    if (result.canceled || !result.assets[0]) return;
    setUploadingPhoto(true);
    const url = await uploadJobPhoto(user!.id, result.assets[0].uri, photos.length);
    setUploadingPhoto(false);
    if (url) {
      setPhotos((prev) => [...prev, url]);
    } else {
      Alert.alert(es ? 'Error' : 'Error', es ? 'No se pudo subir la foto.' : 'Failed to upload photo.');
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!user) return;

    const isoDate = parseDateInput(scheduledDate);
    const isoTime = parseTimeInput(scheduledTime, ampm);

    let hasError = false;
    if (!isoDate) {
      setDateError(es ? 'Formato inválido. Usa MM/DD/AAAA' : 'Invalid format. Use MM/DD/YYYY');
      hasError = true;
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(isoDate + 'T12:00:00') < today) {
        setDateError(es ? 'La fecha no puede ser en el pasado.' : 'Date cannot be in the past.');
        hasError = true;
      } else {
        setDateError('');
      }
    }
    if (!isoTime) {
      setTimeError(es ? 'Formato inválido. Usa HH:MM' : 'Invalid format. Use HH:MM');
      hasError = true;
    } else {
      setTimeError('');
    }
    if (hasError) return;

    // If date is today, check that the combined datetime is still in the future
    if (isoDate && isoTime) {
      const scheduledDT = new Date(`${isoDate}T${isoTime}`);
      if (scheduledDT <= new Date()) {
        setTimeError(es ? 'La hora seleccionada ya pasó.' : 'The selected time has already passed.');
        return;
      }
    }

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
        scheduled_date: isoDate!,
        scheduled_time: isoTime!,
        estimated_hours: parseFloat(data.estimatedHours),
        description: data.description ?? null,
        status: 'open',
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        photos: photos.length > 0 ? photos : null,
      };

      if (isColombia) {
        insertData.budget_cop = budgetNum;
        if (county.trim()) insertData.county = county.trim();
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
          {isColombia && (
            <Input
              label={es ? 'Barrio / Vereda (opcional)' : 'Neighborhood / County (optional)'}
              value={county}
              onChangeText={setCounty}
              placeholder={es ? 'Ej: Chapinero, Kennedy...' : 'e.g. El Poblado...'}
              iconName="map"
            />
          )}

          {/* Schedule */}
          <SectionLabel text={es ? 'Fecha y Hora' : 'Schedule'} />
          <Input
            label={es ? 'Fecha (MM/DD/AAAA)' : 'Date (MM/DD/YYYY)'}
            placeholder="MM/DD/YYYY"
            value={scheduledDate}
            onChangeText={(v) => { setScheduledDate(formatDateInput(v)); setDateError(''); }}
            keyboardType="numeric"
            maxLength={10}
            iconName="calendar"
            error={dateError || undefined}
          />
          <Input
            label={es ? 'Hora' : 'Time'}
            placeholder="HH:MM"
            value={scheduledTime}
            onChangeText={(v) => { setScheduledTime(formatTimeInput(v)); setTimeError(''); }}
            keyboardType="numeric"
            maxLength={5}
            iconName="clock"
            error={timeError || undefined}
            rightElement={
              <View style={{ flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: C.line }}>
                {(['AM', 'PM'] as const).map((period) => (
                  <TouchableOpacity
                    key={period}
                    onPress={() => setAmpm(period)}
                    style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: ampm === period ? C.accent : 'transparent' }}
                  >
                    <Text style={{ color: ampm === period ? '#000' : C.textSecondary, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
                      {period}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            }
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

          {/* Photos */}
          <SectionLabel text={es ? 'Fotos (opcional)' : 'Photos (optional)'} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            {photos.map((uri, idx) => (
              <View key={idx} style={{ position: 'relative' }}>
                <Image source={{ uri }} style={{ width: 88, height: 88, borderRadius: 10, backgroundColor: C.surface2 }} />
                <TouchableOpacity
                  onPress={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                  style={{ position: 'absolute', top: -6, right: -6, backgroundColor: C.danger, borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Feather name="x" size={11} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 3 && (
              <TouchableOpacity
                onPress={pickPhoto}
                disabled={uploadingPhoto}
                style={{ width: 88, height: 88, borderRadius: 10, borderWidth: 1.5, borderColor: C.line, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface }}
                activeOpacity={0.75}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator color={C.accent} size="small" />
                ) : (
                  <>
                    <Feather name="camera" size={20} color={C.textMuted} style={{ marginBottom: 4 }} />
                    <Text style={{ color: C.textMuted, fontSize: 10, fontFamily: 'Inter_400Regular' }}>
                      {es ? 'Agregar' : 'Add photo'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

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
    </View>
  );
}
