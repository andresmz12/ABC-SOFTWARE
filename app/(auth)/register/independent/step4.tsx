import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import Button from '@/components/ui/Button';
import StepProgressBar from '@/components/ui/StepProgressBar';
import { useRegistrationStore } from '@/store/registrationStore';
import { getIndependentDocs } from '@/lib/docRequirements';
import { supabase } from '@/lib/supabase';

export default function IndependentStep4() {
  const router = useRouter();
  const { t } = useTranslation();
  const { country, formData, reset } = useRegistrationStore();
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
      router.replace('/(auth)/welcome');
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
    <ScreenWrapper scroll className="px-6">
      <TouchableOpacity onPress={() => router.back()} className="pt-6 pb-4">
        <Text className="text-primary font-body">← {t('common.back')}</Text>
      </TouchableOpacity>
      <StepProgressBar current={4} total={4} />
      <Text className="text-primary text-2xl font-heading mb-6">
        {isUSA ? 'Review & Submit' : 'Revisar y Enviar'}
      </Text>

      <View className="bg-accent rounded-2xl p-5 mb-4">
        <Text className="text-primary font-body-bold text-base mb-2">
          🔍 {isUSA ? 'Identity Verification' : 'Verificación de Identidad'}
        </Text>
        <Text className="text-text-muted font-body text-sm leading-6">
          {isUSA
            ? "As an independent contractor, you'll also be prompted to complete identity verification. This builds trust with clients and helps you get more jobs."
            : 'Como contratista independiente, también se te pedirá completar la verificación de identidad. Esto genera confianza con los clientes y te ayuda a conseguir más trabajos.'}
        </Text>
      </View>

      {formData.fullName ? (
        <View className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
          <Text className="text-text-main font-body-bold text-sm mb-3">
            {isUSA ? 'Personal Details' : 'Datos Personales'}
          </Text>
          {([
            [isUSA ? 'Full Name' : 'Nombre Completo', formData.fullName],
            [isUSA ? 'Date of Birth' : 'Fecha de Nacimiento', formData.dateOfBirth],
            ['Email', formData.email],
          ] as [string, string][]).filter(([, v]) => v).map(([label, value]) => (
            <View key={label} className="flex-row justify-between py-1.5 border-b border-gray-50">
              <Text className="text-text-muted font-body text-sm">{label}</Text>
              <Text className="text-text-main font-body-medium text-sm">{value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">
        <Text className="text-text-main font-body-bold text-sm mb-3">
          {isUSA ? 'Documents Checklist' : 'Lista de Documentos'}
        </Text>
        {docs.map((doc) => (
          <View key={doc.key} className="flex-row items-center py-2 border-b border-gray-100 last:border-0">
            <Text className="text-success mr-2">✓</Text>
            <Text className="text-text-main font-body text-sm flex-1">{doc.label}</Text>
          </View>
        ))}
      </View>

      <Button
        label={loading ? (isUSA ? 'Submitting...' : 'Enviando...') : (isUSA ? 'Submit for Review' : 'Enviar para Revisión')}
        onPress={handleSubmit}
        disabled={loading}
        className="mb-8"
      />
      {loading && <ActivityIndicator className="mb-4" />}
    </ScreenWrapper>
  );
}
