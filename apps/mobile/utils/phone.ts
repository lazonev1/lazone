import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

// Burkina Faso is the launch market and the app's existing country default.
export const DEFAULT_PHONE_COUNTRY: CountryCode = 'BF';

/**
 * Normalizes user input to E.164, the only form passed to Firebase
 * Authentication. Input may be national ("70 12 34 56") for the selected
 * country or international ("+226 70 12 34 56", "00226…").
 */
export function normalizePhoneNumber(input: string, country: string = DEFAULT_PHONE_COUNTRY): string | null {
  const trimmed = input.trim().replace(/^00/, '+');
  if (!trimmed || trimmed.length > 32) return null;
  const parsed = parsePhoneNumberFromString(trimmed, country as CountryCode);
  return parsed?.isValid() ? parsed.number : null;
}

/** Formats an E.164 number for display; returns the input if it cannot be parsed. */
export function formatPhoneNumber(e164: string | null | undefined): string {
  if (!e164) return '';
  return parsePhoneNumberFromString(e164)?.formatInternational() ?? e164;
}

/** Returns the region of an E.164 number, used to preselect the country picker. */
export function phoneNumberCountry(e164: string | null | undefined): CountryCode | null {
  if (!e164) return null;
  return parsePhoneNumberFromString(e164)?.country ?? null;
}
