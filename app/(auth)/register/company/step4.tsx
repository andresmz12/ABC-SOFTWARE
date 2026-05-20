import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import Button from '@/components/ui/Button';
import StepProgressBar from '@/components/ui/StepProgressBar';
import { useRegistrationStore } from '@/store/registrationStore';
import { getCompanyDocs } from '@/lib/docRequirements';
import { supabase } from '@/lib/supabase';

export default function CompanyStep4() {
  const router = useRouter();
  const { t } = useTranslation();
  const { country, formData, reset } = useRegistrationStore();
  const isUSA = country !== 'colombia';
  const [loading, setLoading] = useState(false);

  const docs = getCompanyDocs(country ?? 'usa');

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
        role: 'company',
        status: 'pending',
        country: country ?? 'usa',
        preferred_language: lang,
      });
      if (userError) throw userError;

      const addr = formData.address ?? {};
      const city  = isUSA ? addr.city  : addr.ciudad;
      const state = isUSA ? addr.state : addr.departamento;
      const zip   = isUSA ? addr.zip   : '';
      const street = isUSA
        ? addr.street
        : `${addr.viaType ?? ''} ${addr.numeroPrincipal ?? ''}${addr.numeroSecundario ? ' # ' + addr.numeroSecundario : ''}${addr.complemento ? ' ' + addr.complemento : ''}, ${addr.barrio ?? ''}`.trim();

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
          📋 {isUSA ? 'Application Summary' : 'Resumen de Solicitud'}
        </Text>
        <Text className="text-text-muted font-body text-sm leading-6">
          {isUSA
            ? "Your company registration has been prepared for review. Our team will verify your documents within 1–3 business days. You'll receive a push notification once approved."
            : 'Tu registro de empresa ha sido preparado para revisión. Nuestro equipo verificará tus documentos en un plazo de 1 a 3 días hábiles. Recibirás una notificación una vez aprobado.'}
        </Text>
      </View>

      {formData.companyName ? (
        <View className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
          <Text className="text-text-main font-body-bold text-sm mb-3">
            {isUSA ? 'Company Details' : 'Datos de la Empresa'}
          </Text>
          {([
            [isUSA ? 'Company Name' : 'Razón Social', formData.companyName],
            [isUSA ? 'Tax ID' : 'NIT', formData.taxId],
            [isUSA ? 'Business Type' : 'Tipo de Sociedad', formData.bizType],
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
        label={loading ? (isUSA ? 'Submitting...' : 'Enviando...') : (isUSA ? 'Review & Submit' : 'Enviar para Revisión')}
        onPress={handleSubmit}
        disabled={loading}
        className="mb-8"
      />
      {loading && <ActivityIndicator className="mb-4" />}
    </ScreenWrapper>
  );
}
