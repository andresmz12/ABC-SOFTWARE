import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from '@/context/LanguageContext';
import { Feather } from '@expo/vector-icons';
import { useRegistrationStore } from '@/store/registrationStore';
import { useAuthStore } from '@/store/authStore';
import { getCompanyDocs } from '@/lib/docRequirements';
import { supabase } from '@/lib/supabase';
import StepProgressBar from '@/components/ui/StepProgressBar';
import { C } from '@/constants/theme';

export default function CompanyStep4() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLang();
  const { country, formData, reset } = useRegistrationStore();
  const { initialize } = useAuthStore();
  const isUSA = country !== 'colombia';
  const [loading, setLoading] = useState(false);

  const docs = getCompanyDocs(country ?? 'usa');

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: 'company',
            country: country ?? 'usa',
            preferred_language: country === 'colombia' ? 'es' : 'en',
          },
        },
      });
      if (signUpError) throw signUpError;
      const userId = authData.user?.id;
      if (!userId) throw new Error('No user ID returned from sign up');

      const city   = formData.city ?? '';
      const state  = formData.stateOrDept ?? formData.state ?? '';
      const zip    = formData.zip ?? '';
      const street = formData.address ?? '';

      const { error: companyError } = await supabase.from('companies').insert({
        user_id: userId,
        company_name: formData.companyName,
        ein: formData.taxId,
        phone: formData.phone,
        address: street,
        city,
        state,
        zip,
        service_type: formData.serviceType ?? 'both',
      });
      if (companyError) throw companyError;

      const serviceAreas: string[] = formData.serviceAreas ?? [];
      if (serviceAreas.length > 0) {
        const areaRows = serviceAreas.map((areaCode: string) => ({
          provider_id: userId,
          provider_type: 'company' as const,
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 24, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
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
          backgroundColor: '#0d2d1a',
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: C.success,
        }}>
          <Text style={{ color: C.success, fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 8 }}>
            {isUSA ? 'Application Summary' : 'Resumen de Solicitud'}
          </Text>
          <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 }}>
            {isUSA
              ? 'Your company registration is ready for review. Our team will verify your documents within 1-3 business days.'
              : 'Tu registro de empresa está listo para revisión. Nuestro equipo verificará tus documentos en 1 a 3 días hábiles.'}
          </Text>
        </View>

        {formData.companyName ? (
          <View style={{
            backgroundColor: C.surface,
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: C.line,
          }}>
            <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 12 }}>
              {isUSA ? 'Company Details' : 'Datos de la Empresa'}
            </Text>
            {([
              [isUSA ? 'Company Name' : 'Razón Social', formData.companyName],
              [isUSA ? 'Tax ID' : 'NIT', formData.taxId],
              [isUSA ? 'Business Type' : 'Tipo de Sociedad', formData.bizType],
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
      </KeyboardAvoidingView>
    </View>
  );
}
