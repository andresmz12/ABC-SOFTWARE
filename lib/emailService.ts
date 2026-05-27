// lib/emailService.ts
// Client-side wrapper for the send-email Supabase Edge Function.
// Most emails fire automatically via DB triggers (see migrations 007/013/017).
// Use these functions when you need to trigger an email explicitly from app code.

import { supabase } from '@/lib/supabase';

async function invoke(type: string, data: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.functions.invoke('send-email', {
    body: { type, data },
  });
  if (error) {
    console.warn('[emailService]', type, error.message);
  }
}

export const emailService = {
  // ── Registration ────────────────────────────────────────────────────────────
  // Called after successful signUp to send a welcome email.
  // (Also triggered automatically via DB trigger on users INSERT.)
  sendWelcome: (user: {
    email: string;
    role: 'client' | 'company' | 'independent';
    preferred_language: string;
    name?: string;
  }) => invoke('welcome', user as Record<string, unknown>),

  // ── Provider status ─────────────────────────────────────────────────────────
  // Called when admin approves/rejects a provider.
  // (Also triggered automatically via DB trigger on companies/independents UPDATE.)
  notifyProviderApproved: (user: {
    email: string;
    preferred_language: string;
  }) => invoke('provider_approved', user as Record<string, unknown>),

  notifyProviderRejected: (user: {
    email: string;
    preferred_language: string;
  }) => invoke('provider_rejected', user as Record<string, unknown>),

  // ── Job lifecycle ────────────────────────────────────────────────────────────
  // (All triggered automatically via DB triggers — use these as manual fallbacks.)

  notifyNewJob: (job: {
    id: string;
    city: string;
    state: string;
    service_type: string;
    scheduled_date: string;
    estimated_hours: number;
    budget_usd?: number | null;
    budget_cop?: number | null;
  }) => invoke('new_job', job as Record<string, unknown>),

  notifyNewOffer: (application: {
    job_request_id: string;
    provider_id: string;
    provider_type: string;
    bid_amount_usd?: number | null;
    bid_amount_cop?: number | null;
    message?: string | null;
  }) => invoke('new_offer', application as Record<string, unknown>),

  notifyOfferAccepted: (application: {
    job_request_id: string;
    provider_id: string;
    provider_type: string;
    bid_amount_usd?: number | null;
    bid_amount_cop?: number | null;
  }) => invoke('offer_accepted', application as Record<string, unknown>),

  notifyOfferRejected: (application: {
    job_request_id: string;
    provider_id: string;
    provider_type: string;
  }) => invoke('offer_rejected', application as Record<string, unknown>),

  notifyJobStarted: (job: {
    id: string;
    client_id: string;
    city: string;
    started_at?: string | null;
  }) => invoke('job_started', job as Record<string, unknown>),

  notifyJobCompleted: (job: {
    id: string;
    client_id: string;
    city: string;
  }) => invoke('job_completed', job as Record<string, unknown>),

  // ── Chat ─────────────────────────────────────────────────────────────────────
  // (Triggered automatically via DB trigger on messages INSERT.)
  notifyNewMessage: (message: {
    chat_id: string;
    sender_id: string;
    content: string;
  }) => invoke('new_message', message as Record<string, unknown>),
};
