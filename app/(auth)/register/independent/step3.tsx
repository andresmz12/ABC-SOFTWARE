import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import Button from '@/components/ui/Button';
import StepProgressBar from '@/components/ui/StepProgressBar';
import DocumentUploadCard from '@/components/cards/DocumentUploadCard';

export default function IndependentStep3() {
  const router = useRouter();
  const { t } = useTranslation();

  const REQUIRED_DOCS = [
    { key: 'w9', label: t('registration.docW9') },
    { key: 'gov_id_front', label: t('registration.docGovIdFront') },
    { key: 'gov_id_back', label: t('registration.docGovIdBack') },
    { key: 'background_check', label: t('registration.docBackgroundCheckConsent') },
    { key: 'contractor_agreement', label: t('registration.docContractorAgreement') },
  ];
  return (
    <ScreenWrapper scroll className="px-6">
      <TouchableOpacity onPress={() => router.back()} className="pt-6 pb-4">
        <Text className="text-primary font-body">← {t('common.back')}</Text>
      </TouchableOpacity>
      <StepProgressBar current={3} total={4} />
      <Text className="text-primary text-2xl font-heading mb-2">{t('registration.documents')}</Text>
      <Text className="text-text-muted font-body text-sm mb-6">{t('documents.subtitle')}</Text>
      {REQUIRED_DOCS.map((doc) => (
        <DocumentUploadCard key={doc.key} docType={doc.key} label={doc.label} onUpload={() => {}} />
      ))}
      <Button label={t('common.next')} onPress={() => router.push('/(auth)/register/independent/step4' as any)} className="mt-2" />
    </ScreenWrapper>
  );
}
