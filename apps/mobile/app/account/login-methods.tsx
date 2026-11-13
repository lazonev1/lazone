import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Appearance, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { PhoneAuthCredential } from 'firebase/auth';
import { useAuth } from '@/contexts/auth';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import PhoneVerificationForm, { LinkButton, PALETTES, PrimaryButton } from '@/components/auth/PhoneVerificationForm';
import { accountAccessErrorKey } from '@/backend/main/src/services/accountAccessErrors';
import { LoginMethod, passwordCredential } from '@/backend/main/src/services/authService';
import { formatPhoneNumber, normalizePhoneNumber } from '@/utils/phone';

// Firebase treats sign-ins within about five minutes as recent enough for
// credential changes; older sessions confirm the person first.
const RECENT_SIGN_IN_MS = 5 * 60_000;

type Target =
  | { kind: 'addPhone' }
  | { kind: 'changePhone' }
  | { kind: 'addEmail' }
  | { kind: 'remove'; method: LoginMethod };

type Flow = { target: Target; step: 'reauth' | 'edit' } | null;

export default function LoginMethodsScreen() {
  const { t } = useTranslation(['account', 'auth', 'common']);
  const navigation = useNavigation();
  const {
    user, userProfile, identities, refreshIdentities, reauthenticate,
    linkPhone, changePhone, linkEmail, removeLoginMethod, resendEmailVerification,
  } = useAuth();
  const tone = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  const palette = PALETTES[tone];
  const [flow, setFlow] = useState<Flow>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const reauthenticatedAt = useRef(0);

  useEffect(() => {
    navigation.setOptions({ title: t('loginMethods.title') });
  }, [navigation, t]);

  // Picks up an email confirmed in another app while this screen was away.
  useFocusEffect(useCallback(() => {
    refreshIdentities().catch(() => undefined);
  }, [refreshIdentities]));

  if (!user || !identities) return null;

  const hasPhone = identities.methods.includes('phone');
  const hasPassword = identities.methods.includes('password');
  const onlyMethod = identities.methods.length < 2;

  const isRecent = () => {
    const lastSignIn = Date.parse(user.metadata.lastSignInTime ?? '') || 0;
    return Date.now() - Math.max(lastSignIn, reauthenticatedAt.current) < RECENT_SIGN_IN_MS;
  };

  const showError = (failure: unknown) => setError(t(`auth:accessErrors.${accountAccessErrorKey(failure)}`));

  const finish = (message: string) => {
    setFlow(null);
    setError(null);
    setNotice(message);
  };

  const runRemove = async (method: LoginMethod) => {
    setWorking(true);
    try {
      await removeLoginMethod(method);
      finish(t('loginMethods.removed'));
    } catch (failure) {
      if (accountAccessErrorKey(failure) === 'requiresRecentLogin') {
        reauthenticatedAt.current = 0;
        setFlow({ target: { kind: 'remove', method }, step: 'reauth' });
      }
      showError(failure);
    } finally {
      setWorking(false);
    }
  };

  const proceed = (target: Target) => {
    setNotice(null);
    setError(null);
    if (!isRecent()) {
      setFlow({ target, step: 'reauth' });
    } else if (target.kind === 'remove') {
      setFlow(null);
      void runRemove(target.method);
    } else {
      setFlow({ target, step: 'edit' });
    }
  };

  const confirmRemove = (method: LoginMethod) => {
    const phone = method === 'phone';
    Alert.alert(
      t(phone ? 'loginMethods.removePhoneTitle' : 'loginMethods.removeEmailTitle'),
      phone
        ? t('loginMethods.removePhoneMessage', { phone: formatPhoneNumber(identities.phoneNumber) })
        : t('loginMethods.removeEmailMessage', { email: identities.email ?? '' }),
      [
        { text: t('common:actions.cancel'), style: 'cancel' },
        { text: t('loginMethods.remove'), style: 'destructive', onPress: () => proceed({ kind: 'remove', method }) },
      ]
    );
  };

  const reauthenticated = () => {
    reauthenticatedAt.current = Date.now();
    if (!flow) return;
    if (flow.target.kind === 'remove') {
      const { method } = flow.target;
      setFlow(null);
      void runRemove(method);
    } else {
      setFlow({ target: flow.target, step: 'edit' });
    }
  };

  const resendConfirmation = async () => {
    setWorking(true);
    setError(null);
    const sent = await resendEmailVerification();
    setWorking(false);
    if (sent) setNotice(t('loginMethods.confirmationSent', { email: identities.email ?? '' }));
    else setError(t('loginMethods.confirmationFailed'));
  };

  const flowTitle = !flow ? null
    : flow.step === 'reauth' ? t('loginMethods.reauthTitle')
    : flow.target.kind === 'addPhone' ? t('loginMethods.addPhoneTitle')
    : flow.target.kind === 'changePhone' ? t('loginMethods.changePhoneTitle')
    : t('loginMethods.addEmailTitle');

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <ThemedText style={styles.description}>{t('loginMethods.description')}</ThemedText>

        {notice && (
          <Text accessibilityLiveRegion="polite" style={[styles.notice, { color: palette.text, borderColor: palette.link }]}>
            {notice}
          </Text>
        )}
        {error && !flow && (
          <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[styles.error, { color: palette.error }]}>
            {error}
          </Text>
        )}

        {flow ? (
          <ThemedView style={[styles.card, { borderColor: palette.border }]}>
            <ThemedText type="defaultSemiBold" accessibilityRole="header">{flowTitle}</ThemedText>
            {flow.step === 'reauth' ? (
              <ReauthStep
                hasPassword={hasPassword}
                phoneNumber={identities.phoneNumber}
                email={identities.email}
                tone={tone}
                onReauthenticate={reauthenticate}
                onDone={reauthenticated}
              />
            ) : flow.target.kind === 'addEmail' ? (
              <AddEmailStep
                tone={tone}
                onSubmit={async (email, password) => {
                  await linkEmail(email, password);
                  finish(t('loginMethods.emailAdded', { email }));
                }}
              />
            ) : (
              <PhoneVerificationForm
                key={flow.target.kind}
                tone={tone}
                // A legacy profile number is only a prefill; it still needs an SMS code.
                initialPhoneNumber={flow.target.kind === 'addPhone'
                  ? normalizePhoneNumber(userProfile?.phoneNumber ?? '')
                  : null}
                submitLabel={flow.target.kind === 'addPhone'
                  ? t('loginMethods.addPhoneSubmit')
                  : t('loginMethods.changePhoneSubmit')}
                onVerified={async (credential: PhoneAuthCredential) => {
                  if (flow.target.kind === 'addPhone') {
                    await linkPhone(credential);
                    finish(t('loginMethods.phoneAdded'));
                  } else {
                    await changePhone(credential);
                    finish(t('loginMethods.phoneChanged'));
                  }
                }}
              />
            )}
            <LinkButton label={t('loginMethods.cancel')} color={palette.link} onPress={() => { setFlow(null); setError(null); }} />
          </ThemedView>
        ) : (
          <>
            <MethodCard
              title={t('loginMethods.phoneTitle')}
              value={hasPhone ? formatPhoneNumber(identities.phoneNumber) : t('loginMethods.none')}
              status={hasPhone ? t('loginMethods.verified') : null}
              palette={palette}
            >
              {hasPhone ? (
                <>
                  <LinkButton label={t('loginMethods.changePhone')} color={palette.link} disabled={working} onPress={() => proceed({ kind: 'changePhone' })} />
                  {!onlyMethod && (
                    <LinkButton label={t('loginMethods.remove')} color={palette.error} disabled={working} onPress={() => confirmRemove('phone')} />
                  )}
                </>
              ) : (
                <LinkButton label={t('loginMethods.addPhone')} color={palette.link} disabled={working} onPress={() => proceed({ kind: 'addPhone' })} />
              )}
            </MethodCard>

            <MethodCard
              title={t('loginMethods.emailTitle')}
              value={hasPassword ? identities.email ?? '' : t('loginMethods.none')}
              status={hasPassword
                ? (identities.emailVerified ? t('loginMethods.verified') : t('loginMethods.notConfirmed'))
                : null}
              palette={palette}
            >
              {hasPassword ? (
                <>
                  {!identities.emailVerified && (
                    <>
                      <LinkButton label={t('loginMethods.resendConfirmation')} color={palette.link} disabled={working} onPress={resendConfirmation} />
                      <LinkButton label={t('loginMethods.refreshConfirmation')} color={palette.link} disabled={working} onPress={() => { refreshIdentities().catch(showError); }} />
                    </>
                  )}
                  {!onlyMethod && (
                    <LinkButton label={t('loginMethods.remove')} color={palette.error} disabled={working} onPress={() => confirmRemove('password')} />
                  )}
                </>
              ) : (
                <LinkButton label={t('loginMethods.addEmail')} color={palette.link} disabled={working} onPress={() => proceed({ kind: 'addEmail' })} />
              )}
            </MethodCard>

            {onlyMethod && <ThemedText style={styles.hint}>{t('loginMethods.onlyMethod')}</ThemedText>}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function MethodCard({ title, value, status, palette, children }: {
  title: string;
  value: string;
  status: string | null;
  palette: (typeof PALETTES)['light'];
  children: React.ReactNode;
}) {
  return (
    <ThemedView style={[styles.card, { borderColor: palette.border }]}>
      <ThemedText type="defaultSemiBold">{title}</ThemedText>
      <ThemedText>{value}</ThemedText>
      {status && <ThemedText style={{ color: palette.muted }}>{status}</ThemedText>}
      <View style={styles.actions}>{children}</View>
    </ThemedView>
  );
}

function ReauthStep({ hasPassword, phoneNumber, email, tone, onReauthenticate, onDone }: {
  hasPassword: boolean;
  phoneNumber: string | null;
  email: string | null;
  tone: 'dark' | 'light';
  onReauthenticate: (credential: ReturnType<typeof passwordCredential>) => Promise<void>;
  onDone: () => void;
}) {
  const { t } = useTranslation(['account', 'auth']);
  const palette = PALETTES[tone];
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Prefer the password: it costs no SMS. Phone-only accounts confirm by SMS.
  if (!hasPassword) {
    return (
      <>
        <ThemedText>{t('loginMethods.reauthPhone')}</ThemedText>
        <PhoneVerificationForm
          tone={tone}
          lockedPhoneNumber={phoneNumber}
          submitLabel={t('loginMethods.reauthSubmit')}
          onVerified={async (credential) => {
            await onReauthenticate(credential);
            onDone();
          }}
        />
      </>
    );
  }

  const submit = async () => {
    if (busy || !password) return;
    setBusy(true);
    setError(null);
    try {
      await onReauthenticate(passwordCredential(password));
      onDone();
    } catch (failure) {
      setError(t(`auth:accessErrors.${accountAccessErrorKey(failure)}`));
      setBusy(false);
    }
  };

  return (
    <>
      <ThemedText>{t('loginMethods.reauthPassword', { email: email ?? '' })}</ThemedText>
      <Field label={t('loginMethods.passwordLabel')} value={password} onChangeText={setPassword} tone={tone}
        secureTextEntry autoComplete="current-password" textContentType="password" onSubmitEditing={submit} />
      {error && <Text accessibilityRole="alert" style={[styles.error, { color: palette.error }]}>{error}</Text>}
      <PrimaryButton label={busy ? t('loginMethods.confirming') : t('loginMethods.reauthSubmit')} busy={busy} onPress={submit} />
    </>
  );
}

function AddEmailStep({ tone, onSubmit }: {
  tone: 'dark' | 'light';
  onSubmit: (email: string, password: string) => Promise<void>;
}) {
  const { t } = useTranslation(['account', 'auth']);
  const palette = PALETTES[tone];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    if (password !== confirm) {
      setError(t('loginMethods.passwordMismatch'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(email.trim(), password);
    } catch (failure) {
      setError(t(`auth:accessErrors.${accountAccessErrorKey(failure)}`));
      setBusy(false);
    }
  };

  return (
    <>
      <Field label={t('loginMethods.emailLabel')} value={email} onChangeText={setEmail} tone={tone}
        keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" maxLength={254} />
      <Field label={t('loginMethods.passwordLabel')} value={password} onChangeText={setPassword} tone={tone}
        secureTextEntry autoComplete="new-password" textContentType="newPassword" />
      <Field label={t('loginMethods.confirmPasswordLabel')} value={confirm} onChangeText={setConfirm} tone={tone}
        secureTextEntry autoComplete="new-password" textContentType="newPassword" onSubmitEditing={submit} />
      {error && <Text accessibilityRole="alert" style={[styles.error, { color: palette.error }]}>{error}</Text>}
      <PrimaryButton label={busy ? t('loginMethods.adding') : t('loginMethods.addEmailSubmit')} busy={busy} onPress={submit} />
    </>
  );
}

function Field({ label, tone, ...props }: React.ComponentProps<typeof TextInput> & { label: string; tone: 'dark' | 'light' }) {
  const palette = PALETTES[tone];
  return (
    <View style={styles.field}>
      <ThemedText>{label}</ThemedText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={palette.placeholder}
        style={[styles.input, { backgroundColor: palette.input, borderColor: palette.border, color: palette.text }]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, gap: 16 },
  description: { fontSize: 15, lineHeight: 22 },
  notice: { borderLeftWidth: 4, paddingLeft: 12, fontSize: 15, lineHeight: 22 },
  error: { fontSize: 15, lineHeight: 22 },
  hint: { fontSize: 14, lineHeight: 20, opacity: 0.8 },
  card: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 20 },
  field: { gap: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 16, minHeight: 52 },
});
