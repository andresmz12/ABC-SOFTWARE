import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const { initialize } = useAuthStore();

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error) {
      Alert.alert(t('auth.loginFailed'), error.message);
      setLoading(false);
      return;
    }
    await initialize();
    setLoading(false);
    const { user: loggedInUser } = useAuthStore.getState();
    if (loggedInUser?.role === 'client') router.replace('/(client)/home');
    else if (loggedInUser?.role === 'company' || loggedInUser?.role === 'independent') router.replace('/(provider)/home');
    else if (loggedInUser?.role === 'admin') router.replace('/(admin)/dashboard');
    else router.replace('/(auth)/welcome');
  };

  return (
    <ScreenWrapper scroll className="px-6">
      <TouchableOpacity onPress={() => router.back()} className="pt-6 pb-4">
        <Text className="text-primary font-body">← {t('common.back')}</Text>
      </TouchableOpacity>

      <Text className="text-primary text-3xl font-heading mb-1 mt-4">{t('auth.signIn')}</Text>
      <Text className="text-text-muted font-body mb-8">{t('auth.welcomeSubtitle')}</Text>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <Input
            label={t('auth.email')}
            value={value}
            onChangeText={onChange}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <Input
            label={t('auth.password')}
            value={value}
            onChangeText={onChange}
            secureTextEntry
            error={errors.password?.message}
          />
        )}
      />

      <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password' as any)} className="self-end mb-6">
        <Text className="text-primary font-body text-sm">{t('auth.forgotPassword')}</Text>
      </TouchableOpacity>

      <Button label={t('auth.signIn')} onPress={handleSubmit(onSubmit)} loading={loading} />

      <TouchableOpacity onPress={() => router.push('/(auth)/welcome')} className="py-6 items-center">
        <Text className="text-text-muted font-body">
          {t('auth.dontHaveAccount')}{' '}
          <Text className="text-primary font-body-bold">{t('auth.registerHere')}</Text>
        </Text>
      </TouchableOpacity>
    </ScreenWrapper>
  );
}
