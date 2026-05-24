import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useLang } from '@/context/LanguageContext';
import { applyToJob } from '@/lib/jobService';
import { formatUSD, formatCOP } from '@/lib/countryData';
import { supabase } from '@/lib/supabase';
import Input from '@/components/ui/Input';
import { C } from '@/constants/theme';
import type { JobRequest } from '@/types';

function countdown(iso: string, es: boolean): { text: string; urgent: boolean } {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return { text: es ? 'Expirado' : 'Expired', urgent: true };
  const totalMins = Math.floor(ms / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const left = es ? 'restantes' : 'left';
  return { text: h > 0 ? `${h}h ${m}m ${left}` : `${m}m ${left}`, urgent: totalMins < 30 };
}

export default function JobDetail() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { lang } = useLang();
  const es = lang === 'es';
  const isColombia = user?.country === 'colombia';

  const [job, setJob] = useState<JobRequest | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    (async () => {
      try {
        const { data } = await supabase.from('job_requests').select('*').eq('id', jobId).single();
        setJob(data ?? null);
        if (data && user?.id) {
          const { data: existing } = await supabase
            .from('job_applications')
            .select('id')
            .eq('job_request_id', jobId)
            .eq('provider_id', user.id)
            .maybeSingle();
          if (existing) setApplied(true);
        }
      } finally {
        setLoadingJob(false);
      }
    })();
  }, [jobId]);

  const handleApply = async () => {
    if (!bidAmount.trim()) {
      Alert.alert(
        es ? 'Monto requerido' : 'Bid required',
        es ? 'Ingresa tu oferta de precio.' : 'Please enter your bid amount.',
      );
      return;
    }
    const amount = parseFloat(bidAmount.replace(/[^0-9.]/g, ''));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert(
        es ? 'Monto inválido' : 'Invalid amount',
        es ? 'Ingresa un número válido mayor a 0.' : 'Please enter a valid amount greater than 0.',
      );
      return;
    }
    if (!job || !user) return;

    setSubmitting(true);
    try {
      await applyToJob({
        jobId: job.id,
        providerId: user.id,
        providerType: user.role as 'company' | 'independent',
        bidAmount: amount,
        currency: isColombia ? 'cop' : 'usd',
        message,
      });
      setApplied(true);
      setModalVisible(false);
      Alert.alert(
        es ? '¡Aplicación enviada!' : 'Application Sent!',
        es ? 'El cliente recibirá tu oferta pronto.' : 'The client will review your bid.',
      );
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to submit.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingJob) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 20, flexDirection: 'row', alignItems: 'center' }}>
          <Feather name="arrow-left" size={20} color={C.textSecondary} />
          <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', marginLeft: 8 }}>{es ? 'Volver' : 'Back'}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="alert-circle" size={40} color={C.textMuted} />
          <Text style={{ color: C.textSecondary, fontSize: 15, fontFamily: 'Inter_400Regular', marginTop: 12 }}>
            {es ? 'Trabajo no encontrado' : 'Job not found'}
          </Text>
        </View>
      </View>
    );
  }

  const isCommercial = job.service_type === 'commercial';
  const isNotEligible = job.service_type === 'commercial' && user?.role === 'independent';
  const accentColor = isCommercial ? C.accent2 : C.accent;
  const timer = job.expires_at ? countdown(job.expires_at, es) : null;
  const location = isColombia
    ? `${(job as any).county ? (job as any).county + ', ' : ''}${job.city}`
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

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ padding: 20, flexDirection: 'row', alignItems: 'center' }}
        >
          <Feather name="arrow-left" size={20} color={C.textSecondary} />
          <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', marginLeft: 8 }}>
            {es ? 'Volver' : 'Back'}
          </Text>
        </TouchableOpacity>

        {/* Job card */}
        <View style={{
          marginHorizontal: 20,
          backgroundColor: C.surface,
          borderRadius: 20,
          overflow: 'hidden',
          borderLeftWidth: 4,
          borderLeftColor: accentColor,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: C.line,
        }}>
          <View style={{ padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <Text style={{ color: C.textPrimary, fontSize: 20, fontFamily: 'Inter_700Bold', flex: 1, marginRight: 8 }}>
                {(job as any).title ?? (isCommercial ? (es ? 'Limpieza Comercial' : 'Commercial Cleaning') : (es ? 'Limpieza Residencial' : 'Residential Cleaning'))}
              </Text>
              {timer && (
                <View style={{
                  backgroundColor: timer.urgent ? '#2d0d0d' : C.surface2,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: timer.urgent ? C.danger : C.line,
                }}>
                  <Text style={{ color: timer.urgent ? C.danger : C.textSecondary, fontSize: 11, fontFamily: 'Inter_400Regular' }}>
                    {timer.text}
                  </Text>
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View style={{
                backgroundColor: isCommercial ? '#0d1a2d' : '#2d1a0d',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: accentColor,
              }}>
                <Text style={{ color: accentColor, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>
                  {isCommercial ? (es ? 'Comercial' : 'Commercial') : (es ? 'Residencial' : 'Residential')}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="map-pin" size={12} color={C.textMuted} style={{ marginRight: 4 }} />
                <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular' }}>{location}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {budgetText && (
                <View style={{
                  backgroundColor: C.surface2,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: C.accent,
                }}>
                  <Text style={{ color: C.accent, fontSize: 15, fontFamily: 'Inter_700Bold' }}>{budgetText}</Text>
                </View>
              )}
              {job.estimated_hours != null && (
                <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
                  {job.estimated_hours}h
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Details */}
        <View style={{
          marginHorizontal: 20,
          backgroundColor: C.surface,
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: C.line,
        }}>
          <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 12 }}>
            {es ? 'Detalles del Trabajo' : 'Job Details'}
          </Text>
          {([
            [es ? 'Fecha' : 'Date', job.scheduled_date],
            [es ? 'Hora' : 'Time', job.scheduled_time],
            [es ? 'Duración estimada' : 'Duration', `${job.estimated_hours}h`],
            [es ? 'Código postal' : 'ZIP', job.zip || '—'],
          ] as [string, string][]).map(([label, value], idx, arr) => (
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

        {job.description ? (
          <View style={{
            marginHorizontal: 20,
            backgroundColor: C.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: C.line,
          }}>
            <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 8 }}>
              {es ? 'Descripción' : 'Description'}
            </Text>
            <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 }}>
              {job.description}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Sticky apply button */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingBottom: 32,
        paddingTop: 16,
        backgroundColor: C.background,
        borderTopWidth: 1,
        borderTopColor: C.line,
      }}>
        {isNotEligible ? (
          <View style={{
            backgroundColor: '#1a0d0d',
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: `${C.danger}40`,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="slash" size={16} color={C.danger} style={{ marginRight: 8 }} />
              <Text style={{ color: C.danger, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                {es ? 'Solo empresas pueden aplicar a trabajos comerciales' : 'Only companies can apply to commercial jobs'}
              </Text>
            </View>
          </View>
        ) : applied ? (
          <View style={{
            backgroundColor: '#0d2d1a',
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: C.success,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="check-circle" size={16} color={C.success} style={{ marginRight: 8 }} />
              <Text style={{ color: C.success, fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>
                {es ? 'Aplicación enviada' : 'Application submitted'}
              </Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={{
              backgroundColor: C.accent,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: 'center',
            }}
            activeOpacity={0.85}
          >
            <Text style={{ color: '#000', fontSize: 16, fontFamily: 'Inter_600SemiBold' }}>
              {es ? 'Aplicar Ahora' : 'Apply Now'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Apply modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
              <View style={{
                backgroundColor: C.surface,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingHorizontal: 24,
                paddingTop: 24,
                paddingBottom: 40,
                borderTopWidth: 1,
                borderTopColor: C.line,
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <Text style={{ color: C.textPrimary, fontSize: 20, fontFamily: 'Inter_700Bold' }}>
                    {es ? 'Enviar Oferta' : 'Submit Your Bid'}
                  </Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Feather name="x" size={22} color={C.textSecondary} />
                  </TouchableOpacity>
                </View>

                <Input
                  label={`${es ? 'Tu oferta' : 'Your bid'} (${isColombia ? 'COP' : 'USD'})`}
                  placeholder={isColombia ? 'Ej: 350000' : 'e.g. 150'}
                  value={bidAmount}
                  onChangeText={setBidAmount}
                  keyboardType="decimal-pad"
                  iconName="dollar-sign"
                />

                <Input
                  label={es ? 'Mensaje (opcional)' : 'Message (optional)'}
                  placeholder={es ? 'Cuéntale al cliente sobre tu servicio...' : 'Tell the client about your service...'}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={3}
                />

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={{
                      flex: 1,
                      backgroundColor: C.surface2,
                      borderRadius: 12,
                      paddingVertical: 14,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: C.line,
                    }}
                  >
                    <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                      {es ? 'Cancelar' : 'Cancel'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleApply}
                    disabled={submitting}
                    style={{
                      flex: 2,
                      backgroundColor: C.accent,
                      borderRadius: 12,
                      paddingVertical: 14,
                      alignItems: 'center',
                      opacity: submitting ? 0.6 : 1,
                    }}
                    activeOpacity={0.85}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <Text style={{ color: '#000', fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                        {es ? 'Enviar' : 'Submit'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}
