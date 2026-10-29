import { Auth, sendPasswordResetEmail } from 'firebase/auth';

export type RecoveryError = 'invalidEmail' | 'network' | 'tooManyRequests' | 'unavailable';

export function recoveryErrorKey(error: unknown): RecoveryError {
  const code = (error as { code?: string } | null)?.code;
  if (code === 'auth/invalid-email') return 'invalidEmail';
  if (code === 'auth/network-request-failed') return 'network';
  if (code === 'auth/too-many-requests') return 'tooManyRequests';
  return 'unavailable';
}

/** Firebase hosts the reset-link form and validates its single-use code. */
export async function requestPasswordReset(
  auth: Auth | undefined,
  input: string,
  language: string,
): Promise<void> {
  const email = input.trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw Object.assign(new Error('Invalid email'), { code: 'auth/invalid-email' });
  }
  if (!auth) throw new Error('Authentication unavailable');
  auth.languageCode = language.toLowerCase().startsWith('fr') ? 'fr' : 'en';
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    // Keep the same public response even if enumeration protection is disabled.
    const code = (error as { code?: string }).code;
    if (code === 'auth/user-not-found' || code === 'auth/user-disabled') return;
    throw error;
  }
}
