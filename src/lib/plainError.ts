// Turns database / network error text into plain words a non-technical person can act on.
// Messages we wrote ourselves (already plain) pass through unchanged.

const RULES: [RegExp, string][] = [
  [/failed to fetch|networkerror|load failed|network request failed|timeout|timed out/i,
    'No internet connection right now. Your work is safe on this device. Try again when you are back online.'],
  [/jwt|token.*expired|not authenticated|auth session missing/i,
    'Your sign-in has timed out. Please sign in again.'],
  [/row-level security|permission denied|not authori[sz]ed|violates row/i,
    "You don't have permission to do that. If you think you should, please ask the office."],
  [/invalid input syntax for type uuid/i,
    'This account is not fully set up yet. Please sign out and sign in again.'],
  [/duplicate key|already exists/i,
    'That is already in the system.'],
  [/violates foreign key|still referenced/i,
    "This is linked to other records, so it can't be changed or removed."],
  [/null value in column|violates not-null|violates check constraint/i,
    'Something required is missing or not allowed. Please check what you filled in and try again.'],
  [/pgrst|schema cache|relation .* does not exist|column .* does not exist|function .* does not exist|syntax error|could not find the/i,
    'Something went wrong on our side. Please try again, and tell the office if it keeps happening.'],
];

export function plainError(message: unknown): string {
  const text = typeof message === 'string' ? message : (message as { message?: string } | null)?.message ?? '';
  if (!text) return 'Something went wrong. Please try again.';
  for (const [re, plain] of RULES) if (re.test(text)) return plain;
  return text;
}

// Applies plainError to every red error pop-up in the app. The original text still goes to the console for debugging.
export function installPlainErrors(toast: { error: (...a: any[]) => any }) {
  const original = toast.error.bind(toast);
  toast.error = (message: any, ...rest: any[]) => {
    if (typeof message === 'string') {
      const plain = plainError(message);
      if (plain !== message) console.warn('[error shown as]', plain, '\n[original]', message);
      return original(plain, ...rest);
    }
    return original(message, ...rest);
  };
}
