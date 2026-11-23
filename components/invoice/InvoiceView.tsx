// Read-only invoice rendering shared by provider, admin and client screens.
import { View, Text } from 'react-native';
import { C } from '@/constants/theme';
import { formatMoney, INVOICE_STATUS_META } from '@/lib/invoiceService';
import type { Invoice } from '@/types';

const F = { r: 'Inter_400Regular', m: 'Inter_500Medium', s: 'Inter_600SemiBold', b: 'Inter_700Bold' };

export function InvoiceStatusPill({ status, es }: { status: Invoice['status']; es: boolean }) {
  const m = INVOICE_STATUS_META[status];
  return (
    <View style={{ backgroundColor: `${m.color}22`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <Text style={{ color: m.color, fontSize: 11, fontFamily: F.s }}>{es ? m.es : m.en}</Text>
    </View>
  );
}

function Party({ label, name, email }: { label: string; name?: string | null; email?: string | null }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: F.s, marginBottom: 4 }}>{label}</Text>
      <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: F.s }}>{name || '—'}</Text>
      {!!email && <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: F.r, marginTop: 2 }}>{email}</Text>}
    </View>
  );
}

export function TotalsBlock({
  subtotal, taxRate, tax, total, currency, es,
}: { subtotal: number; taxRate: number; tax: number; total: number; currency: 'usd' | 'cop'; es: boolean }) {
  const row = (label: string, value: string, bold = false) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={{ color: bold ? C.textPrimary : C.textSecondary, fontSize: bold ? 16 : 13, fontFamily: bold ? F.b : F.r }}>{label}</Text>
      <Text style={{ color: C.textPrimary, fontSize: bold ? 16 : 13, fontFamily: bold ? F.b : F.m }}>{value}</Text>
    </View>
  );
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10, marginTop: 6 }}>
      {row('Subtotal', formatMoney(subtotal, currency))}
      {row(`${es ? 'Impuesto' : 'Tax'} (${taxRate}%)`, formatMoney(tax, currency))}
      {row('Total', formatMoney(total, currency), true)}
    </View>
  );
}

export default function InvoiceView({ invoice, es }: { invoice: Invoice; es: boolean }) {
  const date = (d?: string | null) => (d ? new Date(d).toLocaleDateString(es ? 'es-CO' : 'en-US') : '—');
  return (
    <View style={{ backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <View>
          <Text style={{ color: C.textPrimary, fontSize: 20, fontFamily: F.b }}>{es ? 'FACTURA' : 'INVOICE'}</Text>
          <Text style={{ color: C.accent2, fontSize: 13, fontFamily: F.s, marginTop: 2 }}>{invoice.inv_number}</Text>
        </View>
        <InvoiceStatusPill status={invoice.status} es={es} />
      </View>

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
        <Party label={es ? 'DE' : 'FROM'} name={invoice.provider_name} email={invoice.provider_email} />
        <Party label={es ? 'PARA' : 'BILL TO'} name={invoice.client_name} email={invoice.client_email} />
      </View>

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: F.s }}>{es ? 'EMISIÓN' : 'ISSUED'}</Text>
          <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: F.m, marginTop: 2 }}>{date(invoice.issue_date)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: F.s }}>{es ? 'VENCIMIENTO' : 'DUE'}</Text>
          <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: F.m, marginTop: 2 }}>{date(invoice.due_date)}</Text>
        </View>
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: C.line }}>
        {(invoice.items ?? []).map((it) => (
          <View key={it.id} style={{ flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.surface2 }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: F.m }}>{it.description}</Text>
              <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: F.r, marginTop: 2 }}>
                {it.quantity} × {formatMoney(it.unit_price, invoice.currency)}
              </Text>
            </View>
            <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: F.s }}>{formatMoney(it.amount, invoice.currency)}</Text>
          </View>
        ))}
      </View>

      <TotalsBlock
        subtotal={invoice.subtotal} taxRate={invoice.tax_rate} tax={invoice.tax_amount}
        total={invoice.total} currency={invoice.currency} es={es}
      />

      {!!invoice.notes && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: F.s }}>{es ? 'NOTAS' : 'NOTES'}</Text>
          <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: F.r, marginTop: 2, lineHeight: 19 }}>{invoice.notes}</Text>
        </View>
      )}
    </View>
  );
}
