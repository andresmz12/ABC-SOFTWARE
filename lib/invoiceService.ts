// Invoice data access. All money math that matters (item amounts, subtotal,
// tax, total) is recomputed by DB triggers — the client-side calc below is
// only for live preview while editing.

import { supabase } from '@/lib/supabase';
import { formatCOP, formatUSD } from '@/lib/countryData';
import type { Invoice, InvoiceItem, InvoiceStatus } from '@/types';

export const INVOICE_STATUS_META: Record<
  InvoiceStatus,
  { en: string; es: string; color: string }
> = {
  draft:            { en: 'Draft',            es: 'Borrador',          color: '#9AAAB8' },
  pending_approval: { en: 'Pending approval', es: 'Pendiente de aprobación', color: '#F59E0B' },
  rejected:         { en: 'Rejected',         es: 'Rechazada',         color: '#EF476F' },
  sent:             { en: 'Sent',             es: 'Enviada',           color: '#0077B6' },
  paid:             { en: 'Paid',             es: 'Pagada',            color: '#06D6A0' },
  void:             { en: 'Void',             es: 'Anulada',           color: '#9AAAB8' },
};

export function formatMoney(amount: number, currency: 'usd' | 'cop'): string {
  return currency === 'cop' ? formatCOP(amount) : formatUSD(amount);
}

export function calcTotals(
  items: Pick<InvoiceItem, 'quantity' | 'unit_price'>[],
  taxRate: number,
) {
  const subtotal = items.reduce(
    (s, i) => s + Math.round((i.quantity || 0) * (i.unit_price || 0) * 100) / 100,
    0,
  );
  const tax = Math.round(subtotal * (taxRate || 0)) / 100;
  return { subtotal, tax, total: subtotal + tax };
}

/** Creates (or returns the existing) draft for a completed job. */
export async function createInvoiceDraft(jobId: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_invoice_draft', { p_job_id: jobId });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function getInvoice(invoiceId: string): Promise<Invoice> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, items:invoice_items(*)')
    .eq('id', invoiceId)
    .single();
  if (error) throw new Error(error.message);
  const inv = data as Invoice;
  inv.items = (inv.items ?? []).sort((a, b) => a.position - b.position);
  return inv;
}

export async function getInvoiceForJob(jobId: string): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, items:invoice_items(*)')
    .eq('job_request_id', jobId)
    .neq('status', 'void')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Invoice | null) ?? null;
}

/** Provider saves edits: replaces line items and updates tax/notes/due date. */
export async function saveInvoiceDraft(
  invoice: Invoice,
  items: { description: string; quantity: number; unit_price: number }[],
  fields: { tax_rate: number; notes: string; due_date: string | null },
): Promise<void> {
  const clean = items.filter((i) => i.description.trim() && i.quantity > 0);
  if (clean.length === 0) throw new Error('Add at least one line item');

  // Insert the new lines first, then remove the old ones, so a failure never leaves the invoice empty.
  const { data: oldRows, error: oldErr } = await supabase
    .from('invoice_items').select('id').eq('invoice_id', invoice.id);
  if (oldErr) throw new Error(oldErr.message);

  const { error: insErr } = await supabase.from('invoice_items').insert(
    clean.map((i, idx) => ({
      invoice_id: invoice.id,
      description: i.description.trim(),
      quantity: i.quantity,
      unit_price: i.unit_price,
      position: idx,
    })),
  );
  if (insErr) throw new Error(insErr.message);

  const oldIds = (oldRows ?? []).map((r) => r.id);
  if (oldIds.length) {
    const { error: delErr } = await supabase.from('invoice_items').delete().in('id', oldIds);
    if (delErr) throw new Error(delErr.message);
  }

  const { error } = await supabase
    .from('invoices')
    .update({ tax_rate: fields.tax_rate, notes: fields.notes || null, due_date: fields.due_date })
    .eq('id', invoice.id);
  if (error) throw new Error(error.message);
}

/** Provider submits the reviewed invoice for admin approval. */
export async function submitInvoice(invoiceId: string): Promise<void> {
  const { data, error } = await supabase
    .from('invoices')
    .update({ status: 'pending_approval', admin_notes: null })
    .eq('id', invoiceId)
    .in('status', ['draft', 'rejected'])
    .select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('Invoice can no longer be submitted');
}

// ── Admin actions ─────────────────────────────────────────────────────────────

/** Approve → mark sent → email the client. */
export async function approveAndSendInvoice(invoiceId: string, adminId: string): Promise<void> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('invoices')
    .update({ status: 'sent', approved_by: adminId, approved_at: now, sent_at: now })
    .eq('id', invoiceId)
    .eq('status', 'pending_approval')
    .select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('Invoice is not pending approval');

  const { error: fnErr } = await supabase.functions.invoke('send-email', {
    body: { type: 'invoice_sent', data: { invoice_id: invoiceId } },
  });
  if (fnErr) {
    // Invoice is approved and visible to the client in-app; the email can be re-sent.
    throw new Error(`Approved, but the email could not be sent: ${fnErr.message}`);
  }
}

export async function resendInvoiceEmail(invoiceId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('send-email', {
    body: { type: 'invoice_sent', data: { invoice_id: invoiceId } },
  });
  if (error) throw new Error(error.message);
}

export async function rejectInvoice(invoiceId: string, reason: string): Promise<void> {
  const { data, error } = await supabase
    .from('invoices')
    .update({ status: 'rejected', admin_notes: reason })
    .eq('id', invoiceId)
    .eq('status', 'pending_approval')
    .select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('Invoice is not pending approval');
}

export async function markInvoicePaid(invoiceId: string): Promise<void> {
  const { data, error } = await supabase
    .from('invoices')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', invoiceId)
    .eq('status', 'sent')
    .select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('Invoice is not in sent state');
}

export async function voidInvoice(invoiceId: string): Promise<void> {
  const { error } = await supabase.from('invoices').update({ status: 'void' }).eq('id', invoiceId);
  if (error) throw new Error(error.message);
}
