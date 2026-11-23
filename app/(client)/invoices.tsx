/** Client — invoices received (only sent/paid are visible via RLS) */
import { useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useLang } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { C } from '@/constants/theme';
import InvoiceView, { InvoiceStatusPill } from '@/components/invoice/InvoiceView';
import { formatMoney } from '@/lib/invoiceService';
import type { Invoice } from '@/types';

export default function ClientInvoices() {
  const { user } = useAuthStore();
  const { lang } = useLang();
  const es = lang === 'es';
  const router = useRouter();
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    setLoading(true);
    supabase.from('invoices').select('*, items:invoice_items(*)').eq('client_id', user.id)
      .in('status', ['sent', 'paid']).order('sent_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.warn('[ClientInvoices]', error.message);
        setRows(((data ?? []) as Invoice[]).map((i) => ({ ...i, items: (i.items ?? []).sort((a, b) => a.position - b.position) })));
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
              {es ? 'Aún no has recibido facturas.' : 'You have not received any invoices yet.'}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={{ marginBottom: 10 }}>
              <TouchableOpacity
                onPress={() => setOpenId(openId === item.id ? null : item.id)}
                style={{ backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 14, flexDirection: 'row', alignItems: 'center' }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>{item.inv_number}</Text>
                  <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 }} numberOfLines={1}>
                    {item.provider_name || '—'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_700Bold' }}>{formatMoney(item.total, item.currency)}</Text>
                  <InvoiceStatusPill status={item.status} es={es} />
                </View>
              </TouchableOpacity>
              {openId === item.id && <View style={{ marginTop: 8 }}><InvoiceView invoice={item} es={es} /></View>}
            </View>
          )}
        />
      )}
    </View>
  );
}
