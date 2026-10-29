/** Who we are in letters and emails. Change it here and every letter, email and printout follows. */
export const WORKSHOP = {
  name: 'Apex Trophy Solutions',
  platform: 'Apex Trophy Solutions',
  portalUrl: 'https://app.apextrophysolutions.com',
  /** The workshop's WhatsApp number in international digits, for example 27821234567. Outfitters use it to reach the workshop about a rejected skin. */
  whatsapp: '',
};

/** The link a hunter opens to create their profile (one per client, safe to resend). */
export const inviteUrl = (token: string) => `${WORKSHOP.portalUrl}/?invite=${encodeURIComponent(token)}`;

/**
 * How hunters pay until Xero is linked. Fill these in and they are shown on the hunter's quote after they accept it.
 * (Leave empty and the hunter is told the workshop will send the payment details.)
 */
export const PAYMENT_DETAILS = {
  accountName: '',
  bank: '',
  accountNumber: '',
  branchCode: '',
  swift: '',
  note: '',
};
