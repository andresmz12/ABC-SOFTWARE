/**
 * Provider — Invoice editor.
 * Opened with ?jobId=… (creates the draft from the accepted bid if needed)
 * or ?invoiceId=…. Editable while draft/rejected; read-only afterwards.
 */
import { useCallback, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useLang } from '@/context/LanguageContext';
import { C } from '@/constants/theme';
import InvoiceView, { InvoiceStatusPill, TotalsBlock } from '@/components/invoice/InvoiceView';
import { confirmAction, notify } from '@/lib/dialog';
import {
  calcTotals, createInvoiceDraft, getInvoice, saveInvoiceDraft, submitInvoice,
} from '@/lib/invoiceService';
import type { Invoice } from '@/types';

interface Line { description: string; quantity: string; unit_price: string }

const F = { r: 'Inter_400Regular', m: 'Inter_500Medium', s: 'Inter_600SemiBold', b: 'Inter_700Bold' };

const num = (s: string) => {
  const n = parseFloat(s.replace(/,/g, '.'));
  return Number.isFinite(n) ? n : 0;
};

export default function ProviderInvoice() {
  const { jobId, invoiceId } = useLocalSearchParams<{ jobId?: string; invoiceId?: string }>();
  const router = useRouter();
  const { lang } = useLang();
  const es = lang === 'es';

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [taxRate, setTaxRate] = useState('0');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hydrate = (inv: Invoice) => {
    setInvoice(inv);
    setLines((inv.items ?? []).map((i) => ({
      description: i.description, quantity: String(i.quantity), unit_price: String(i.unit_price),
    })));
    setTaxRate(String(inv.tax_rate ?? 0));
    setNotes(inv.notes ?? '');
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const id = invoiceId ?? (jobId ? await createInvoiceDraft(jobId) : null);
      if (!id) throw new Error('Missing invoice or job id');
      hydrate(await getInvoice(id));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [jobId, invoiceId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const editable = invoice?.status === 'draft' || invoice?.status === 'rejected';
  const parsed = lines.map((l) => ({ description: l.description, quantity: num(l.quantity), unit_price: num(l.unit_price) }));
  const rate = Math.min(100, Math.max(0, num(taxRate)));
  const totals = calcTotals(parsed, rate);

  const persist = async (): Promise<boolean> => {
    if (!invoice) return false;
    try {
      await saveInvoiceDraft(invoice, parsed, { tax_rate: rate, notes: notes.trim(), due_date: invoice.due_date ?? null });
      return true;
    } catch (e: any) {
      notify(es ? 'No se pudo guardar' : 'Could not save', e.message);
      return false;
    }
  };

  const onSave = async () => {
    setBusy(true);
    try {
      if (await persist()) {
        hydrate(await getInvoice(invoice!.id));
        notify(es ? 'Borrador guardado' : 'Draft saved');
      }
    } finally { setBusy(false); }
  };

  const onSubmit = () => {
    if (!invoice) return;
    confirmAction(
      es ? 'Enviar a revisión' : 'Submit for review',
      es ? 'La factura será revisada y aprobada por la empresa antes de enviarse al cliente.'
         : 'The company will review and approve the invoice before it is sent to the client.',
      es ? 'Enviar' : 'Submit',
      es ? 'Cancelar' : 'Cancel',
      async () => {
        setBusy(true);
        try {
          if (!(await persist())) return;
          await submitInvoice(invoice.id);
          hydrate(await getInvoice(invoice.id));
        } catch (e: any) {
          notify('Error', e.message);
        } finally { setBusy(false); }
      },
    );
  };

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const input = {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, color: C.textPrimary, fontSize: 14, fontFamily: F.r,
  } as const;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.line, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Feather name="arrow-left" size={20} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={{ flex: 1, color: C.textPrimary, fontSize: 20, fontFamily: F.b }}>
          {es ? 'Factura' : 'Invoice'}
        </Text>
        {invoice && <InvoiceStatusPill status={invoice.status} es={es} />}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.accent} /></View>
      ) : error || !invoice ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Feather name="alert-circle" size={32} color={C.danger} />
          <Text style={{ color: C.textSecondary, fontFamily: F.r, marginTop: 12, textAlign: 'center' }}>{error}</Text>
          <TouchableOpacity onPress={load} style={{ marginTop: 16 }}>
            <Text style={{ color: C.accent, fontFamily: F.s }}>{es ? 'Reintentar' : 'Retry'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          {invoice.status === 'rejected' && (
            <View style={{ backgroundColor: `${C.danger}15`, borderColor: `${C.danger}40`, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 }}>
              <Text style={{ color: C.danger, fontFamily: F.s, fontSize: 13 }}>
                {es ? 'Rechazada por la empresa' : 'Rejected by the company'}
              </Text>
              {!!invoice.admin_notes && (
                <Text style={{ color: C.textPrimary, fontFamily: F.r, fontSize: 13, marginTop: 4 }}>{invoice.admin_notes}</Text>
              )}
              <Text style={{ color: C.textSecondary, fontFamily: F.r, fontSize: 12, marginTop: 6 }}>
                {es ? 'Corrige y vuelve a enviarla.' : 'Fix the issues and submit again.'}
              </Text>
            </View>
          )}

          {!editable ? (
            <>
              <InvoiceView invoice={invoice} es={es} />
              {invoice.status === 'pending_approval' && (
                <Text style={{ color: C.textSecondary, fontFamily: F.r, fontSize: 13, marginTop: 12, textAlign: 'center' }}>
                  {es ? 'Esperando aprobación de la empresa.' : 'Waiting for company approval.'}
                </Text>
              )}
            </>
          ) : (
            <>
              <View style={{ backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 14, marginBottom: 12 }}>
                <Text style={{ color: C.accent2, fontFamily: F.s, fontSize: 13 }}>{invoice.inv_number}</Text>
                <Text style={{ color: C.textMuted, fontFamily: F.s, fontSize: 11, marginTop: 10 }}>{es ? 'CLIENTE' : 'BILL TO'}</Text>
                <Text style={{ color: C.textPrimary, fontFamily: F.s, fontSize: 14 }}>{invoice.client_name || '—'}</Text>
                {!!invoice.client_email && <Text style={{ color: C.textSecondary, fontFamily: F.r, fontSize: 12 }}>{invoice.client_email}</Text>}
              </View>

              <Text style={{ color: C.textPrimary, fontFamily: F.s, fontSize: 14, marginBottom: 8 }}>
                {es ? 'Conceptos' : 'Line items'}
              </Text>
              {lines.map((l, i) => (
                <View key={i} style={{ backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 12, marginBottom: 10 }}>
                  <TextInput
                    style={input} value={l.description} onChangeText={(t) => setLine(i, { description: t })}
                    placeholder={es ? 'Descripción' : 'Description'} placeholderTextColor={C.textMuted} multiline
                  />
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8, alignItems: 'center' }}>
                    <TextInput
                      style={[input, { flex: 1 }]} value={l.quantity} keyboardType="decimal-pad"
                      onChangeText={(t) => setLine(i, { quantity: t })}
                      placeholder={es ? 'Cant.' : 'Qty'} placeholderTextColor={C.textMuted}
                    />
                    <TextInput
                      style={[input, { flex: 2 }]} value={l.unit_price} keyboardType="decimal-pad"
                      onChangeText={(t) => setLine(i, { unit_price: t })}
                      placeholder={es ? 'Precio unitario' : 'Unit price'} placeholderTextColor={C.textMuted}
                    />
                    <TouchableOpacity
                      onPress={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}
                      disabled={lines.length === 1} style={{ opacity: lines.length === 1 ? 0.3 : 1, padding: 6 }}
                    >
                      <Feather name="trash-2" size={18} color={C.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              <TouchableOpacity
                onPress={() => setLines((ls) => [...ls, { description: '', quantity: '1', unit_price: '0' }])}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}
              >
                <Feather name="plus-circle" size={16} color={C.accent} />
                <Text style={{ color: C.accent, fontFamily: F.s, fontSize: 14 }}>{es ? 'Agregar concepto' : 'Add line item'}</Text>
              </TouchableOpacity>

              <Text style={{ color: C.textPrimary, fontFamily: F.s, fontSize: 14, marginBottom: 6 }}>
                {es ? 'Impuesto (%)' : 'Tax rate (%)'}
              </Text>
              <TextInput style={[input, { marginBottom: 14 }]} value={taxRate} onChangeText={setTaxRate} keyboardType="decimal-pad" />

              <Text style={{ color: C.textPrimary, fontFamily: F.s, fontSize: 14, marginBottom: 6 }}>{es ? 'Notas' : 'Notes'}</Text>
              <TextInput
                style={[input, { minHeight: 70, textAlignVertical: 'top' }]} value={notes} onChangeText={setNotes}
                multiline placeholder={es ? 'Opcional' : 'Optional'} placeholderTextColor={C.textMuted}
              />

              <View style={{ backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 14, marginTop: 16 }}>
                <TotalsBlock subtotal={totals.subtotal} taxRate={rate} tax={totals.tax} total={totals.total} currency={invoice.currency} es={es} />
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                <TouchableOpacity
                  onPress={onSave} disabled={busy}
                  style={{ flex: 1, borderWidth: 1, borderColor: C.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: busy ? 0.5 : 1 }}
                >
                  <Text style={{ color: C.accent, fontFamily: F.s, fontSize: 15 }}>{es ? 'Guardar borrador' : 'Save draft'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onSubmit} disabled={busy}
                  style={{ flex: 1, backgroundColor: C.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: busy ? 0.5 : 1 }}
                >
                  {busy ? <ActivityIndicator color="#FFF" /> : (
                    <Text style={{ color: '#FFF', fontFamily: F.s, fontSize: 15 }}>{es ? 'Enviar a revisión' : 'Submit for review'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}
