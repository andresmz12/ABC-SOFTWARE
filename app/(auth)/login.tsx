import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { C } from '@/constants/theme';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Minimum 6 characters'),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const router = useRouter();
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
      Alert.alert('Sign in failed', error.message);
    } else {
      await initialize();
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: 24 }}>

          {/* Back */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, paddingBottom: 8 }}
          >
            <Feather name="chevron-left" size={20} color={C.textPrimary} />
            <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_400Regular', marginLeft: 4 }}>Back</Text>
          </TouchableOpacity>

          <View style={{ paddingTop: 32, paddingBottom: 40 }}>
            <Text style={{ color: C.textPrimary, fontSize: 32, fontFamily: 'Inter_700Bold', marginBottom: 8, letterSpacing: -0.5 }}>
              Welcome back
            </Text>
            <Text style={{ color: C.textSecondary, fontSize: 16, fontFamily: 'Inter_400Regular' }}>
              Sign in to your ProVendor account
            </Text>
          </View>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Email"
                value={value}
                onChangeText={onChange}
                keyboardType="email-address"
                autoCapitalize="none"
                iconName="mail"
                placeholder="you@example.com"
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Password"
                value={value}
                onChangeText={onChange}
                secureTextEntry
                iconName="lock"
                placeholder="••••••••"
                error={errors.password?.message}
              />
            )}
          />

          <TouchableOpacity style={{ alignSelf: 'flex-end', marginBottom: 32, marginTop: -8 }}>
            <Text style={{ color: C.accent, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>Forgot password?</Text>
          </TouchableOpacity>

          <Button label="Sign In" onPress={handleSubmit(onSubmit)} loading={loading} />

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 24 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
            <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', marginHorizontal: 12 }}>or</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
          </View>

          <Button
            label="Create Account"
            variant="secondary"
            onPress={() => router.push('/(auth)/welcome')}
          />

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
