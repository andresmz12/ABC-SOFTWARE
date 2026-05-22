import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Feather } from '@expo/vector-icons';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import StepProgressBar from '@/components/ui/StepProgressBar';
import { C } from '@/constants/theme';
import { useRegistrationStore } from '@/store/registrationStore';
import type { Country } from '@/types';

const schema = z.object({
  fullName:    z.string().min(2, 'Required'),
  dateOfBirth: z.string().min(8, 'Enter date of birth'),
  phone:       z.string().min(7, 'Required'),
  email:       z.string().email('Enter a valid email'),
  password:    z.string().min(8, 'Min 8 characters'),
  address:     z.string().min(5, 'Required'),
  city:        z.string().min(2, 'Required'),
  state:       z.string().min(2, 'Required'),
  zip:         z.string().min(3, 'Required'),
});

type FormData = z.infer<typeof schema>;

export default function IndependentStep1() {
  const router = useRouter();
  const { country = 'usa' } = useLocalSearchParams<{ country?: string }>();
  const isColombia = country === 'colombia';
  const { setCountry, mergeFormData } = useRegistrationStore();

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onNext = (data: FormData) => {
    setCountry(country as Country);
    mergeFormData(data);
    router.push({ pathname: '/(auth)/register/independent/step2', params: { country } } as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ paddingHorizontal: 24 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, paddingBottom: 8 }}>
            <Feather name="chevron-left" size={20} color={C.textPrimary} />
            <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_400Regular', marginLeft: 4 }}>
              {isColombia ? 'Atrás' : 'Back'}
            </Text>
          </TouchableOpacity>

          {/* Country badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 16 }}>{isColombia ? '🇨🇴' : '🇺🇸'}</Text>
            <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_500Medium', marginLeft: 6 }}>
              {isColombia ? 'Colombia · COP' : 'United States · USD'}
            </Text>
          </View>

          <View style={{ paddingTop: 4, paddingBottom: 24 }}>
            <StepProgressBar current={1} total={4} />
            <Text style={{ color: C.textPrimary, fontSize: 26, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>
              {isColombia ? 'Información Personal' : 'Personal Information'}
            </Text>
            <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 6 }}>
              {isColombia ? 'Cuéntanos sobre ti' : 'Tell us about yourself'}
            </Text>
          </View>

          <Controller control={control} name="fullName" render={({ field: { onChange, value } }) => (
            <Input
              label={isColombia ? 'Nombre Completo' : 'Full Name'}
              value={value} onChangeText={onChange} iconName="user"
              placeholder={isColombia ? 'Juan García' : 'John Smith'}
              error={errors.fullName?.message}
            />
          )} />
          <Controller control={control} name="dateOfBirth" render={({ field: { onChange, value } }) => (
            <Input
              label={isColombia ? 'Fecha de Nacimiento' : 'Date of Birth'}
              value={value} onChangeText={onChange} iconName="calendar"
              placeholder={isColombia ? 'DD/MM/AAAA' : 'MM/DD/YYYY'}
              error={errors.dateOfBirth?.message}
            />
          )} />
          <Controller control={control} name="phone" render={({ field: { onChange, value } }) => (
            <Input
              label={isColombia ? 'Teléfono' : 'Phone'}
              value={value} onChangeText={onChange} iconName="phone" keyboardType="phone-pad"
              placeholder={isColombia ? '(601) 555-0000' : '(305) 555-0000'}
              error={errors.phone?.message}
            />
          )} />
          <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
            <Input
              label="Email"
              value={value} onChangeText={onChange} iconName="mail" keyboardType="email-address" autoCapitalize="none"
              placeholder="you@email.com"
              error={errors.email?.message}
            />
          )} />
          <Controller control={control} name="password" render={({ field: { onChange, value } }) => (
            <Input
              label={isColombia ? 'Contraseña' : 'Password'}
              value={value} onChangeText={onChange} iconName="lock" secureTextEntry
              placeholder={isColombia ? 'Mínimo 8 caracteres' : 'Min 8 characters'}
              error={errors.password?.message}
            />
          )} />

          <Text style={{ color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 8 }}>
            {isColombia ? 'Dirección de Residencia' : 'Home Address'}
          </Text>
          <Controller control={control} name="address" render={({ field: { onChange, value } }) => (
            <Input label={isColombia ? 'Dirección' : 'Street Address'} value={value} onChangeText={onChange} iconName="map-pin" placeholder={isColombia ? 'Calle 50 #45-30' : '123 Main St'} error={errors.address?.message} />
          )} />
          <Controller control={control} name="city" render={({ field: { onChange, value } }) => (
            <Input label={isColombia ? 'Ciudad' : 'City'} value={value} onChangeText={onChange} iconName="map" placeholder={isColombia ? 'Medellín' : 'Miami'} error={errors.city?.message} />
          )} />
          <Controller control={control} name="state" render={({ field: { onChange, value } }) => (
            <Input label={isColombia ? 'Departamento' : 'State'} value={value} onChangeText={onChange} placeholder={isColombia ? 'Antioquia' : 'FL'} error={errors.state?.message} />
          )} />
          <Controller control={control} name="zip" render={({ field: { onChange, value } }) => (
            <Input label={isColombia ? 'Código Postal' : 'ZIP Code'} value={value} onChangeText={onChange} iconName="hash" keyboardType="number-pad" placeholder={isColombia ? '050001' : '33101'} error={errors.zip?.message} />
          )} />

          <View style={{ marginTop: 8, marginBottom: 40 }}>
            <Button label={isColombia ? 'Continuar' : 'Continue'} onPress={handleSubmit(onNext)} />
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
