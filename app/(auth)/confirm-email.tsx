import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/context/LanguageContext';
import { C } from '@/constants/theme';

export default function ConfirmEmail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lang } = useLang();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const es = lang === 'es';
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      const appUrl = process.env.EXPO_PUBLIC_APP_URL ?? '';
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: appUrl || undefined },
      });
      if (error) throw error;
      setResent(true);
    } catch (e: any) {
      Alert.alert(
        es ? 'Error' : 'Error',
        e.message ?? (es ? 'No se pudo reenviar el correo.' : 'Could not resend email.'),
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background, paddingTop: insets.top }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>

        {/* Icon */}
        <View style={{
          width: 88,
          height: 88,
          borderRadius: 44,
          backgroundColor: `${C.accent}18`,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 28,
          borderWidth: 2,
          borderColor: `${C.accent}30`,
        }}>
          <Feather name="mail" size={40} color={C.accent} />
        </View>

        {/* Title */}
        <Text style={{
          color: C.textPrimary,
          fontSize: 28,
          fontFamily: 'Inter_700Bold',
          textAlign: 'center',
          marginBottom: 12,
          letterSpacing: -0.5,
        }}>
          {es ? 'Confirma tu correo' : 'Confirm your email'}
        </Text>

        {/* Subtitle */}
        <Text style={{
          color: C.textSecondary,
          fontSize: 15,
          fontFamily: 'Inter_400Regular',
          textAlign: 'center',
          lineHeight: 24,
          marginBottom: 8,
        }}>
          {es
            ? 'Te enviamos un enlace de confirmación a'
            : 'We sent a confirmation link to'}
        </Text>
        {email ? (
          <Text style={{
            color: C.textPrimary,
            fontSize: 15,
            fontFamily: 'Inter_600SemiBold',
            textAlign: 'center',
            marginBottom: 28,
          }}>
            {email}
          </Text>
        ) : (
          <View style={{ marginBottom: 28 }} />
        )}

        {/* Instruction box */}
        <View style={{
          backgroundColor: C.surface,
          borderRadius: 16,
          padding: 20,
          width: '100%',
          borderWidth: 1,
          borderColor: C.line,
          marginBottom: 32,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: `${C.accent}18`, alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 1 }}>
              <Text style={{ color: C.accent, fontSize: 12, fontFamily: 'Inter_700Bold' }}>1</Text>
            </View>
            <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', flex: 1, lineHeight: 21 }}>
              {es
                ? 'Abre el correo que te enviamos'
                : 'Open the email we sent you'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: `${C.accent}18`, alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 1 }}>
              <Text style={{ color: C.accent, fontSize: 12, fontFamily: 'Inter_700Bold' }}>2</Text>
            </View>
            <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', flex: 1, lineHeight: 21 }}>
              {es
                ? 'Haz clic en "Confirmar correo electrónico"'
                : 'Click "Confirm your email address"'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: `${C.accent}18`, alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 1 }}>
              <Text style={{ color: C.accent, fontSize: 12, fontFamily: 'Inter_700Bold' }}>3</Text>
            </View>
            <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', flex: 1, lineHeight: 21 }}>
              {es
                ? 'Regresa aquí e inicia sesión'
                : 'Come back here and sign in'}
            </Text>
          </View>
        </View>

        {/* Go to login */}
        <TouchableOpacity
          onPress={() => router.replace('/(auth)/login')}
          style={{
            backgroundColor: C.accent,
            borderRadius: 12,
            height: 56,
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            marginBottom: 16,
          }}
          activeOpacity={0.85}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontFamily: 'Inter_600SemiBold' }}>
            {es ? 'Ir a Iniciar Sesión' : 'Go to Sign In'}
          </Text>
        </TouchableOpacity>

        {/* Resend */}
        {resent ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
            <Feather name="check-circle" size={16} color={C.success} style={{ marginRight: 6 }} />
            <Text style={{ color: C.success, fontSize: 14, fontFamily: 'Inter_500Medium' }}>
              {es ? '¡Correo reenviado!' : 'Email resent!'}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleResend}
            disabled={resending || !email}
            style={{ paddingVertical: 12, alignItems: 'center' }}
            activeOpacity={0.7}
          >
            {resending ? (
              <ActivityIndicator color={C.accent} />
            ) : (
              <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular' }}>
                {es ? '¿No llegó? ' : "Didn't receive it? "}
                <Text style={{ color: C.accent, fontFamily: 'Inter_600SemiBold' }}>
                  {es ? 'Reenviar correo' : 'Resend email'}
                </Text>
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
