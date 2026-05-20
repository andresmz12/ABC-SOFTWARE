import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import StepProgressBar from '@/components/ui/StepProgressBar';

const schema = z.object({
  companyName: z.string().min(2),
  ein: z.string().regex(/^\d{2}-\d{7}$/, 'Format: XX-XXXXXXX'),
  phone: z.string().min(7),
  email: z.string().email(),
  password: z.string().min(8),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  zip: z.string().min(3),
});

type FormData = z.infer<typeof schema>;

export default function CompanyStep1() {
  const router = useRouter();
  const { t } = useTranslation();
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onNext = (data: FormData) => {
    router.push({ pathname: '/(auth)/register/company/step2', params: data } as any);
  };

  return (
    <ScreenWrapper scroll className="px-6">
      <TouchableOpacity onPress={() => router.back()} className="pt-6 pb-4">
        <Text className="text-primary font-body">← {t('common.back')}</Text>
      </TouchableOpacity>
      <StepProgressBar current={1} total={4} />
      <Text className="text-primary text-2xl font-heading mb-6">{t('registration.businessInfo')}</Text>

      {(['companyName', 'ein', 'phone', 'email', 'password', 'address', 'city', 'state', 'zip'] as const).map((field) => (
        <Controller key={field} control={control} name={field} render={({ field: { onChange, value } }) => (
          <Input
            label={t(`registration.${field === 'companyName' ? 'companyName' : field === 'ein' ? 'ein' : field}`)}
            value={value}
            onChangeText={onChange}
            secureTextEntry={field === 'password'}
            keyboardType={field === 'email' ? 'email-address' : field === 'phone' ? 'phone-pad' : 'default'}
            autoCapitalize={field === 'email' || field === 'password' ? 'none' : 'words'}
            error={errors[field]?.message}
          />
        )} />
      ))}
      <Button label={t('common.next')} onPress={handleSubmit(onNext)} />
    </ScreenWrapper>
  );
}
