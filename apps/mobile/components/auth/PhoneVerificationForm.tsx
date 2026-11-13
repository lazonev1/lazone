import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import CountryPicker, { CountryCode } from 'react-native-country-picker-modal';
import type { PhoneAuthCredential } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { AccountAccessError, accountAccessErrorKey } from '@/backend/main/src/services/accountAccessErrors';
import { usePhoneVerification } from '@/hooks/usePhoneVerification';
import { DEFAULT_PHONE_COUNTRY, formatPhoneNumber, normalizePhoneNumber, phoneNumberCountry } from '@/utils/phone';

export type FormTone = 'dark' | 'light';

type Props = {
  /** Prefill, e.g. a legacy unverified profile number. Still requires an SMS code. */
  initialPhoneNumber?: string | null;
  /** When set, the number is fixed (re-authenticating the account's own number). */
  lockedPhoneNumber?: string | null;
  submitLabel: string;
  tone?: FormTone;
  /** Redeems the credential. Throw to show a mapped error and keep the form. */
  onVerified: (credential: PhoneAuthCredential, e164PhoneNumber: string) => Promise<void>;
};

const CODE_LENGTH = 6;

export default function PhoneVerificationForm({
  initialPhoneNumber,
  lockedPhoneNumber,
  submitLabel,
  tone = 'dark',
  onVerified,
}: Props) {
  const { t } = useTranslation('auth');
  const palette = PALETTES[tone];
  const startingNumber = lockedPhoneNumber ?? initialPhoneNumber ?? '';
  const [country, setCountry] = useState<CountryCode>(
    (phoneNumberCountry(startingNumber) ?? DEFAULT_PHONE_COUNTRY) as CountryCode
  );
  const [input, setInput] = useState(startingNumber);
  const [code, setCode] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [redeemError, setRedeemError] = useState<AccountAccessError | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const redeem = async (credential: PhoneAuthCredential, e164: string) => {
    if (busy.current) return;
    busy.current = true;
    setSubmitting(true);
    setInputError(null);
    setRedeemError(null);
    Keyboard.dismiss();
    try {
      await onVerified(credential, e164);
    } catch (error) {
      if (mounted.current) setRedeemError(accountAccessErrorKey(error));
    } finally {
      busy.current = false;
      if (mounted.current) setSubmitting(false);
    }
  };

  // Android SMS auto-retrieval fills the code and redeems it immediately.
  const verification = usePhoneVerification((autoCode, credential, e164) => {
    setCode(autoCode);
    void redeem(credential, e164);
  });

  const requestCode = (resend = false) => {
    const e164 = lockedPhoneNumber ?? normalizePhoneNumber(input, country);
    if (!e164) {
      setInputError(t('phone.invalidNumber'));
      return;
    }
    setInputError(null);
    setRedeemError(null);
    Keyboard.dismiss();
    verification.send(e164, resend);
  };

  const submit = () => {
    if (!verification.phoneNumber) return;
    if (!new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code.trim())) {
      setInputError(t('phone.codeIncomplete'));
      return;
    }
    const credential = verification.credentialFor(code);
    if (!credential) {
      verification.setError('autoVerificationIncomplete');
      return;
    }
    void redeem(credential, verification.phoneNumber);
  };

  const accessError = redeemError ?? verification.error;
  const errorMessage = inputError ?? (accessError ? t(`accessErrors.${accessError}`) : null);
  const sending = verification.phase === 'sending';
  const codeStep = verification.awaitingCode;

  if (!codeStep) {
    return (
      <View style={styles.container}>
        <Text style={[styles.label, { color: palette.label }]}>{t('phone.label')}</Text>
        <View style={styles.phoneRow}>
          {!lockedPhoneNumber && (
            <View style={[styles.country, { backgroundColor: palette.input, borderColor: palette.border }]}>
              <CountryPicker
                countryCode={country}
                withFilter
                withFlag
                withCallingCode
                withCallingCodeButton
                onSelect={(selected) => { setCountry(selected.cca2); setInputError(null); }}
                theme={{ backgroundColor: palette.modal, onBackgroundTextColor: palette.text }}
              />
            </View>
          )}
          <TextInput
            accessibilityLabel={t('phone.label')}
            value={lockedPhoneNumber ? formatPhoneNumber(lockedPhoneNumber) : input}
            onChangeText={(value) => { setInput(value); setInputError(null); setRedeemError(null); verification.setError(null); }}
            editable={!lockedPhoneNumber && !sending}
            placeholder={t('phone.placeholder')}
            placeholderTextColor={palette.placeholder}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            maxLength={24}
            returnKeyType="send"
            onSubmitEditing={() => requestCode()}
            style={[styles.input, styles.phoneInput, { backgroundColor: palette.input, borderColor: palette.border, color: palette.text }]}
          />
        </View>
        <Text style={[styles.hint, { color: palette.muted }]}>{t('phone.consent')}</Text>
        {errorMessage && <ErrorText message={errorMessage} color={palette.error} />}
        <PrimaryButton
          label={sending ? t('phone.sending') : t('phone.send')}
          busy={sending}
          onPress={() => requestCode()}
        />
      </View>
    );
  }

  const resendLabel = verification.resendSeconds > 0
    ? t('phone.resendIn', { seconds: verification.resendSeconds })
    : t('phone.resend');
  return (
    <View style={styles.container}>
      <Text style={[styles.copy, { color: palette.text }]} accessibilityLiveRegion="polite">
        {t('phone.codeSentTo', { phone: formatPhoneNumber(verification.phoneNumber) })}
      </Text>
      <Text style={[styles.label, { color: palette.label }]}>{t('phone.codeLabel')}</Text>
      <TextInput
        accessibilityLabel={t('phone.codeLabel')}
        value={code}
        onChangeText={(value) => {
          setCode(value.replace(/\D/g, '').slice(0, CODE_LENGTH));
          setInputError(null);
          setRedeemError(null);
          verification.setError(null);
        }}
        editable={!submitting}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={CODE_LENGTH}
        returnKeyType="done"
        onSubmitEditing={() => submit()}
        style={[styles.input, styles.codeInput, { backgroundColor: palette.input, borderColor: palette.border, color: palette.text }]}
      />
      {errorMessage && <ErrorText message={errorMessage} color={palette.error} />}
      <PrimaryButton
        label={submitting ? t('phone.verifying') : submitLabel}
        busy={submitting}
        onPress={() => submit()}
      />
      <View style={styles.linkRow}>
        <LinkButton
          label={resendLabel}
          color={palette.link}
          disabled={submitting || sending || verification.resendSeconds > 0}
          onPress={() => requestCode(true)}
        />
        {!lockedPhoneNumber && (
          <LinkButton
            label={t('phone.changeNumber')}
            color={palette.link}
            disabled={submitting}
            onPress={() => { verification.reset(); setCode(''); setInputError(null); setRedeemError(null); }}
          />
        )}
      </View>
    </View>
  );
}

function ErrorText({ message, color }: { message: string; color: string }) {
  return (
    <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[styles.error, { color }]}>
      {message}
    </Text>
  );
}

export function PrimaryButton({ label, busy, disabled, onPress }: {
  label: string;
  busy?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const inactive = !!busy || !!disabled;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: !!busy }}
      disabled={inactive}
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.primary, inactive && styles.inactive]}
    >
      {busy && <ActivityIndicator color="#fff" />}
      <Text style={styles.primaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function LinkButton({ label, color, disabled, onPress }: {
  label: string;
  color: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.link, disabled && styles.inactive]}
    >
      <Text style={[styles.linkText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export const PALETTES: Record<FormTone, {
  text: string; label: string; muted: string; placeholder: string; input: string;
  border: string; error: string; link: string; modal: string;
}> = {
  dark: {
    text: '#ECEDEE', label: '#ECEDEE', muted: '#aaa', placeholder: '#888', input: '#242628',
    border: '#888', error: '#ffb4ab', link: '#fcbd02', modal: '#151718',
  },
  light: {
    text: '#11181C', label: '#3c3c43', muted: '#5f6368', placeholder: '#767676', input: '#f2f2f7',
    border: '#8e8e93', error: '#b3261e', link: '#0A58A5', modal: '#fff',
  },
};

const styles = StyleSheet.create({
  container: { gap: 12, width: '100%' },
  label: { fontSize: 16 },
  copy: { fontSize: 16, lineHeight: 24 },
  hint: { fontSize: 14, lineHeight: 20 },
  phoneRow: { flexDirection: 'row', gap: 8 },
  country: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, justifyContent: 'center', minHeight: 52 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 16, minHeight: 52 },
  phoneInput: { flex: 1 },
  codeInput: { fontSize: 24, letterSpacing: 8, textAlign: 'center' },
  error: { fontSize: 15, lineHeight: 22 },
  primary: {
    backgroundColor: '#0A58A5', borderRadius: 14, padding: 16, minHeight: 52,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16, flexShrink: 1, textAlign: 'center' },
  inactive: { opacity: 0.6 },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  link: { minHeight: 48, justifyContent: 'center' },
  linkText: { fontSize: 15 },
});
