import { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import Input from '@/components/ui/Input';
import { C } from '@/constants/theme';

const schema = z.object({ email: z.string().email() });
type FormData = z.infer<typeof schema>;

export default function ForgotPassword() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: 'provendor://reset-password',
    });
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
    } else {
      setSent(true);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }} keyboardShouldPersistTaps="handled">
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 32 }}
        >
          <Feather name="arrow-left" size={20} color={C.textSecondary} />
          <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', marginLeft: 8 }}>
            Back
          </Text>
        </TouchableOpacity>

        <Text style={{ color: C.textPrimary, fontSize: 32, fontFamily: 'Inter_700Bold', marginBottom: 4 }}>
          Reset Password
        </Text>
        <Text style={{ color: C.textSecondary, fontSize: 15, fontFamily: 'Inter_400Regular', marginBottom: 32 }}>
          Enter your email and we'll send you a reset link.
        </Text>

        {sent ? (
          <View style={{
            backgroundColor: C.surface,
            borderRadius: 20,
            padding: 32,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: C.success,
          }}>
            <View style={{
              width: 72,
              height: 72,
              backgroundColor: '#0d2d1a',
              borderRadius: 36,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}>
              <Feather name="mail" size={32} color={C.success} />
            </View>
            <Text style={{ color: C.textPrimary, fontSize: 20, fontFamily: 'Inter_700Bold', marginBottom: 8 }}>
              Check your email
            </Text>
            <Text style={{
              color: C.textSecondary,
              fontSize: 14,
              fontFamily: 'Inter_400Regular',
              textAlign: 'center',
              lineHeight: 22,
              marginBottom: 28,
            }}>
              We sent a password reset link to your email address.
            </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login' as any)}>
              <Text style={{ color: C.accent, fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>
                Back to Sign In
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {error && (
              <View style={{
                backgroundColor: '#3a1a1a',
                borderRadius: 12,
                padding: 12,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: C.danger,
              }}>
                <Text style={{ color: C.danger, fontSize: 13, fontFamily: 'Inter_400Regular' }}>{error}</Text>
              </View>
            )}

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
                  iconName="mail"
                  error={errors.email?.message}
                />
              )}
            />

            <TouchableOpacity
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
              style={{
                backgroundColor: C.accent,
                borderRadius: 12,
                height: 56,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: loading ? 0.6 : 1,
                marginTop: 8,
              }}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={{ color: '#000', fontSize: 16, fontFamily: 'Inter_600SemiBold' }}>
                  Send Reset Link
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
