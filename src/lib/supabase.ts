import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// During local dev without a Supabase project yet, use placeholder values.
// The app will show the landing page but DB calls will fail until you add real credentials.
const url = supabaseUrl || 'https://placeholder.supabase.co';
const key = supabaseAnonKey || 'placeholder-anon-key';

// Read the email-link result BEFORE the client starts and clears the URL, so a
// password-reset link (or an expired one) is never missed by a late listener.
const linkText = typeof window !== 'undefined' ? `${window.location.hash}&${window.location.search}` : '';
const linkError = linkText.match(/error_description=([^&]+)/);
export const AUTH_LINK = {
  recovery: /type=recovery/.test(linkText),
  error: linkError ? decodeURIComponent(linkError[1].replace(/\+/g, ' ')) : null,
};


/**
 * Invitation link (?invite=TOKEN) from the workshop's welcome message. Remembered for the session so it
 * survives sign-in / sign-up redirects, and removed from the address bar.
 */
export function readInviteToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const t = new URLSearchParams(window.location.search).get('invite');
    if (t) {
      sessionStorage.setItem('apex_invite', t);
      const u = new URL(window.location.href); u.searchParams.delete('invite');
      window.history.replaceState({}, '', u.pathname + (u.search || '') + u.hash);
    }
    return sessionStorage.getItem('apex_invite');
  } catch { return null; }
}
export const clearInviteToken = () => { try { sessionStorage.removeItem('apex_invite'); } catch { /* ignore */ } };
export const INVITE_AT_LOAD = readInviteToken();

export const supabase = createClient<Database>(url, key);
