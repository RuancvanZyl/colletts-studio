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

export const supabase = createClient<Database>(url, key);
