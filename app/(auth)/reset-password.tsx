import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/context/LanguageContext';
import Input from '@/components/ui/Input';
import { C } from '@/constants/theme';

const schema = z
  .object({
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'passwords_mismatch',
    path: ['confirmPassword'],
  });
type FormData = z.infer<typeof schema>;

export default function ResetPassword() {
  const router = useRouter();
  const { t, lang } = useLang();
  const es = lang === 'es';
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // On web, supabase-js (detectSessionInUrl: true) parses the recovery link's URL
  // hash into a session automatically. On native there is no such parsing, so we
  // do it ourselves from the deep link below.
  const [ready, setReady] = useState(Platform.OS === 'web');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (Platform.OS === 'web') return;

    (async () => {
      const url = await Linking.getInitialURL();
      const fragment = url?.split('#')[1];
      const params = new URLSearchParams(fragment ?? '');
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      if (!access_token || !refresh_token) {
        setError(es ? 'Enlace inválido o expirado.' : 'Invalid or expired link.');
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (sessionError) setError(sessionError.message);
      else setReady(true);
    })();
  }, []);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password: data.password });
    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }
    // Drop the one-time recovery session so the user signs in fresh.
    await supabase.auth.signOut();
    setLoading(false);
    setDone(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: insets.top + 12 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ color: C.textPrimary, fontSize: 32, fontFamily: 'Inter_700Bold', marginBottom: 4 }}>
          {es ? 'Nueva Contraseña' : 'New Password'}
        </Text>
        <Text style={{ color: C.textSecondary, fontSize: 15, fontFamily: 'Inter_400Regular', marginBottom: 32 }}>
          {es ? 'Ingresa tu nueva contraseña.' : 'Enter your new password.'}
        </Text>

        {done ? (
          <View
            style={{
              backgroundColor: C.surface,
              borderRadius: 20,
              padding: 32,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: C.success,
            }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                backgroundColor: '#D1FAE5',
                borderRadius: 36,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}
            >
              <Feather name="check" size={32} color={C.success} />
            </View>
            <Text style={{ color: C.textPrimary, fontSize: 20, fontFamily: 'Inter_700Bold', marginBottom: 8 }}>
              {es ? 'Contraseña actualizada' : 'Password updated'}
            </Text>
            <Text
              style={{
                color: C.textSecondary,
                fontSize: 14,
                fontFamily: 'Inter_400Regular',
                textAlign: 'center',
                lineHeight: 22,
                marginBottom: 28,
              }}
            >
              {es ? 'Ya puedes iniciar sesión con tu nueva contraseña.' : 'You can now sign in with your new password.'}
            </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login' as any)}>
              <Text style={{ color: C.accent, fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>
                {es ? 'Ir a Iniciar Sesión' : 'Go to Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : !ready ? (
          error ? (
            <View
              style={{
                backgroundColor: '#FFE4E6',
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: C.danger,
              }}
            >
              <Text style={{ color: C.danger, fontSize: 14, fontFamily: 'Inter_400Regular' }}>{error}</Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/forgot-password' as any)} style={{ marginTop: 12 }}>
                <Text style={{ color: C.accent, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                  {es ? 'Solicitar nuevo enlace' : 'Request a new link'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ActivityIndicator color={C.accent} />
          )
        ) : (
          <>
            {error && (
              <View
                style={{
                  backgroundColor: '#FFE4E6',
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: C.danger,
                }}
              >
                <Text style={{ color: C.danger, fontSize: 13, fontFamily: 'Inter_400Regular' }}>{error}</Text>
              </View>
            )}

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <Input
                  label={es ? 'Nueva Contraseña' : 'New Password'}
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry
                  iconName="lock"
                  error={errors.password?.message ? (es ? 'Mínimo 6 caracteres' : 'Minimum 6 characters') : undefined}
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <Input
                  label={es ? 'Confirmar Contraseña' : 'Confirm Password'}
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry
                  iconName="lock"
                  error={
                    errors.confirmPassword?.message
                      ? es
                        ? 'Las contraseñas no coinciden'
                        : 'Passwords do not match'
                      : undefined
                  }
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
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontFamily: 'Inter_600SemiBold' }}>
                  {es ? 'Actualizar Contraseña' : 'Update Password'}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}
