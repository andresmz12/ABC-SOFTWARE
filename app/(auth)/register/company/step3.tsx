import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import Button from '@/components/ui/Button';
import StepProgressBar from '@/components/ui/StepProgressBar';
import DocumentUploadCard from '@/components/cards/DocumentUploadCard';
import { useRegistrationStore } from '@/store/registrationStore';
import { getCompanyDocs } from '@/lib/docRequirements';

export default function CompanyStep3() {
  const router = useRouter();
  const { t } = useTranslation();
  const { country } = useRegistrationStore();
  const isUSA = country !== 'colombia';

  const docs = getCompanyDocs(country ?? 'usa');

  return (
    <ScreenWrapper scroll className="px-6">
      <TouchableOpacity onPress={() => router.back()} className="pt-6 pb-4">
        <Text className="text-primary font-body">← {t('common.back')}</Text>
      </TouchableOpacity>
      <StepProgressBar current={3} total={4} />
      <Text className="text-primary text-2xl font-heading mb-2">
        {isUSA ? 'Upload Documents' : 'Subir Documentos'}
      </Text>
      <Text className="text-text-muted font-body text-sm mb-6">
        {isUSA
          ? 'Upload all required documents for verification.'
          : 'Sube todos los documentos requeridos para verificación.'}
      </Text>

      {docs.map((doc) => (
        <DocumentUploadCard
          key={doc.key}
          docType={doc.key}
          label={doc.label}
          info={doc.info}
          onUpload={() => {}}
        />
      ))}

      <Button
        label={t('common.next')}
        onPress={() => router.push('/(auth)/register/company/step4' as any)}
        className="mt-2 mb-8"
      />
    </ScreenWrapper>
  );
}
