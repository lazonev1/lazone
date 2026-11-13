import { getAuth as getNativeAuth, verifyPhoneNumber } from '@react-native-firebase/auth';
import { PhoneAuthProvider, type PhoneAuthCredential } from 'firebase/auth';

// The native SDK only performs app verification and sends the SMS. It never
// holds a LaZone session: the code is redeemed through the Firebase JS SDK,
// whose session Firestore rules see.

// RNFB 26.4.0 declares these listener shapes but its package entry does not
// resolve them for consumers, so the callbacks are typed here.
type NativeSnapshot = {
  state: 'sent' | 'timeout' | 'verified' | 'error';
  verificationId: string | null;
  code: string | null;
};
type NativeError = { code: string | null; message: string | null };

export type PhoneVerificationEvent = {
  state: 'sent' | 'timeout' | 'verified';
  verificationId: string | null;
  // Android SMS auto-retrieval fills this; instant verification may not.
  code: string | null;
};

export type PhoneVerificationRequest = {
  cancel: () => void;
};

export function requestPhoneVerification(
  e164PhoneNumber: string,
  options: { forceResend?: boolean; autoVerifyTimeoutSeconds?: number },
  onEvent: (event: PhoneVerificationEvent) => void,
  onError: (error: { code?: string; message: string }) => void,
): PhoneVerificationRequest {
  let active = true;
  verifyPhoneNumber(
    getNativeAuth(),
    e164PhoneNumber,
    options.autoVerifyTimeoutSeconds ?? 60,
    options.forceResend ?? false,
  ).on(
    'state_changed',
    (snapshot: NativeSnapshot) => {
      if (!active || snapshot.state === 'error') return;
      onEvent({
        state: snapshot.state,
        verificationId: snapshot.verificationId || null,
        code: snapshot.code || null,
      });
    },
    (error: NativeError) => {
      if (active) onError({ code: error.code ?? undefined, message: error.message ?? 'Phone verification failed' });
    },
  );
  return { cancel: () => { active = false; } };
}

export function phoneCredential(verificationId: string, code: string): PhoneAuthCredential {
  return PhoneAuthProvider.credential(verificationId, code.trim());
}

export function nativeAuthUserId(): string | null {
  return getNativeAuth().currentUser?.uid ?? null;
}
