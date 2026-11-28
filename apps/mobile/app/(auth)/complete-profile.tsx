import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/auth';
import CheckBox from '@/components/ui/CheckBox';
import { LinkButton, PALETTES, PrimaryButton } from '@/components/auth/PhoneVerificationForm';
import { formatPhoneNumber } from '@/utils/phone';

const NAME_MAX_LENGTH = 80;
const palette = PALETTES.dark;

// Reached by the root layout whenever a signed-in account has no profile:
// a new phone number, or a signup interrupted before its profile was saved.
export default function CompleteProfileScreen() {
  const { t } = useTranslation(['auth', 'common']);
  const { identities, completeProfile, logout } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const busy = useRef(false);

  const identity = identities?.phoneNumber
    ? formatPhoneNumber(identities.phoneNumber)
    : identities?.email ?? '';

  const submit = async () => {
    if (busy.current) return;
    if (!firstName.trim() || !lastName.trim()) {
      setError(t('completeProfile.missingName'));
      return;
    }
    if (!termsAgreed) {
      setError(t('signup.errors.agreementMessage'));
      return;
    }
    busy.current = true;
    setSubmitting(true);
    setError(null);
    try {
      // On success the root layout leaves this screen once the profile loads.
      await completeProfile(firstName, lastName);
    } catch {
      setError(t('completeProfile.failed'));
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };

  const signOut = async () => {
    setSigningOut(true);
    try {
      await logout();
    } catch {
      setError(t('completeProfile.signOutFailed'));
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={styles.title}>{t('completeProfile.title')}</Text>
          <Text style={styles.copy}>{t('completeProfile.subtitle')}</Text>
          {!!identity && <Text style={styles.muted}>{t('completeProfile.signedInAs', { identity })}</Text>}

          <NameField
            label={t('completeProfile.firstName')}
            value={firstName}
            onChangeText={(value) => { setFirstName(value); setError(null); }}
            editable={!submitting}
            autoComplete="given-name"
            textContentType="givenName"
          />
          <NameField
            label={t('completeProfile.lastName')}
            value={lastName}
            onChangeText={(value) => { setLastName(value); setError(null); }}
            editable={!submitting}
            autoComplete="family-name"
            textContentType="familyName"
          />

          <View style={styles.termsRow}>
            <CheckBox isChecked={termsAgreed} setChecked={() => { setTermsAgreed((value) => !value); setError(null); }} />
            <Text style={styles.terms}>{t('signup.agreement')}</Text>
          </View>

          {error && (
            <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text>
          )}
          <PrimaryButton
            label={submitting ? t('completeProfile.submitting') : t('completeProfile.submit')}
            busy={submitting}
            disabled={signingOut}
            onPress={submit}
          />
          <LinkButton
            label={t('completeProfile.signOut')}
            color={palette.link}
            disabled={submitting || signingOut}
            onPress={signOut}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function NameField({ label, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="words"
        maxLength={NAME_MAX_LENGTH}
        returnKeyType="next"
        placeholderTextColor={palette.placeholder}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#151718' },
  content: { flexGrow: 1, padding: 24, gap: 16, maxWidth: 560, width: '100%', alignSelf: 'center' },
  title: { color: palette.text, fontSize: 28, fontWeight: '700' },
  copy: { color: '#ccc', fontSize: 16, lineHeight: 24 },
  muted: { color: palette.muted, fontSize: 15 },
  field: { gap: 6 },
  label: { color: palette.label, fontSize: 16 },
  input: {
    backgroundColor: palette.input, borderColor: palette.border, borderWidth: 1, borderRadius: 10,
    padding: 14, color: palette.text, fontSize: 16, minHeight: 52,
  },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  terms: { color: '#ccc', fontSize: 15, flexShrink: 1 },
  error: { color: palette.error, fontSize: 15, lineHeight: 22 },
});
