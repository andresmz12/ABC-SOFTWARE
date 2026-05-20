import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const schema = z.object({ email: z.string().email() });
type FormData = z.infer<typeof schema>;

export default function ForgotPassword() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: 'provendor://reset-password',
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <ScreenWrapper scroll className="px-6">
      <TouchableOpacity onPress={() => router.back()} className="pt-6 pb-4">
        <Text className="text-primary font-body">← Back</Text>
      </TouchableOpacity>

      <Text className="text-primary text-3xl font-heading mb-1 mt-4">Reset Password</Text>
      <Text className="text-text-muted font-body mb-8">
        Enter your email and we'll send you a link to reset your password.
      </Text>

      {sent ? (
        <View className="bg-green-50 border border-green-200 rounded-2xl p-5 items-center">
          <Text className="text-4xl mb-3">📬</Text>
          <Text className="text-green-700 font-body-bold text-base mb-1">Check your email</Text>
          <Text className="text-green-600 font-body text-sm text-center leading-5">
            We sent a password reset link to your email address.
          </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')} className="mt-4">
            <Text className="text-primary font-body-bold">Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Email Address"
                value={value}
                onChangeText={onChange}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email?.message}
              />
            )}
          />

          {loading ? (
            <ActivityIndicator className="mt-4" />
          ) : (
            <Button label="Send Reset Link" onPress={handleSubmit(onSubmit)} className="mt-2" />
          )}
        </>
      )}
    </ScreenWrapper>
  );
}
