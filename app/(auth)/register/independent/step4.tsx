import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useLang } from '@/context/LanguageContext';
import { Feather } from '@expo/vector-icons';
import { useRegistrationStore } from '@/store/registrationStore';
import { useAuthStore } from '@/store/authStore';
import { getIndependentDocs } from '@/lib/docRequirements';
import { supabase } from '@/lib/supabase';
import StepProgressBar from '@/components/ui/StepProgressBar';
import { C } from '@/constants/theme';

export default function IndependentStep4() {
  const router = useRouter();
  const { t } = useLang();
  const { country, formData, reset } = useRegistrationStore();
  const { initialize } = useAuthStore();
  const isUSA = country !== 'colombia';
  const [loading, setLoading] = useState(false);

  const docs = getIndependentDocs(country ?? 'usa');

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });
      if (signUpError) throw signUpError;
      const userId = authData.user?.id;
      if (!userId) throw new Error('No user ID returned from sign up');

      const lang = country === 'colombia' ? 'es' : 'en';
      const { error: userError } = await supabase.from('users').insert({
        id: userId,
        email: formData.email,
        role: 'independent',
        status: 'pending',
        country: country ?? 'usa',
        preferred_language: lang,
      });
      if (userError) throw userError;

      const city   = formData.city ?? '';
      const state  = formData.stateOrDept ?? formData.state ?? '';
      const zip    = formData.zip ?? '';
      const street = formData.address ?? '';

      const { error: indError } = await supabase.from('independents').insert({
        user_id: userId,
        full_name: formData.fullName,
        phone: formData.phone,
        address: street,
        city,
        state,
        zip,
        date_of_birth: formData.dateOfBirth,
        service_type: formData.serviceType ?? 'both',
        identity_verified: false,
      });
      if (indError) throw indError;

      const serviceAreas: string[] = formData.serviceAreas ?? [];
      if (serviceAreas.length > 0) {
        const areaRows = serviceAreas.map((areaCode: string) => ({
          provider_id: userId,
          provider_type: 'independent' as const,
          state: areaCode,
          city: '',
        }));
        const { error: areasError } = await supabase.from('service_areas').insert(areaRows);
        if (areasError) throw areasError;
      }

      reset();
      await initialize();
      router.replace('/(provider)/home');
    } catch (e: any) {
      Alert.alert(
        isUSA ? 'Registration Error' : 'Error de Registro',
        e.message ?? 'Something went wrong.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}
        >
          <Feather name="arrow-left" size={20} color={C.textSecondary} />
          <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', marginLeft: 8 }}>
            {t('common.back')}
          </Text>
        </TouchableOpacity>

        <StepProgressBar current={4} total={4} />

        <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', marginBottom: 24 }}>
          {isUSA ? 'Review & Submit' : 'Revisar y Enviar'}
        </Text>

        <View style={{
          backgroundColor: '#1a1a2e',
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: C.accent2,
        }}>
          <Text style={{ color: C.accent, fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 8 }}>
            {isUSA ? 'Identity Verification' : 'Verificación de Identidad'}
          </Text>
          <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 }}>
            {isUSA
              ? "As an independent contractor, you'll be prompted to complete identity verification to build trust with clients."
              : 'Como contratista independiente, deberás completar la verificación de identidad para generar confianza con los clientes.'}
          </Text>
        </View>

        {formData.fullName ? (
          <View style={{
            backgroundColor: C.surface,
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: C.line,
          }}>
            <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 12 }}>
              {isUSA ? 'Personal Details' : 'Datos Personales'}
            </Text>
            {([
              [isUSA ? 'Full Name' : 'Nombre Completo', formData.fullName],
              [isUSA ? 'Date of Birth' : 'Fecha de Nacimiento', formData.dateOfBirth],
              ['Email', formData.email],
            ] as [string, string][]).filter(([, v]) => v).map(([label, value], idx, arr) => (
              <View key={label} style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 10,
                borderBottomWidth: idx < arr.length - 1 ? 1 : 0,
                borderBottomColor: C.line,
              }}>
                <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular' }}>{label}</Text>
                <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_400Regular' }}>{value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={{
          backgroundColor: C.surface,
          borderRadius: 16,
          padding: 16,
          marginBottom: 32,
          borderWidth: 1,
          borderColor: C.line,
        }}>
          <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 12 }}>
            {isUSA ? 'Documents Checklist' : 'Lista de Documentos'}
          </Text>
          {docs.map((doc, idx) => (
            <View key={doc.key} style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 10,
              borderBottomWidth: idx < docs.length - 1 ? 1 : 0,
              borderBottomColor: C.line,
            }}>
              <Feather name="check-circle" size={16} color={C.success} style={{ marginRight: 10 }} />
              <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 }}>
                {doc.label}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
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
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={{ color: '#000', fontSize: 16, fontFamily: 'Inter_600SemiBold' }}>
              {isUSA ? 'Submit for Review' : 'Enviar para Revisión'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
