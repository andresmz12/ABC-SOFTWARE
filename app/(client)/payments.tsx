import { useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useLang } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { formatUSD, formatCOP } from '@/lib/countryData';
import { C } from '@/constants/theme';

interface Payment {
  id: string;
  job_request_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method?: string;
  created_at: string;
  paid_at?: string;
  job?: { service_type?: string; city?: string; state?: string };
}

const STATUS_META: Record<string, { bg: string; color: string; en: string; es: string }> = {
  pending:  { bg: `${C.warning}20`, color: C.warning,       en: 'PENDING',    es: 'PENDIENTE' },
  paid:     { bg: `${C.success}20`, color: C.success,       en: 'PAID',       es: 'PAGADO' },
  failed:   { bg: `${C.danger}20`,  color: C.danger,        en: 'FAILED',     es: 'FALLIDO' },
  refunded: { bg: C.surface2,       color: C.textSecondary, en: 'REFUNDED',   es: 'REEMBOLSADO' },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ClientPayments() {
  const { user } = useAuthStore();
  const { lang } = useLang();
  const es = lang === 'es';
  const router = useRouter();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*, job:job_request_id(service_type, city, state)')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPayments((data ?? []) as Payment[]);
    } catch (e: any) {
      console.warn('[ClientPayments]', e.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const isColombia = user?.country === 'colombia';
  const totalPaid = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + (p.amount ?? 0), 0);

  const renderItem = ({ item }: { item: Payment }) => {
    const meta = STATUS_META[item.status] ?? STATUS_META.pending;
    const isCOP = item.currency === 'cop';
    const amountText = isCOP ? formatCOP(item.amount) : formatUSD(item.amount);
    const serviceLabel = item.job?.service_type === 'commercial'
      ? (es ? 'Limpieza Comercial' : 'Commercial Cleaning')
      : (es ? 'Limpieza Residencial' : 'Residential Cleaning');
    const location = item.job?.city
      ? `${item.job.city}${item.job.state ? ', ' + item.job.state : ''}`
      : '—';

    return (
      <View style={{ backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: `${C.accent}18`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Feather name="credit-card" size={18} color={C.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>
            {serviceLabel}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
            {location} · {formatDate(item.created_at)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_700Bold' }}>{amountText}</Text>
          <View style={{ backgroundColor: meta.bg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ color: meta.color, fontSize: 10, fontFamily: 'Inter_600SemiBold' }}>
              {es ? meta.es : meta.en}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.line }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Feather name="arrow-left" size={20} color={C.textPrimary} />
          </TouchableOpacity>
          <Text style={{ flex: 1, color: C.textPrimary, fontSize: 22, fontFamily: 'Inter_700Bold' }}>
            {es ? 'Historial de Pagos' : 'Payment History'}
          </Text>
        </View>
        {payments.filter((p) => p.status === 'paid').length > 0 && (
          <View style={{ marginLeft: 32, backgroundColor: `${C.success}15`, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', borderWidth: 1, borderColor: `${C.success}30` }}>
            <Text style={{ color: C.success, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
              {es ? 'Total pagado' : 'Total paid'}: {isColombia ? formatCOP(totalPaid) : formatUSD(totalPaid)}
            </Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent} />
        </View>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
              <Feather name="credit-card" size={36} color={C.textMuted} />
              <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 16, textAlign: 'center' }}>
                {es ? 'Sin pagos registrados aún' : 'No payments recorded yet'}
              </Text>
              <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 8, textAlign: 'center', lineHeight: 18 }}>
                {es
                  ? 'Los pagos aparecerán aquí cuando completes trabajos.'
                  : 'Payments will appear here when you complete jobs.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
