import { useCallback, useEffect, useRef, useState } from 'react';
import type { PhoneAuthCredential } from 'firebase/auth';
import { AccountAccessError, accountAccessErrorKey } from '@/backend/main/src/services/accountAccessErrors';
import {
  phoneCredential,
  PhoneVerificationRequest,
  requestPhoneVerification,
} from '@/services/auth/phoneVerification';

export const RESEND_COOLDOWN_MS = 60_000;

export type PhoneVerificationPhase = 'idle' | 'sending' | 'codeSent';

/**
 * Drives one SMS verification: request → code sent → (optional) Android
 * auto-retrieval (reported through `onAutoRetrieved`) → credential. Redeeming the credential is the caller's job,
 * because sign-in, linking, re-authentication, and number changes differ.
 */
type AutoRetrieved = (code: string, credential: PhoneAuthCredential, e164PhoneNumber: string) => void;

export function usePhoneVerification(onAutoRetrieved?: AutoRetrieved) {
  const [phase, setPhase] = useState<PhoneVerificationPhase>('idle');
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [error, setError] = useState<AccountAccessError | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [resendSeconds, setResendSeconds] = useState(0);
  const request = useRef<PhoneVerificationRequest | null>(null);
  const autoRetrieved = useRef(onAutoRetrieved);
  useEffect(() => { autoRetrieved.current = onAutoRetrieved; }, [onAutoRetrieved]);

  useEffect(() => () => request.current?.cancel(), []);

  useEffect(() => {
    const update = () => setResendSeconds(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    update();
    if (!resendAt) return;
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [resendAt]);

  const send = useCallback((e164PhoneNumber: string, resend = false) => {
    request.current?.cancel();
    setPhase('sending');
    setError(null);
    setPhoneNumber(e164PhoneNumber);
    if (!resend) setVerificationId(null);
    const current = requestPhoneVerification(
      e164PhoneNumber,
      { forceResend: resend },
      (event) => {
        if (event.state === 'sent' && event.verificationId) {
          setVerificationId(event.verificationId);
          setPhase('codeSent');
          setResendAt(Date.now() + RESEND_COOLDOWN_MS);
        } else if (event.state === 'verified') {
          if (event.verificationId && event.code) {
            setVerificationId(event.verificationId);
            setPhase('codeSent');
            autoRetrieved.current?.(event.code, phoneCredential(event.verificationId, event.code), e164PhoneNumber);
          } else {
            // Instant verification sends no SMS and yields nothing the JS
            // session can redeem: ask for a real code instead.
            setPhase('codeSent');
            setResendAt(0);
            setError('autoVerificationIncomplete');
          }
        }
        // 'timeout' only ends Android auto-retrieval; manual entry continues.
      },
      (failure) => {
        setError(accountAccessErrorKey(failure));
        setPhase((previous) => (previous === 'sending' && !resend ? 'idle' : 'codeSent'));
      },
    );
    request.current = current;
  }, []);

  const credentialFor = useCallback(
    (code: string): PhoneAuthCredential | null => (verificationId ? phoneCredential(verificationId, code) : null),
    [verificationId]
  );

  const reset = useCallback(() => {
    request.current?.cancel();
    request.current = null;
    setPhase('idle');
    setVerificationId(null);
    setError(null);
    setResendAt(0);
  }, []);

  return {
    phase,
    // A code was sent (resending keeps this true, so the code step stays visible).
    awaitingCode: phase === 'codeSent' || verificationId !== null,
    phoneNumber,
    error,
    setError,
    resendSeconds,
    send,
    credentialFor,
    reset,
  };
}
