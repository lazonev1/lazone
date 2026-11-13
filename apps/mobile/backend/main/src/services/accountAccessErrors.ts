// Maps Firebase Authentication failures to stable translation keys. Raw Firebase
// messages are English, technical, and sometimes reveal account existence.
export type AccountAccessError =
  | 'invalidPhone'
  | 'invalidCode'
  | 'codeExpired'
  | 'tooManyRequests'
  | 'network'
  | 'appVerificationFailed'
  | 'phoneInUse'
  | 'emailInUse'
  | 'alreadyLinked'
  | 'requiresRecentLogin'
  | 'lastLoginMethod'
  | 'invalidEmail'
  | 'weakPassword'
  | 'wrongCredentials'
  | 'cancelled'
  // Android verified the number without an SMS code the JS session can redeem.
  | 'autoVerificationIncomplete'
  | 'unavailable';

/** Thrown before calling Firebase when removing a method would lock the account. */
export const LAST_LOGIN_METHOD_CODE = 'lazone/last-login-method';

const CODES: Record<string, AccountAccessError> = {
  'auth/invalid-phone-number': 'invalidPhone',
  'auth/missing-phone-number': 'invalidPhone',
  'auth/invalid-verification-code': 'invalidCode',
  'auth/missing-verification-code': 'invalidCode',
  'auth/code-expired': 'codeExpired',
  'auth/session-expired': 'codeExpired',
  'auth/invalid-verification-id': 'codeExpired',
  'auth/missing-verification-id': 'codeExpired',
  'auth/too-many-requests': 'tooManyRequests',
  'auth/quota-exceeded': 'tooManyRequests',
  'auth/network-request-failed': 'network',
  'auth/captcha-check-failed': 'appVerificationFailed',
  'auth/missing-client-identifier': 'appVerificationFailed',
  'auth/app-not-authorized': 'appVerificationFailed',
  'auth/invalid-app-credential': 'appVerificationFailed',
  'auth/missing-app-credential': 'appVerificationFailed',
  'auth/web-context-cancelled': 'cancelled',
  // Linking a phone that already signs in to another account. The emulator
  // and production report this case with different codes.
  'auth/credential-already-in-use': 'phoneInUse',
  'auth/account-exists-with-different-credential': 'phoneInUse',
  'auth/email-already-in-use': 'emailInUse',
  'auth/provider-already-linked': 'alreadyLinked',
  'auth/requires-recent-login': 'requiresRecentLogin',
  'auth/user-token-expired': 'requiresRecentLogin',
  [LAST_LOGIN_METHOD_CODE]: 'lastLoginMethod',
  'auth/invalid-email': 'invalidEmail',
  'auth/missing-email': 'invalidEmail',
  'auth/weak-password': 'weakPassword',
  'auth/missing-password': 'weakPassword',
  'auth/invalid-credential': 'wrongCredentials',
  'auth/invalid-login-credentials': 'wrongCredentials',
  'auth/wrong-password': 'wrongCredentials',
  'auth/user-not-found': 'wrongCredentials',
  'auth/user-mismatch': 'wrongCredentials',
};

export function accountAccessErrorKey(error: unknown): AccountAccessError {
  const code = (error as { code?: string } | null)?.code;
  // Billing, disabled providers, and internal failures are configuration
  // problems the user cannot fix; they all share the generic message.
  return (code && CODES[code]) || 'unavailable';
}
