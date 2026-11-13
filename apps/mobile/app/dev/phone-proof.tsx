// TEMPORARY A04 step-0 proof screen (development builds only). Remove before
// the feature PR is merged; it exists to show whether a verificationId issued
// by the native SDK can be redeemed by the Firebase JS SDK on each platform.
import { useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Redirect } from 'expo-router';
import {
  createUserWithEmailAndPassword,
  linkWithCredential,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '@/backend/main/src/config/firebase';
import {
  nativeAuthUserId,
  phoneCredential,
  PhoneVerificationRequest,
  requestPhoneVerification,
} from '@/services/auth/phoneVerification';

export default function PhoneProofScreen() {
  const [phone, setPhone] = useState('+226');
  const [code, setCode] = useState('');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const [, setRefresh] = useState(0);
  const request = useRef<PhoneVerificationRequest | null>(null);

  if (!__DEV__) return <Redirect href="/" />;

  const add = (line: string) =>
    setLog((current) => [`${new Date().toISOString().slice(11, 19)} ${line}`, ...current]);

  const send = (forceResend: boolean) => {
    request.current?.cancel();
    add(`request ${phone} forceResend=${forceResend} (${Platform.OS})`);
    request.current = requestPhoneVerification(
      phone.trim(),
      { forceResend },
      (event) => {
        add(`event ${event.state} verificationId=${event.verificationId ? `yes(${event.verificationId.length})` : 'NULL'} code=${event.code ? 'yes' : 'NULL'}`);
        if (event.verificationId) setVerificationId(event.verificationId);
        if (event.code) setCode(event.code);
      },
      (error) => add(`ERROR ${error.code ?? '?'} ${error.message}`),
    );
  };

  const redeem = async (mode: 'signIn' | 'link') => {
    if (!verificationId) return add('no verificationId yet');
    try {
      const credential = phoneCredential(verificationId, code);
      if (mode === 'signIn') {
        const result = await signInWithCredential(auth, credential);
        add(`JS signIn OK uid=${result.user.uid} phone=${result.user.phoneNumber}`);
      } else {
        if (!auth.currentUser) return add('link needs a signed-in JS user');
        const result = await linkWithCredential(auth.currentUser, credential);
        add(`JS link OK uid=${result.user.uid} providers=${result.user.providerData.map((p) => p.providerId).join(',')}`);
      }
    } catch (error) {
      const failure = error as { code?: string; message?: string };
      add(`JS ${mode} FAILED ${failure.code ?? '?'} ${failure.message ?? ''}`);
    }
    setRefresh((n) => n + 1);
  };

  // Use a disposable email account: linking permanently adds the phone to it.
  const emailSignIn = async (create: boolean) => {
    try {
      const result = create
        ? await createUserWithEmailAndPassword(auth, email.trim(), password)
        : await signInWithEmailAndPassword(auth, email.trim(), password);
      add(`JS email ${create ? 'create' : 'signIn'} OK uid=${result.user.uid}`);
    } catch (error) {
      const failure = error as { code?: string; message?: string };
      add(`JS email FAILED ${failure.code ?? '?'} ${failure.message ?? ''}`);
    }
    setRefresh((n) => n + 1);
  };

  const jsUser = auth.currentUser;
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>A04 phone proof ({Platform.OS})</Text>
      <Text style={styles.text}>
        JS user: {jsUser ? `${jsUser.uid} ${jsUser.phoneNumber ?? ''} [${jsUser.providerData.map((p) => p.providerId).join(',')}]` : 'none'}
      </Text>
      <Text style={styles.text}>Native user (must stay none): {nativeAuthUserId() ?? 'none'}</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" />
      <View style={styles.row}>
        <Button label="Send code" onPress={() => send(false)} />
        <Button label="Resend (force)" onPress={() => send(true)} />
      </View>
      <TextInput
        style={styles.input}
        value={code}
        onChangeText={setCode}
        placeholder="SMS code"
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
      />
      <View style={styles.row}>
        <Button label="Sign in (JS)" onPress={() => redeem('signIn')} />
        <Button label="Link to JS user" onPress={() => redeem('link')} />
      </View>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Disposable email" autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password (6+ chars)" secureTextEntry />
      <View style={styles.row}>
        <Button label="Email sign in (JS)" onPress={() => emailSignIn(false)} />
        <Button label="Create email acct" onPress={() => emailSignIn(true)} />
      </View>
      <View style={styles.row}>
        <Button label="Sign out (JS)" onPress={async () => { await signOut(auth); add('JS signed out'); setRefresh((n) => n + 1); }} />
      </View>
      {log.map((line, index) => <Text key={index} style={styles.log} selectable>{line}</Text>)}
    </ScrollView>
  );
}

function Button({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={onPress}>
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingTop: 64, gap: 12, backgroundColor: '#151718', flexGrow: 1 },
  title: { color: '#fff', fontSize: 20, fontWeight: '700' },
  text: { color: '#ddd' },
  input: { backgroundColor: '#242628', color: '#fff', borderRadius: 8, padding: 12, minHeight: 48 },
  row: { flexDirection: 'row', gap: 12 },
  button: { flex: 1, backgroundColor: '#0A58A5', borderRadius: 8, minHeight: 48, justifyContent: 'center', alignItems: 'center', padding: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
  log: { color: '#9fd', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12 },
});
