import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
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

const STEP_TITLES = ['Personal Info', 'Location', 'Review'];

export default function ClientRegister() {
  const router = useRouter();
  const { country: initialCountry = 'usa' } = useLocalSearchParams<{ country?: string }>();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, watch, trigger, formState: { errors } } = useForm<FormData>({
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
    });
    console.log('signUp result:', authData, authError);
    if (authError || !authData.user) {
      Alert.alert('Error', authError?.message ?? 'Registration failed');
      setLoading(false);
      return;
    }
    await supabase.from('users').insert({
      id: authData.user.id, email: data.email, role: 'client', status: 'approved', country: data.country,
    });
    const clientResult = await supabase.from('clients').insert({
      user_id: authData.user.id, full_name: data.fullName, phone: data.phone,
      address: '', city: data.city, zip: data.zip, country: data.country,
    });
    console.log('insert result:', clientResult);
    setLoading(false);
    router.replace('/(client)/home');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: 24 }}>
          <TouchableOpacity
            onPress={() => step > 1 ? setStep(step - 1) : router.back()}
            style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, paddingBottom: 8 }}
          >
            <Feather name="chevron-left" size={20} color={C.textPrimary} />
            <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_400Regular', marginLeft: 4 }}>Back</Text>
          </TouchableOpacity>

          <View style={{ paddingTop: 8, paddingBottom: 24 }}>
            <StepProgressBar current={step} total={3} />
            <Text style={{ color: C.textPrimary, fontSize: 26, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>{STEP_TITLES[step - 1]}</Text>
            <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 6 }}>Create your ProVendor client account</Text>
          </View>

          {step === 1 && (
            <>
              <Controller control={control} name="fullName" render={({ field: { onChange, value } }) => (
                <Input label="Full Name" value={value} onChangeText={onChange} iconName="user" placeholder="Maria Garcia" error={errors.fullName?.message} />
              )} />
              <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
                <Input label="Email" value={value} onChangeText={onChange} keyboardType="email-address" autoCapitalize="none" iconName="mail" placeholder="you@example.com" error={errors.email?.message} />
              )} />
              <Controller control={control} name="password" render={({ field: { onChange, value } }) => (
                <Input label="Password" value={value} onChangeText={onChange} secureTextEntry iconName="lock" placeholder="Min 8 characters" error={errors.password?.message} />
              )} />
              <Controller control={control} name="phone" render={({ field: { onChange, value } }) => (
                <Input label="Phone" value={value} onChangeText={onChange} keyboardType="phone-pad" iconName="phone" placeholder="(305) 555-0000" error={errors.phone?.message} />
              )} />
              <View style={{ marginTop: 8, marginBottom: 16 }}>
                <Button label="Continue" onPress={async () => {
                  const ok = await trigger(['fullName', 'email', 'password', 'phone']);
                  if (ok) setStep(2);
                }} />
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={{ color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Country</Text>
              <Controller control={control} name="country" render={({ field: { onChange, value } }) => (
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                  {([
                    { key: 'usa' as const, flag: '🇺🇸', label: 'United States' },
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
              <Controller control={control} name="city" render={({ field: { onChange, value } }) => (
                <Input label="City" value={value} onChangeText={onChange} iconName="map-pin" placeholder="Miami" error={errors.city?.message} />
              )} />
              <Controller control={control} name="zip" render={({ field: { onChange, value } }) => (
                <Input label="ZIP Code" value={value} onChangeText={onChange} keyboardType="number-pad" iconName="hash" placeholder="33101" error={errors.zip?.message} />
              )} />
              <View style={{ marginTop: 8, marginBottom: 16 }}>
                <Button label="Continue" onPress={async () => {
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
                  Your account will be created immediately and you can start posting cleaning jobs right away.
                </Text>
              </View>
              <View style={{ marginBottom: 40 }}>
                <Button label="Create Account" onPress={handleSubmit(onSubmit)} loading={loading} />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
