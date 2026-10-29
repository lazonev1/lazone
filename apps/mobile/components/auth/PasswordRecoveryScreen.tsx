import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '@/backend/main/src/config/firebase';
import { RecoveryError, recoveryErrorKey, requestPasswordReset } from '@/backend/main/src/services/passwordRecoveryService';

// Email stays in component state rather than navigation URLs or analytics params.
export default function PasswordRecoveryScreen({ initialEmail, onBack }: { initialEmail: string; onBack: (email: string) => void }) {
  const { t, i18n } = useTranslation('auth');
  const [email, setEmail] = useState(initialEmail);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<RecoveryError | null>(null);
  const [retryAt, setRetryAt] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack(email.trim());
      return true;
    });
    return () => subscription.remove();
  }, [onBack, email]);
  useEffect(() => {
    const update = () => setRemaining(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    update();
    if (!retryAt) return;
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [retryAt]);

  const submit = async () => {
    if (busy.current || Date.now() < retryAt) return;
    busy.current = true;
    setPending(true);
    setError(null);
    Keyboard.dismiss();
    try {
      await requestPasswordReset(auth, email, i18n.resolvedLanguage || i18n.language);
      if (mounted.current) {
        setSent(true);
        setRetryAt(Date.now() + 60_000);
      }
    } catch (failure) {
      if (mounted.current) setError(recoveryErrorKey(failure));
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity accessibilityRole="button" style={styles.back} onPress={() => onBack(email.trim())}>
            <Text style={styles.link}>{t('recovery.back')}</Text>
          </TouchableOpacity>
          <Text accessibilityRole="header" style={styles.title}>{t(sent ? 'recovery.sentTitle' : 'recovery.title')}</Text>
          <Text style={styles.copy} accessibilityLiveRegion="polite">{t(sent ? 'recovery.sentMessage' : 'recovery.description')}</Text>
          {sent && <Text style={styles.copy}>{email.trim()}</Text>}
          {!sent && <>
            <Text style={styles.label}>{t('login.emailAddress')}</Text>
            <TextInput
              accessibilityLabel={t('login.emailAddress')}
              value={email}
              onChangeText={(value) => { setEmail(value); setError(null); }}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              maxLength={254}
              editable={!pending}
              returnKeyType="send"
              onSubmitEditing={submit}
            />
          </>}
          {error && <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>{t(`recovery.errors.${error}`)}</Text>}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ disabled: pending || remaining > 0, busy: pending }}
            disabled={pending || remaining > 0}
            onPress={submit}
            style={[styles.primary, (pending || remaining > 0) && styles.disabled]}
          >
            {pending && <ActivityIndicator color="#fff" />}
            <Text style={styles.primaryText}>{t(pending ? 'recovery.sending' : remaining > 0 ? 'recovery.wait' : sent ? 'recovery.resend' : 'recovery.send', { seconds: remaining })}</Text>
          </TouchableOpacity>
          {sent && <TouchableOpacity accessibilityRole="button" disabled={pending} style={styles.back} onPress={() => { setSent(false); setError(null); }}>
            <Text style={styles.link}>{t('recovery.changeEmail')}</Text>
          </TouchableOpacity>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#151718' },
  content: { flexGrow: 1, padding: 24, gap: 16, maxWidth: 560, width: '100%', alignSelf: 'center' },
  back: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' },
  link: { color: '#fcbd02', fontSize: 16 },
  title: { color: '#ECEDEE', fontSize: 28, fontWeight: '700' },
  copy: { color: '#ccc', fontSize: 16, lineHeight: 24 },
  label: { color: '#ECEDEE', fontSize: 16 },
  input: { backgroundColor: '#242628', borderColor: '#888', borderWidth: 1, borderRadius: 10, padding: 14, color: '#fff', fontSize: 16, minHeight: 52 },
  error: { color: '#ffb4ab', fontSize: 16 },
  primary: { backgroundColor: '#0A58A5', borderRadius: 14, padding: 16, minHeight: 52, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16, flexShrink: 1 },
  disabled: { opacity: 0.65 },
});
