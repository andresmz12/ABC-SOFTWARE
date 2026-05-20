import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import Button from '@/components/ui/Button';
import StepProgressBar from '@/components/ui/StepProgressBar';

export default function IndependentStep4() {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <ScreenWrapper scroll className="px-6">
      <TouchableOpacity onPress={() => router.back()} className="pt-6 pb-4">
        <Text className="text-primary font-body">← {t('common.back')}</Text>
      </TouchableOpacity>
      <StepProgressBar current={4} total={4} />
      <Text className="text-primary text-2xl font-heading mb-6">{t('registration.review')}</Text>
      <View className="bg-accent rounded-2xl p-5 mb-6">
        <Text className="text-primary font-body-bold text-base mb-2">🔍 {t('registration.identityVerification')}</Text>
        <Text className="text-text-muted font-body text-sm leading-6">
          {t('registration.reviewParagraphIndependent')}
        </Text>
      </View>
      <View className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">
        {[
          t('registration.docSummaryW9'),
          t('registration.docSummaryGovIdFront'),
          t('registration.docSummaryGovIdBack'),
          t('registration.docSummaryBackgroundCheck'),
          t('registration.docSummaryContractorAgreement'),
        ].map((doc) => (
          <View key={doc} className="flex-row items-center py-2 border-b border-gray-100 last:border-0">
            <Text className="text-success mr-2">✓</Text>
            <Text className="text-text-main font-body text-sm">{doc}</Text>
          </View>
        ))}
      </View>
      <Button label={t('registration.submitForReview')} onPress={() => router.replace('/(auth)/welcome')} />
    </ScreenWrapper>
  );
}
