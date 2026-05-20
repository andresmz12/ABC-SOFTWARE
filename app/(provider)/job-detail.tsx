import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useJobStore } from '@/store/jobStore';
import { applyToJob } from '@/lib/jobService';
import { formatUSD, formatCOP } from '@/lib/countryData';
import Input from '@/components/ui/Input';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import { DEMO_JOB_ALERTS, CO_DEMO_JOB_ALERTS } from '@/constants/demoData';
import type { JobRequest } from '@/types';

function countdown(iso: string): { text: string; urgent: boolean } {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return { text: 'Expired', urgent: true };
  const totalMins = Math.floor(ms / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return { text: h > 0 ? `${h}h ${m}m left` : `${m}m left`, urgent: totalMins < 30 };
}

export default function JobDetail() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { openJobs } = useJobStore();
  const isColombia = user?.country === 'colombia';
  const isDemo = user?.id === 'demo';

  const demoAlerts = isColombia ? CO_DEMO_JOB_ALERTS : DEMO_JOB_ALERTS;
  const allJobs = openJobs.length > 0 ? openJobs : (isDemo ? demoAlerts : []);
  const job = allJobs.find((j: JobRequest) => j.id === jobId);

  const [modalVisible, setModalVisible] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [applied, setApplied] = useState(false);

  if (!job) {
    return (
      <ScreenWrapper>
        <View className="flex-1 items-center justify-center">
          <Text className="text-text-muted font-body">Job not found</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const isCommercial = job.service_type === 'commercial';
  const leftBorder = isCommercial ? '#1B3A6B' : '#C9A84C';
  const timer = job.expires_at ? countdown(job.expires_at) : null;

  const location = isColombia
    ? `${job.county ? job.county + ', ' : ''}${job.city}`
    : `${job.city}, ${job.state}`;

  const budgetText = job.budget_usd
    ? job.budget_max_usd
      ? `${formatUSD(job.budget_usd)}–${formatUSD(job.budget_max_usd)}`
      : formatUSD(job.budget_usd)
    : job.budget_cop
    ? job.budget_max_cop
      ? `${formatCOP(job.budget_cop)}–${formatCOP(job.budget_max_cop)}`
      : formatCOP(job.budget_cop)
    : null;

  const copUsdEquiv = isColombia && job.budget_cop
    ? `≈ ${formatUSD(job.budget_cop / 4100)}`
    : null;

  const handleApply = async () => {
    if (!bidAmount.trim()) {
      Alert.alert(
        isColombia ? 'Monto requerido' : 'Bid amount required',
        isColombia ? 'Ingresa tu oferta de precio.' : 'Please enter your bid amount.',
      );
      return;
    }

    if (isDemo) {
      setApplied(true);
      setModalVisible(false);
      Alert.alert(
        isColombia ? '¡Aplicación enviada!' : 'Application Sent!',
        isColombia
          ? 'En modo demo, no se guarda en la base de datos.'
          : 'Demo mode — application not saved to DB.',
      );
      return;
    }

    setSubmitting(true);
    try {
      await applyToJob({
        jobId: job.id,
        providerId: user!.id,
        providerType: user!.role as 'company' | 'independent',
        bidAmount: parseFloat(bidAmount.replace(/[^0-9.]/g, '')),
        currency: isColombia ? 'cop' : 'usd',
        message,
      });
      setApplied(true);
      setModalVisible(false);
      Alert.alert(
        isColombia ? '¡Aplicación enviada!' : 'Application Sent!',
        isColombia
          ? 'El cliente recibirá tu oferta pronto.'
          : 'The client will review your bid.',
      );
    } catch (e: any) {
      Alert.alert(isColombia ? 'Error' : 'Error', e.message ?? 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} className="px-5 pt-8 pb-4">
          <Text className="text-primary font-body">← {isColombia ? 'Volver' : 'Back'}</Text>
        </TouchableOpacity>

        {/* Job card */}
        <View
          className="mx-5 bg-white rounded-2xl overflow-hidden mb-4"
          style={{ borderLeftWidth: 4, borderLeftColor: leftBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3 }}
        >
          <View className="p-4">
            <View className="flex-row justify-between items-start mb-3">
              <View className="flex-row items-center flex-1 mr-2">
                <Text className="text-sm mr-1.5">{isColombia ? '🇨🇴' : '🇺🇸'}</Text>
                <Text className="text-text-main font-heading text-xl flex-1">{job.title ?? (isCommercial ? 'Commercial Cleaning' : 'Residential Cleaning')}</Text>
              </View>
              {timer && (
                <View className={`px-2 py-0.5 rounded-full ${timer.urgent ? 'bg-red-100' : 'bg-gray-100'}`}>
                  <Text className={`text-xs font-body-medium ${timer.urgent ? 'text-red-600' : 'text-text-muted'}`}>
                    ⏱ {timer.text}
                  </Text>
                </View>
              )}
            </View>

            <View className="flex-row items-center gap-2 mb-3">
              <View className={`px-2 py-0.5 rounded-full ${isCommercial ? 'bg-blue-100' : 'bg-amber-100'}`}>
                <Text className={`text-xs font-body-medium ${isCommercial ? 'text-blue-700' : 'text-amber-700'}`}>
                  {isCommercial ? '🏢 Commercial' : '🏠 Residential'}
                </Text>
              </View>
              <Text className="text-text-muted font-body text-xs">📍 {location}</Text>
            </View>

            {budgetText && (
              <View className="flex-row items-center gap-2 mb-3">
                <View className="bg-secondary/10 px-3 py-1 rounded-full">
                  <Text className="text-secondary font-body-bold text-sm">{budgetText}</Text>
                </View>
                {copUsdEquiv && <Text className="text-text-muted font-body text-xs">{copUsdEquiv}</Text>}
                <Text className="text-text-muted font-body text-xs">{job.estimated_hours}h</Text>
              </View>
            )}
          </View>
        </View>

        {/* Details */}
        <View className="mx-5 bg-white rounded-2xl p-4 mb-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
          <Text className="text-text-main font-body-bold text-sm mb-3">
            {isColombia ? 'Detalles del Trabajo' : 'Job Details'}
          </Text>
          {[
            [isColombia ? 'Fecha' : 'Date', job.scheduled_date],
            [isColombia ? 'Hora' : 'Time', job.scheduled_time],
            [isColombia ? 'Duración estimada' : 'Est. Duration', `${job.estimated_hours}h`],
            [isColombia ? 'Código postal' : 'ZIP', job.zip || '—'],
          ].map(([label, value]) => (
            <View key={label} className="flex-row justify-between py-2 border-b border-gray-50 last:border-0">
              <Text className="text-text-muted font-body text-sm">{label}</Text>
              <Text className="text-text-main font-body-medium text-sm">{value}</Text>
            </View>
          ))}
        </View>

        {job.description ? (
          <View className="mx-5 bg-white rounded-2xl p-4 mb-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
            <Text className="text-text-main font-body-bold text-sm mb-2">
              {isColombia ? 'Descripción' : 'Description'}
            </Text>
            <Text className="text-text-muted font-body text-sm leading-5">{job.description}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Sticky apply button */}
      <View className="absolute bottom-0 left-0 right-0 px-5 pb-6 pt-3 bg-white border-t border-gray-100">
        {applied ? (
          <View className="bg-green-50 border border-green-200 rounded-2xl py-4 items-center">
            <Text className="text-green-700 font-body-bold">
              {isColombia ? '✅ Aplicación enviada' : '✅ Application submitted'}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            className="bg-primary rounded-2xl py-4 items-center"
            style={{ shadowColor: '#1B3A6B', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 }}
          >
            <Text className="text-white font-body-bold text-base">
              {isColombia ? 'Aplicar Ahora' : 'Apply Now'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Apply modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10">
            <Text className="text-text-main font-heading text-xl mb-4">
              {isColombia ? 'Enviar Oferta' : 'Submit Your Bid'}
            </Text>

            <Input
              label={isColombia ? `Tu oferta (COP)` : 'Your bid (USD)'}
              placeholder={isColombia ? 'Ej: 350000' : 'e.g. 150'}
              value={bidAmount}
              onChangeText={setBidAmount}
              keyboardType="decimal-pad"
            />

            <Input
              label={isColombia ? 'Mensaje (opcional)' : 'Message (optional)'}
              placeholder={isColombia ? 'Cuéntale al cliente sobre tu servicio...' : 'Tell the client about your service...'}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={3}
            />

            <View className="flex-row gap-3 mt-2">
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="flex-1 border border-gray-200 rounded-2xl py-3.5 items-center"
              >
                <Text className="text-text-muted font-body-bold">
                  {isColombia ? 'Cancelar' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleApply}
                disabled={submitting}
                className="flex-2 bg-primary rounded-2xl py-3.5 items-center px-8"
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-body-bold">
                    {isColombia ? 'Enviar' : 'Submit'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}
