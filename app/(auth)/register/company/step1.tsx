import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import StepProgressBar from '@/components/ui/StepProgressBar';
import { C } from '@/constants/theme';

const schema = z.object({
  companyName: z.string().min(2, 'Required'),
  ein:         z.string().regex(/^\d{2}-\d{7}$/, 'Format: XX-XXXXXXX'),
  phone:       z.string().min(7, 'Required'),
  email:       z.string().email('Enter a valid email'),
  password:    z.string().min(8, 'Min 8 characters'),
  address:     z.string().min(5, 'Required'),
  city:        z.string().min(2, 'Required'),
  state:       z.string().min(2, 'Required'),
  zip:         z.string().min(3, 'Required'),
});

type FormData = z.infer<typeof schema>;

export default function CompanyStep1() {
  const router = useRouter();
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onNext = (data: FormData) => {
    router.push({ pathname: '/(auth)/register/company/step2', params: data } as any);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: 24 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, paddingBottom: 8 }}>
            <Feather name="chevron-left" size={20} color={C.textPrimary} />
            <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_400Regular', marginLeft: 4 }}>Back</Text>
          </TouchableOpacity>

          <View style={{ paddingTop: 8, paddingBottom: 24 }}>
            <StepProgressBar current={1} total={4} />
            <Text style={{ color: C.textPrimary, fontSize: 26, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>Business Information</Text>
            <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 6 }}>Tell us about your cleaning company</Text>
          </View>

          <Controller control={control} name="companyName" render={({ field: { onChange, value } }) => (
            <Input label="Company Name" value={value} onChangeText={onChange} iconName="briefcase" placeholder="CleanPro Services LLC" error={errors.companyName?.message} />
          )} />
          <Controller control={control} name="ein" render={({ field: { onChange, value } }) => (
            <Input label="EIN" value={value} onChangeText={onChange} iconName="hash" placeholder="XX-XXXXXXX" error={errors.ein?.message} />
          )} />
          <Controller control={control} name="phone" render={({ field: { onChange, value } }) => (
            <Input label="Phone" value={value} onChangeText={onChange} keyboardType="phone-pad" iconName="phone" placeholder="(305) 555-0123" error={errors.phone?.message} />
          )} />
          <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
            <Input label="Email" value={value} onChangeText={onChange} keyboardType="email-address" autoCapitalize="none" iconName="mail" placeholder="admin@company.com" error={errors.email?.message} />
          )} />
          <Controller control={control} name="password" render={({ field: { onChange, value } }) => (
            <Input label="Password" value={value} onChangeText={onChange} secureTextEntry iconName="lock" placeholder="Min 8 characters" error={errors.password?.message} />
          )} />

          <Text style={{ color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 8 }}>
            Business Address
          </Text>
          <Controller control={control} name="address" render={({ field: { onChange, value } }) => (
            <Input label="Street Address" value={value} onChangeText={onChange} iconName="map-pin" placeholder="123 Main St" error={errors.address?.message} />
          )} />
          <Controller control={control} name="city"  render={({ field: { onChange, value } }) => (
            <Input label="City"  value={value} onChangeText={onChange} iconName="map" placeholder="Miami" error={errors.city?.message} />
          )} />
          <Controller control={control} name="state" render={({ field: { onChange, value } }) => (
            <Input label="State" value={value} onChangeText={onChange} placeholder="FL" error={errors.state?.message} />
          )} />
          <Controller control={control} name="zip"   render={({ field: { onChange, value } }) => (
            <Input label="ZIP" value={value} onChangeText={onChange} keyboardType="number-pad" iconName="hash" placeholder="33101" error={errors.zip?.message} />
          )} />

          <View style={{ marginTop: 8, marginBottom: 40 }}>
            <Button label="Continue" onPress={handleSubmit(onNext)} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
