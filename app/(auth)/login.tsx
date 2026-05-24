import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLang } from '@/context/LanguageContext';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { registerAndSavePushToken } from '@/lib/notifications';
import Input from '@/components/ui/Input';
import { C } from '@/constants/theme';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const router = useRouter();
  const { t, lang } = useLang();
  const es = lang === 'es';
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { initialize } = useAuthStore();

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }
    await initialize();
    setLoading(false);
    const { user: loggedInUser } = useAuthStore.getState();
    if (loggedInUser?.id) {
      // Register push notifications in background after login — never block the UI
      registerAndSavePushToken(loggedInUser.id).catch(() => {});
    }
    if (loggedInUser?.role === 'client') router.replace('/(client)/home');
    else if (loggedInUser?.role === 'company' || loggedInUser?.role === 'independent') router.replace('/(provider)/home');
    else if (loggedInUser?.role === 'admin') router.replace('/(admin)/dashboard');
    else {
      // Authenticated but no profile found — likely email not yet confirmed
      await supabase.auth.signOut();
      setError(
        es
          ? 'Por favor verifica tu correo electrónico antes de iniciar sesión.'
          : 'Please verify your email address before signing in.',
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: insets.top + 12 }} keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 32 }}
          >
            <Feather name="arrow-left" size={20} color={C.textSecondary} />
            <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', marginLeft: 8 }}>
              {t('common.back')}
            </Text>
          </TouchableOpacity>

          <Text style={{ color: C.textPrimary, fontSize: 32, fontFamily: 'Inter_700Bold', marginBottom: 4 }}>
            {t('auth.signIn')}
          </Text>
          <Text style={{ color: C.textSecondary, fontSize: 15, fontFamily: 'Inter_400Regular', marginBottom: 32 }}>
            {t('auth.welcomeSubtitle')}
          </Text>

          {error && (
            <View style={{
              backgroundColor: '#FFE4E6',
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
                label={t('auth.email')}
                value={value}
                onChangeText={onChange}
                keyboardType="email-address"
                autoCapitalize="none"
                iconName="mail"
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
                iconName="lock"
                error={errors.password?.message}
              />
            )}
          />

          <TouchableOpacity
            onPress={() => router.push('/(auth)/forgot-password' as any)}
            style={{ alignSelf: 'flex-end', marginBottom: 24, marginTop: -4 }}
          >
            <Text style={{ color: C.accent, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
              {t('auth.forgotPassword')}
            </Text>
          </TouchableOpacity>

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
            }}
            activeOpacity={0.85}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontFamily: 'Inter_600SemiBold' }}>
              {loading ? t('common.loading') : t('auth.signIn')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/welcome' as any)}
            style={{ paddingVertical: 24, alignItems: 'center' }}
          >
            <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular' }}>
              {t('auth.dontHaveAccount')}{' '}
              <Text style={{ color: C.accent, fontFamily: 'Inter_600SemiBold' }}>
                {t('auth.registerHere')}
              </Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
