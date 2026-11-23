/**
 * Admin — Invoices
 * Review provider-submitted invoices, approve & send to client, reject with a
 * reason, mark as paid, resend email, void.
 */
import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, ActivityIndicator, TouchableOpacity, Modal, ScrollView, TextInput,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useLang } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { C } from '@/constants/theme';
import InvoiceView, { InvoiceStatusPill } from '@/components/invoice/InvoiceView';
import { confirmAction, notify } from '@/lib/dialog';
import {
  approveAndSendInvoice, formatMoney, getInvoice, markInvoicePaid, rejectInvoice,
  resendInvoiceEmail, voidInvoice,
} from '@/lib/invoiceService';
import type { Invoice, InvoiceStatus } from '@/types';

type Filter = 'pending_approval' | 'sent' | 'paid' | 'rejected' | 'all';
const FILTERS: { key: Filter; en: string; es: string }[] = [
  { key: 'pending_approval', en: 'To approve', es: 'Por aprobar' },
  { key: 'sent',             en: 'Sent',       es: 'Enviadas' },
  { key: 'paid',             en: 'Paid',       es: 'Pagadas' },
  { key: 'rejected',         en: 'Rejected',   es: 'Rechazadas' },
  { key: 'all',              en: 'All',        es: 'Todas' },
];

const F = { r: 'Inter_400Regular', s: 'Inter_600SemiBold', b: 'Inter_700Bold' };

export default function AdminInvoices() {
  const { user } = useAuthStore();
  const { lang } = useLang();
  const es = lang === 'es';
  const router = useRouter();

  const [filter, setFilter] = useState<Filter>('pending_approval');
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('invoices').select('*').neq('status', 'draft').order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter as InvoiceStatus);
    const { data, error } = await q;
    if (error) console.warn('[AdminInvoices]', error.message);
    setRows((data ?? []) as Invoice[]);
    setLoading(false);
  }, [filter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const open = async (inv: Invoice) => {
    try {
      setRejecting(false);
      setReason('');
      setSelected(await getInvoice(inv.id));
    } catch (e: any) { notify('Error', e.message); }
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      setSelected(null);
    } catch (e: any) {
      notify('Error', e.message);
    } finally {
      setBusy(false);
      load();
    }
  };

  const onApprove = () => selected && confirmAction(
    es ? 'Aprobar y enviar' : 'Approve & send',
    es ? `Se enviará ${selected.inv_number} a ${selected.client_email ?? 'el cliente'}.`
       : `${selected.inv_number} will be emailed to ${selected.client_email ?? 'the client'}.`,
    es ? 'Aprobar y enviar' : 'Approve & send', es ? 'Cancelar' : 'Cancel',
    () => run(() => approveAndSendInvoice(selected.id, user!.id)),
  );

  const onReject = () => {
    if (!selected) return;
    if (!reason.trim()) { notify(es ? 'Escribe el motivo del rechazo' : 'Enter a rejection reason'); return; }
    run(() => rejectInvoice(selected.id, reason.trim()));
  };

  const onPaid = () => selected && confirmAction(
    es ? 'Marcar como pagada' : 'Mark as paid', selected.inv_number,
    es ? 'Confirmar' : 'Confirm', es ? 'Cancelar' : 'Cancel',
    () => run(() => markInvoicePaid(selected.id)),
  );

  const onVoid = () => selected && confirmAction(
    es ? 'Anular factura' : 'Void invoice',
    es ? 'Esta acción no se puede deshacer. El proveedor podrá generar una nueva.' : 'This cannot be undone. The provider will be able to generate a new one.',
    es ? 'Anular' : 'Void', es ? 'Cancelar' : 'Cancel',
    () => run(() => voidInvoice(selected.id)),
  );

  const onResend = () => selected && run(async () => {
    await resendInvoiceEmail(selected.id);
    notify(es ? 'Correo reenviado' : 'Email re-sent');
  });

  const btn = (label: string, onPress: () => void, color: string, solid = false) => (
    <TouchableOpacity
      onPress={onPress} disabled={busy}
      style={{
        flex: 1, minWidth: 130, borderRadius: 12, paddingVertical: 13, alignItems: 'center',
        borderWidth: 1, borderColor: color, backgroundColor: solid ? color : 'transparent', opacity: busy ? 0.5 : 1,
      }}
    >
      <Text style={{ color: solid ? '#FFF' : color, fontFamily: F.s, fontSize: 14 }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.line }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Feather name="arrow-left" size={20} color={C.textPrimary} />
          </TouchableOpacity>
          <Text style={{ color: C.textPrimary, fontSize: 22, fontFamily: F.b }}>{es ? 'Facturas' : 'Invoices'}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {FILTERS.map((f) => {
            const active = f.key === filter;
            return (
              <TouchableOpacity
                key={f.key} onPress={() => setFilter(f.key)}
                style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginRight: 8, backgroundColor: active ? C.accent : C.surface2 }}
              >
                <Text style={{ color: active ? '#FFF' : C.textSecondary, fontSize: 13, fontFamily: F.s }}>{es ? f.es : f.en}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.accent} /></View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          ListEmptyComponent={
            <Text style={{ color: C.textMuted, textAlign: 'center', marginTop: 60, fontFamily: F.r }}>
              {es ? 'No hay facturas en esta vista.' : 'No invoices in this view.'}
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => open(item)}
              style={{ backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center' }}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: F.s }}>{item.inv_number}</Text>
                <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: F.r, marginTop: 2 }} numberOfLines={1}>
                  {item.provider_name || '—'} → {item.client_name || '—'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: F.b }}>{formatMoney(item.total, item.currency)}</Text>
                <InvoiceStatusPill status={item.status} es={es} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={{ flex: 1, backgroundColor: C.background }}>
          <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.line, flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setSelected(null)} style={{ marginRight: 12 }}>
              <Feather name="x" size={22} color={C.textPrimary} />
            </TouchableOpacity>
            <Text style={{ color: C.textPrimary, fontSize: 18, fontFamily: F.b }}>{selected?.inv_number}</Text>
          </View>
          {selected && (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
              <InvoiceView invoice={selected} es={es} />

              {!!selected.admin_notes && (
                <Text style={{ color: C.danger, fontFamily: F.r, fontSize: 13, marginTop: 12 }}>
                  {es ? 'Motivo de rechazo: ' : 'Rejection reason: '}{selected.admin_notes}
                </Text>
              )}

              {rejecting && (
                <View style={{ marginTop: 14 }}>
                  <TextInput
                    value={reason} onChangeText={setReason} multiline
                    placeholder={es ? 'Motivo del rechazo (el proveedor lo verá)' : 'Reason (the provider will see it)'}
                    placeholderTextColor={C.textMuted}
                    style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 12, minHeight: 80, textAlignVertical: 'top', color: C.textPrimary, fontFamily: F.r }}
                  />
                </View>
              )}

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
                {selected.status === 'pending_approval' && !rejecting && (
                  <>
                    {btn(es ? 'Rechazar' : 'Reject', () => setRejecting(true), C.danger)}
                    {btn(es ? 'Aprobar y enviar' : 'Approve & send', onApprove, C.success, true)}
                  </>
                )}
                {selected.status === 'pending_approval' && rejecting && (
                  <>
                    {btn(es ? 'Cancelar' : 'Cancel', () => setRejecting(false), C.textSecondary)}
                    {btn(es ? 'Confirmar rechazo' : 'Confirm reject', onReject, C.danger, true)}
                  </>
                )}
                {selected.status === 'sent' && (
                  <>
                    {btn(es ? 'Reenviar correo' : 'Resend email', onResend, C.accent2)}
                    {btn(es ? 'Marcar pagada' : 'Mark paid', onPaid, C.success, true)}
                  </>
                )}
                {['pending_approval', 'rejected', 'sent'].includes(selected.status) && !rejecting &&
                  btn(es ? 'Anular' : 'Void', onVoid, C.textSecondary)}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}
