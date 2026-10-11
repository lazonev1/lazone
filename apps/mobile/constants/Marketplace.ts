export const MARKETPLACE_LIMITS = {
  maxProviderServices: 5,
  maxChecklistItems: 5,
  maxServiceNameLength: 120,
  maxServiceDescriptionLength: 1000,
  maxServiceAvailabilityLength: 200,
  maxChecklistDescriptionLength: 300,
  maxBookingNotesLength: 2000,
  maxPriceCfa: 999_999_999,
  maxAdvanceBookingDays: 365,
  minimumBookingLeadMinutes: 5,
} as const;

export const isValidCfaAmount = (value: string | number): boolean => {
  const normalized = typeof value === 'number' ? String(value) : value.trim();
  if (!/^[1-9]\d*$/.test(normalized)) return false;
  const amount = Number(normalized);
  return Number.isSafeInteger(amount) && amount <= MARKETPLACE_LIMITS.maxPriceCfa;
};

export const createMinimumBookingDate = (): Date =>
  new Date(Date.now() + MARKETPLACE_LIMITS.minimumBookingLeadMinutes * 60_000);

export const createMaximumBookingDate = (): Date =>
  new Date(Date.now() + MARKETPLACE_LIMITS.maxAdvanceBookingDays * 24 * 60 * 60_000);
