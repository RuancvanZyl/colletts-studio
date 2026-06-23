/**
 * Xero integration service.
 *
 * The OAuth 2.0 flow lives in a Supabase Edge Function (xero-oauth).
 * This module handles everything the frontend needs:
 *  - Checking connection status (stored in localStorage after OAuth callback)
 *  - Pushing invoices to Xero via a Supabase Edge Function proxy
 *  - Syncing payment status back from Xero
 *
 * Setup steps (one-time, done by admin):
 *  1. Create a Xero app at developer.xero.com — get Client ID + Secret
 *  2. Deploy the Supabase Edge Function: supabase/functions/xero-proxy/index.ts
 *  3. Store XERO_CLIENT_ID, XERO_CLIENT_SECRET, XERO_TENANT_ID as Supabase secrets
 *  4. Click "Connect Xero" in Admin → Integrations and complete OAuth
 */

import { supabase } from './supabase';

export interface XeroConnectionStatus {
  connected: boolean;
  tenantName: string | null;
  expiresAt: string | null;
}

export interface XeroInvoicePayload {
  invoiceId: string;       // internal UUID
  invoiceNumber: string;
  clientName: string;
  clientEmail: string | null;
  issueDate: string;       // YYYY-MM-DD
  dueDate: string | null;
  currency: string;
  lineItems: { description: string; quantity: number; unitPrice: number; accountCode?: string }[];
  depositAmount: number | null;
  notes: string | null;
}

export interface XeroSyncResult {
  xeroInvoiceId: string | null;
  xeroInvoiceNumber: string | null;
  error: string | null;
}

/** Read cached connection info stored after OAuth callback */
export function getXeroStatus(): XeroConnectionStatus {
  try {
    const raw = localStorage.getItem('xero_connection');
    if (!raw) return { connected: false, tenantName: null, expiresAt: null };
    return JSON.parse(raw);
  } catch {
    return { connected: false, tenantName: null, expiresAt: null };
  }
}

/** Save after successful OAuth callback */
export function saveXeroConnection(data: { tenantName: string; expiresAt: string }) {
  localStorage.setItem('xero_connection', JSON.stringify({ connected: true, ...data }));
}

/** Clear on disconnect */
export function clearXeroConnection() {
  localStorage.removeItem('xero_connection');
}

/**
 * Start the Xero OAuth flow.
 * Redirects the browser to Xero's authorisation page via your Edge Function.
 */
export function startXeroOAuth() {
  const { data: { session } } = { data: { session: null } }; // placeholder
  // The edge function builds the URL and redirects
  window.location.href = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/xero-oauth/authorize`;
}

/**
 * Push a new invoice to Xero.
 * Calls the xero-proxy Edge Function which holds the OAuth tokens server-side.
 */
export async function pushInvoiceToXero(payload: XeroInvoicePayload): Promise<XeroSyncResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { xeroInvoiceId: null, xeroInvoiceNumber: null, error: 'Not authenticated' };

  try {
    const resp = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/xero-proxy/invoices`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ message: resp.statusText }));
      return { xeroInvoiceId: null, xeroInvoiceNumber: null, error: err.message ?? 'Xero sync failed' };
    }

    const result = await resp.json();
    return {
      xeroInvoiceId: result.invoiceID ?? null,
      xeroInvoiceNumber: result.invoiceNumber ?? null,
      error: null,
    };
  } catch (e: any) {
    return { xeroInvoiceId: null, xeroInvoiceNumber: null, error: e.message };
  }
}

/**
 * Fetch payment status for an invoice from Xero.
 */
export async function getXeroInvoiceStatus(xeroInvoiceId: string): Promise<{ status: string | null; amountPaid: number; amountDue: number; error: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { status: null, amountPaid: 0, amountDue: 0, error: 'Not authenticated' };

  try {
    const resp = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/xero-proxy/invoices/${xeroInvoiceId}`,
      { headers: { Authorization: `Bearer ${session.access_token}` } }
    );
    if (!resp.ok) return { status: null, amountPaid: 0, amountDue: 0, error: resp.statusText };
    const data = await resp.json();
    return {
      status: data.status ?? null,
      amountPaid: data.amountPaid ?? 0,
      amountDue: data.amountDue ?? 0,
      error: null,
    };
  } catch (e: any) {
    return { status: null, amountPaid: 0, amountDue: 0, error: e.message };
  }
}
