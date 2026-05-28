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
import { US_FREQUENCY_OPTIONS, CO_FREQUENCY_OPTIONS } from '@/lib/countryData';

const DAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;

function formatBudget(val: string, isColombia: boolean): string {
  const num = val.replace(/\D/g, '');
  if (!num) return '';
  return isColombia
    ? num.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    : num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

const schema = z.object({
  serviceType: z.enum(['commercial', 'residential']),
  city: z.string().min(2),
  zip: z.string().min(1),
  state: z.string().min(2),
  address: z.string().min(3, 'Address is required'),
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

  // All hooks must be declared unconditionally before any early return
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM');
  const [dateError, setDateError] = useState('');
  const [timeError, setTimeError] = useState('');
  const [county, setCounty] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  // Commercial-only fields
  const [frequency, setFrequency] = useState<string>('one_time');
  const [customDays, setCustomDays] = useState<string[]>([]);
  const [minStaff, setMinStaff] = useState<string>('1');
  // Property detail fields (optional)
  const [bedrooms, setBedrooms] = useState<string>('');
  const [bathrooms, setBathrooms] = useState<string>('');
  const [squareMeters, setSquareMeters] = useState<string>('');

  // Block if client is not yet approved
  if (user?.status !== 'approved') {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Feather name="clock" size={44} color={C.warning} />
        <Text style={{ color: C.textPrimary, fontSize: 20, fontFamily: 'Inter_700Bold', marginTop: 20, textAlign: 'center' }}>
          {es ? 'Verificación Pendiente' : 'Verification Pending'}
        </Text>
        <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 10, textAlign: 'center', lineHeight: 22 }}>
          {es
            ? 'Tu cuenta está pendiente de verificación. Revisaremos tu documento y te notificaremos cuando sea aprobada.'
            : 'Your account is pending verification. We will review your document and notify you when it is approved.'}
        </Text>
      </View>
    );
  }

  const { control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
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
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as any, quality: 0.7, allowsEditing: true });
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
      // Strip all non-digits (Colombia uses dots, USA uses commas as separators)
      const budgetNum = parseInt(data.budget.replace(/\D/g, ''), 10);
      if (isNaN(budgetNum) || budgetNum <= 0) {
        Alert.alert(
          es ? 'Presupuesto inválido' : 'Invalid budget',
          es ? 'Ingresa un monto válido mayor a 0.' : 'Please enter a valid amount greater than 0.',
        );
        setSubmitting(false);
        return;
      }
      const insertData: Record<string, unknown> = {
        client_id: user.id,
        service_type: data.serviceType,
        city: data.city,
        state: data.state,
        zip: data.zip,
        address: data.address,
        country: user.country,
        scheduled_date: isoDate!,
        scheduled_time: isoTime!,
        estimated_hours: parseFloat(data.estimatedHours),
        description: data.description ?? null,
        status: 'open',
        photos: photos.length > 0 ? photos : null,
      };

      if (isColombia) {
        insertData.budget_cop = budgetNum;
        if (county.trim()) insertData.county = county.trim();
      } else {
        insertData.budget_usd = budgetNum;
      }

      // Commercial-only fields
      if (data.serviceType === 'commercial') {
        const freqValue = frequency === 'custom' ? `custom:${customDays.join(',')}` : frequency;
        insertData.frequency = freqValue;
        const staffNum = parseInt(minStaff, 10);
        if (!isNaN(staffNum) && staffNum > 0) insertData.min_staff = staffNum;
      }

      // Optional property details
      if (data.serviceType === 'residential') {
        const bedroomsNum = parseInt(bedrooms, 10);
        const bathroomsNum = parseFloat(bathrooms);
        if (!isNaN(bedroomsNum) && bedroomsNum > 0) insertData.bedrooms = bedroomsNum;
        if (!isNaN(bathroomsNum) && bathroomsNum > 0) insertData.bathrooms = bathroomsNum;
      }
      const sqm = parseFloat(squareMeters.replace(/[^0-9.]/g, ''));
      if (!isNaN(sqm) && sqm > 0) insertData.square_meters = sqm;

      const { data: newJob, error } = await supabase
        .from('job_requests')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      addJob(newJob);
      Alert.alert(
        es ? '¡Trabajo publicado!' : 'Job Posted!',
        es
          ? '¡Trabajo publicado! Los proveedores en tu área recibirán una notificación.'
          : 'Job posted! Providers in your area will be notified.',
        [{
          text: 'OK',
          onPress: () => {
            // Reset form so it's clean for the next post
            reset({ serviceType: 'residential', address: '', city: '', state: '', zip: '', estimatedHours: '', budget: '' });
            setScheduledDate('');
            setScheduledTime('');
            setAmpm('AM');
            setPhotos([]);
            setCounty('');
            setFrequency('one_time');
            setCustomDays([]);
            setMinStaff('1');
            setBedrooms('');
            setBathrooms('');
            setSquareMeters('');
            router.replace('/(client)/my-requests' as any);
          },
        }],
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
                    backgroundColor: isActive ? '#E0F7FA' : C.surface,
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

          {/* Residential property details (optional) */}
          {serviceType === 'residential' && (
            <>
              <SectionLabel text={es ? 'Detalles de la Propiedad (opcional)' : 'Property Details (optional)'} />

              {/* Bedrooms */}
              <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_500Medium', marginBottom: 8 }}>
                {es ? 'Habitaciones' : 'Bedrooms'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                {['1', '2', '3', '4', '5', '6+'].map((n) => {
                  const isActive = bedrooms === n;
                  return (
                    <TouchableOpacity
                      key={n}
                      onPress={() => setBedrooms(isActive ? '' : n)}
                      style={{
                        flex: 1, paddingVertical: 10, borderRadius: 10,
                        borderWidth: 1.5,
                        borderColor: isActive ? C.accent : C.line,
                        backgroundColor: isActive ? '#E0F7FA' : C.surface,
                        alignItems: 'center',
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={{ fontSize: 13, fontFamily: isActive ? 'Inter_700Bold' : 'Inter_400Regular', color: isActive ? C.accent : C.textSecondary }}>
                        {n}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Bathrooms */}
              <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_500Medium', marginBottom: 8 }}>
                {es ? 'Baños' : 'Bathrooms'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                {['1', '1.5', '2', '2.5', '3', '3+'].map((n) => {
                  const isActive = bathrooms === n;
                  return (
                    <TouchableOpacity
                      key={n}
                      onPress={() => setBathrooms(isActive ? '' : n)}
                      style={{
                        flex: 1, paddingVertical: 10, borderRadius: 10,
                        borderWidth: 1.5,
                        borderColor: isActive ? C.accent : C.line,
                        backgroundColor: isActive ? '#E0F7FA' : C.surface,
                        alignItems: 'center',
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={{ fontSize: 13, fontFamily: isActive ? 'Inter_700Bold' : 'Inter_400Regular', color: isActive ? C.accent : C.textSecondary }}>
                        {n}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Square meters */}
              <Input
                label={es ? 'Metros cuadrados (m²)' : 'Square meters (m²)'}
                placeholder={es ? 'Ej: 85' : 'e.g. 85'}
                value={squareMeters}
                onChangeText={setSquareMeters}
                keyboardType="decimal-pad"
                iconName="maximize"
              />
            </>
          )}

          {/* Commercial-only fields */}
          {serviceType === 'commercial' && (
            <>
              <SectionLabel text={es ? 'Frecuencia del Servicio' : 'Service Frequency'} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {(isColombia ? CO_FREQUENCY_OPTIONS : US_FREQUENCY_OPTIONS).concat({ value: 'custom', label: es ? 'Días personalizados' : 'Custom days' }).map((opt) => {
                  const isActive = frequency === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => { setFrequency(opt.value); if (opt.value !== 'custom') setCustomDays([]); }}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 20,
                        borderWidth: 1.5,
                        borderColor: isActive ? C.accent : C.line,
                        backgroundColor: isActive ? '#E0F7FA' : C.surface,
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={{ fontSize: 13, fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_400Regular', color: isActive ? C.accent : C.textSecondary }}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {frequency === 'custom' && (
                <>
                  <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 8 }}>
                    {es ? 'Selecciona los días:' : 'Select days:'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
                    {(es ? DAYS_ES : DAYS_EN).map((day, idx) => {
                      const dayKey = DAYS_EN[idx];
                      const isActive = customDays.includes(dayKey);
                      return (
                        <TouchableOpacity
                          key={dayKey}
                          onPress={() => setCustomDays((prev) => isActive ? prev.filter((d) => d !== dayKey) : [...prev, dayKey])}
                          style={{
                            flex: 1,
                            paddingVertical: 8,
                            borderRadius: 8,
                            borderWidth: 1.5,
                            borderColor: isActive ? C.accent : C.line,
                            backgroundColor: isActive ? '#E0F7FA' : C.surface,
                            alignItems: 'center',
                          }}
                          activeOpacity={0.75}
                        >
                          <Text style={{ fontSize: 11, fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_400Regular', color: isActive ? C.accent : C.textSecondary }}>
                            {day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              <SectionLabel text={es ? 'Personal mínimo requerido' : 'Minimum staff required'} />
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {['1', '2', '3', '4', '5+'].map((n) => {
                  const isActive = minStaff === n;
                  return (
                    <TouchableOpacity
                      key={n}
                      onPress={() => setMinStaff(n)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 10,
                        borderWidth: 1.5,
                        borderColor: isActive ? C.accent : C.line,
                        backgroundColor: isActive ? '#E0F7FA' : C.surface,
                        alignItems: 'center',
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={{ fontSize: 14, fontFamily: isActive ? 'Inter_700Bold' : 'Inter_400Regular', color: isActive ? C.accent : C.textSecondary }}>
                        {n}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Commercial square meters */}
              <Input
                label={es ? 'Metros cuadrados (m²) — opcional' : 'Square meters (m²) — optional'}
                placeholder={es ? 'Ej: 500' : 'e.g. 500'}
                value={squareMeters}
                onChangeText={setSquareMeters}
                keyboardType="decimal-pad"
                iconName="maximize"
              />
            </>
          )}

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

          {/* Exact address */}
          <Controller control={control} name="address" render={({ field: { onChange, value } }) => (
            <Input
              label={es ? 'Dirección exacta *' : 'Exact Address *'}
              placeholder={es ? 'Ej: 123 Main St, Apt 4B' : 'e.g. 123 Main St, Apt 4B'}
              value={value}
              onChangeText={onChange}
              iconName="home"
              error={errors.address?.message}
            />
          )} />

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
              placeholder={isColombia ? 'Ej: 350.000' : 'e.g. 1,500'}
              value={value}
              onChangeText={(v) => onChange(formatBudget(v, isColombia))}
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
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontFamily: 'Inter_600SemiBold' }}>
                {t('common.submit')}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
