import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import LocationSelector from '@/components/ui/LocationSelector';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useLang } from '@/context/LanguageContext';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import StepProgressBar from '@/components/ui/StepProgressBar';
import { C } from '@/constants/theme';

const schema = z.object({
  fullName: z.string().min(2, 'Required'),
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Min 8 characters'),
  phone:    z.string().min(7, 'Required'),
  country:  z.enum(['usa', 'colombia']),
  city:     z.string().min(2, 'Required'),
  zip:      z.string().min(3, 'Required'),
});

type FormData = z.infer<typeof schema>;

export default function ClientRegister() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lang } = useLang();
  const es = lang === 'es';
  const { initialize } = useAuthStore();
  const { country: initialCountry = 'usa' } = useLocalSearchParams<{ country?: string }>();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [clientState, setClientState] = useState('');

  const STEP_TITLES = es
    ? ['Información Personal', 'Ubicación', 'Revisar']
    : ['Personal Info', 'Location', 'Review'];

  const { control, handleSubmit, watch, trigger, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { country: initialCountry as 'usa' | 'colombia' },
  });

  const country = watch('country');

  const onSubmit = async (data: FormData) => {
    console.log('Create Account tapped');
    setLoading(true);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          role: 'client',
          country: data.country,
          preferred_language: data.country === 'colombia' ? 'es' : 'en',
        },
      },
    });
    console.log('signUp result:', authData, authError);
    if (authError || !authData.user) {
      Alert.alert('Error', authError?.message ?? (es ? 'Registro falló' : 'Registration failed'));
      setLoading(false);
      return;
    }
    const clientResult = await supabase.from('clients').insert({
      user_id: authData.user.id, full_name: data.fullName, phone: data.phone,
      address: '', city: data.city, state: clientState, zip: data.zip, country: data.country,
    });
    console.log('insert result:', clientResult);
    if (clientResult.error) {
      Alert.alert('Error', clientResult.error.message ?? (es ? 'Error al guardar perfil.' : 'Failed to save profile.'));
      setLoading(false);
      return;
    }
    await initialize();
    setLoading(false);
    router.replace('/(client)/home');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 120 }}>
        <View style={{ paddingHorizontal: 24 }}>
          <TouchableOpacity
            onPress={() => step > 1 ? setStep(step - 1) : router.back()}
            style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, paddingBottom: 8 }}
          >
            <Feather name="chevron-left" size={20} color={C.textPrimary} />
            <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_400Regular', marginLeft: 4 }}>
              {es ? 'Atrás' : 'Back'}
            </Text>
          </TouchableOpacity>

          <View style={{ paddingTop: 8, paddingBottom: 24 }}>
            <StepProgressBar current={step} total={3} />
            <Text style={{ color: C.textPrimary, fontSize: 26, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>{STEP_TITLES[step - 1]}</Text>
            <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 6 }}>
              {es ? 'Crea tu cuenta de cliente ProVendor' : 'Create your ProVendor client account'}
            </Text>
          </View>

          {step === 1 && (
            <>
              <Controller control={control} name="fullName" render={({ field: { onChange, value } }) => (
                <Input label={es ? 'Nombre Completo' : 'Full Name'} value={value} onChangeText={onChange} iconName="user" placeholder={es ? 'Maria García' : 'Maria Garcia'} error={errors.fullName?.message} />
              )} />
              <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
                <Input label={es ? 'Correo' : 'Email'} value={value} onChangeText={onChange} keyboardType="email-address" autoCapitalize="none" iconName="mail" placeholder="you@example.com" error={errors.email?.message} />
              )} />
              <Controller control={control} name="password" render={({ field: { onChange, value } }) => (
                <Input label={es ? 'Contraseña' : 'Password'} value={value} onChangeText={onChange} secureTextEntry iconName="lock" placeholder={es ? 'Mínimo 8 caracteres' : 'Min 8 characters'} error={errors.password?.message} />
              )} />
              <Controller control={control} name="phone" render={({ field: { onChange, value } }) => (
                <Input label={es ? 'Teléfono' : 'Phone'} value={value} onChangeText={onChange} keyboardType="phone-pad" iconName="phone" placeholder="(305) 555-0000" error={errors.phone?.message} />
              )} />
              <View style={{ marginTop: 8, marginBottom: 16 }}>
                <Button label={es ? 'Continuar' : 'Continue'} onPress={async () => {
                  const ok = await trigger(['fullName', 'email', 'password', 'phone']);
                  if (ok) setStep(2);
                }} />
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={{ color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                {es ? 'País' : 'Country'}
              </Text>
              <Controller control={control} name="country" render={({ field: { onChange, value } }) => (
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                  {([
                    { key: 'usa' as const, flag: '🇺🇸', label: es ? 'Estados Unidos' : 'United States' },
                    { key: 'colombia' as const, flag: '🇨🇴', label: 'Colombia' },
                  ]).map((c) => {
                    const active = value === c.key;
                    return (
                      <TouchableOpacity
                        key={c.key}
                        onPress={() => onChange(c.key)}
                        style={{ flex: 1, backgroundColor: active ? `${C.accent}15` : C.surface, borderWidth: 1.5, borderColor: active ? C.accent : C.line, borderRadius: 14, padding: 16, alignItems: 'center' }}
                        activeOpacity={0.85}
                      >
                        <Text style={{ fontSize: 26, marginBottom: 8 }}>{c.flag}</Text>
                        <Text style={{ color: active ? C.textPrimary : C.textMuted, fontSize: 13, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }}>{c.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )} />
              <LocationSelector
                country={country as 'usa' | 'colombia'}
                state={clientState}
                city={watch('city') ?? ''}
                onStateChange={(s) => { setClientState(s); setValue('city', '', { shouldValidate: false }); }}
                onCityChange={(c) => setValue('city', c, { shouldValidate: true })}
                cityError={errors.city?.message}
                es={es}
              />
              <Controller control={control} name="zip" render={({ field: { onChange, value } }) => (
                <Input label={country === 'colombia' ? (es ? 'Código Postal' : 'Postal Code') : (es ? 'Código ZIP' : 'ZIP Code')} value={value} onChangeText={onChange} keyboardType="number-pad" iconName="hash" placeholder={country === 'colombia' ? '110111' : '33101'} error={errors.zip?.message} />
              )} />
              <View style={{ marginTop: 8, marginBottom: 16 }}>
                <Button label={es ? 'Continuar' : 'Continue'} onPress={async () => {
                  if (!clientState) {
                    Alert.alert(
                      es ? 'Campo requerido' : 'Required field',
                      es ? 'Por favor selecciona un estado/departamento.' : 'Please select a state/department.',
                    );
                    return;
                  }
                  const ok = await trigger(['country', 'city', 'zip']);
                  if (ok) setStep(3);
                }} />
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 20, marginBottom: 24 }}>
                <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22 }}>
                  {es
                    ? 'Tu cuenta se creará inmediatamente y podrás empezar a publicar trabajos de limpieza.'
                    : 'Your account will be created immediately and you can start posting cleaning jobs right away.'}
                </Text>
              </View>
              <View style={{ marginBottom: 40 }}>
                <Button label={es ? 'Crear Cuenta' : 'Create Account'} onPress={handleSubmit(onSubmit)} loading={loading} />
              </View>
            </>
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
