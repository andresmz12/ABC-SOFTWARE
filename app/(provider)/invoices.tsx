/** Provider — list of my invoices */
import { useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useLang } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { C } from '@/constants/theme';
import { formatMoney } from '@/lib/invoiceService';
import { InvoiceStatusPill } from '@/components/invoice/InvoiceView';
import type { Invoice } from '@/types';

export default function ProviderInvoices() {
  const { user } = useAuthStore();
  const { lang } = useLang();
  const es = lang === 'es';
  const router = useRouter();
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    setLoading(true);
    supabase.from('invoices').select('*').eq('provider_id', user.id).neq('status', 'void')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.warn('[ProviderInvoices]', error.message);
        setRows((data ?? []) as Invoice[]);
        setLoading(false);
      });
  }, [user?.id]));

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.line, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Feather name="arrow-left" size={20} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={{ color: C.textPrimary, fontSize: 22, fontFamily: 'Inter_700Bold' }}>{es ? 'Mis Facturas' : 'My Invoices'}</Text>
      </View>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.accent} /></View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          ListEmptyComponent={
            <Text style={{ color: C.textMuted, textAlign: 'center', marginTop: 60, fontFamily: 'Inter_400Regular' }}>
              {es ? 'Aún no tienes facturas. Se crean al completar un trabajo.' : 'No invoices yet. They are created when you complete a job.'}
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(provider)/invoice', params: { invoiceId: item.id } } as any)}
              style={{ backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center' }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>{item.inv_number}</Text>
                <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 }} numberOfLines={1}>
                  {item.client_name || '—'} · {new Date(item.issue_date).toLocaleDateString(es ? 'es-CO' : 'en-US')}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_700Bold' }}>{formatMoney(item.total, item.currency)}</Text>
                <InvoiceStatusPill status={item.status} es={es} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
