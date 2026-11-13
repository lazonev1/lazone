// A04: equal phone/email access with one account per identity.
// Compiles the real services and runs them against the local Auth + Firestore
// emulators (with the repository's Firestore rules). The phone verification ID
// comes from the emulator's REST endpoint, mirroring the app, where the native
// SDK issues it and the Firebase JS SDK redeems it.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
// The Node build of firebase/auth stubs PhoneAuthProvider; the app bundles
// the React Native build, so the tests use it too.
const authModulePath = require
  .resolve('@firebase/auth/package.json', { paths: [require.resolve('firebase/package.json')] })
  .replace('package.json', 'dist/rn/index.js');
const authModule = require(authModulePath);
const firestoreModule = require('firebase/firestore');
const { initializeApp, deleteApp } = require('firebase/app');
const {
  connectAuthEmulator, getAuth, PhoneAuthProvider, signInWithEmailAndPassword, signOut,
} = authModule;
const { connectFirestoreEmulator, doc, getDoc, getFirestore, serverTimestamp, updateDoc } = firestoreModule;

function compile(relativePath, modules) {
  const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  // Same realm as the test: Firestore rejects objects built in another VM context.
  new Function('require', 'exports', outputText)(
    (name) => (name in modules ? modules[name] : require(name)), exports,
  );
  return exports;
}

const errors = compile('../backend/main/src/services/accountAccessErrors.ts', {});
const phone = compile('../utils/phone.ts', {});

// ── Pure checks: normalization and error classification ────────────────────
for (const input of ['70 12 34 56', '70123456', '+226 70 12 34 56', '0022670123456', ' +22670123456 ']) {
  assert.equal(phone.normalizePhoneNumber(input, 'BF'), '+22670123456', input);
}
assert.equal(phone.normalizePhoneNumber('(650) 253-0000', 'US'), '+16502530000');
assert.equal(phone.normalizePhoneNumber('+16502530000', 'BF'), '+16502530000', 'international input ignores the picker');
for (const input of ['', '   ', '123', 'abc', '+2267012', `+226${'7'.repeat(40)}`]) {
  assert.equal(phone.normalizePhoneNumber(input, 'BF'), null, input);
}
assert.equal(phone.formatPhoneNumber('+22670123456'), '+226 70 12 34 56');
assert.equal(phone.phoneNumberCountry('+22670123456'), 'BF');
for (const [code, key] of [
  ['auth/invalid-verification-code', 'invalidCode'], ['auth/code-expired', 'codeExpired'],
  ['auth/credential-already-in-use', 'phoneInUse'], ['auth/account-exists-with-different-credential', 'phoneInUse'],
  ['auth/email-already-in-use', 'emailInUse'], ['auth/requires-recent-login', 'requiresRecentLogin'],
  [errors.LAST_LOGIN_METHOD_CODE, 'lastLoginMethod'], ['auth/too-many-requests', 'tooManyRequests'],
  ['auth/quota-exceeded', 'tooManyRequests'], ['auth/billing-not-enabled', 'unavailable'],
  ['auth/operation-not-allowed', 'unavailable'], ['auth/invalid-credential', 'wrongCredentials'],
]) {
  assert.equal(errors.accountAccessErrorKey({ code }), key, code);
}
assert.equal(errors.accountAccessErrorKey(null), 'unavailable');

// ── Emulator checks ─────────────────────────────────────────────────────────
// Fail closed: never run against a real project.
assert.match(process.env.FIREBASE_AUTH_EMULATOR_HOST || '', /^(127\.0\.0\.1|localhost|0\.0\.0\.0):9099$/);
assert.match(process.env.FIRESTORE_EMULATOR_HOST || '', /^(127\.0\.0\.1|localhost|0\.0\.0\.0):8080$/);
const projectId = 'demo-access';
const authBase = 'http://127.0.0.1:9099';
const runId = Date.now();
const apps = [];

function createClient(name) {
  const app = initializeApp({ projectId, apiKey: 'demo-key', appId: 'demo-access-app' }, `${name}-${runId}`);
  apps.push(app);
  const auth = getAuth(app);
  const db = getFirestore(app);
  connectAuthEmulator(auth, authBase, { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  const service = compile('../backend/main/src/services/authService.ts', {
    'firebase/auth': authModule,
    'firebase/firestore': firestoreModule,
    '../config/firebase': { auth, db, COLLECTIONS: { USERS: 'users', PUBLIC_PROFILES: 'publicProfiles', PROVIDERS: 'providers' } },
    './accountAccessErrors': errors,
  });
  return { auth, db, service };
}

let numberSeed = 0;
function uniquePhone() {
  // Valid Burkina Faso mobile numbers, unique per run.
  numberSeed += 1;
  return `+2267${String((runId + numberSeed) % 10_000_000).padStart(7, '0')}`;
}

async function phoneCredential(phoneNumber, codeOverride) {
  const response = await fetch(`${authBase}/identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=demo-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phoneNumber, recaptchaToken: 'emulator' }),
  });
  const { sessionInfo } = await response.json();
  assert.ok(sessionInfo, `verification code request for ${phoneNumber}`);
  const codes = await (await fetch(`${authBase}/emulator/v1/projects/${projectId}/verificationCodes`)).json();
  const { code } = codes.verificationCodes.find((entry) => entry.sessionInfo === sessionInfo);
  return PhoneAuthProvider.credential(sessionInfo, codeOverride ?? code);
}

async function emailActions(email, requestType) {
  const { oobCodes } = await (await fetch(`${authBase}/emulator/v1/projects/${projectId}/oobCodes`)).json();
  return oobCodes.filter((entry) => entry.email === email && entry.requestType === requestType);
}

async function expectAccessError(promise, key, label) {
  await assert.rejects(promise, (error) => {
    assert.equal(errors.accountAccessErrorKey(error), key, `${label}: ${error.code}`);
    return true;
  }, label);
}

const profile = async (client, uid) => (await getDoc(doc(client.db, 'users', uid))).data();

try {
  const a = createClient('a');
  const b = createClient('b');

  // 1. Phone-only signup: no email or password involved; profile completed after sign-in.
  const phoneA = uniquePhone();
  const phoneUser = await a.service.loginWithPhone(await phoneCredential(phoneA));
  assert.equal(phoneUser.phoneNumber, phoneA);
  assert.equal(phoneUser.email, null);
  assert.deepEqual([...a.service.loginMethods(phoneUser)], ['phone']);
  assert.equal(await a.service.getUserProfile(phoneUser.uid), null, 'a new number has no profile yet');
  assert.equal(await a.service.createUserProfile(phoneUser.uid, ' Awa ', ' Ouédraogo '), true);
  const created = await profile(a, phoneUser.uid);
  assert.equal(created.firstName, 'Awa');
  assert.equal(created.lastName, 'Ouédraogo');
  assert.equal(created.phoneNumber, '', 'the profile never stores an unverified login identity');
  assert.equal(created.role, 'requester');
  assert.equal((await getDoc(doc(a.db, 'publicProfiles', phoneUser.uid))).data().firstName, 'Awa');
  await updateDoc(doc(a.db, 'users', phoneUser.uid), { bookmarked: ['provider-1'], updatedAt: serverTimestamp() });

  // 2. Re-sign-in with the same number: same UID, no second profile.
  await signOut(a.auth);
  const again = await a.service.loginWithPhone(await phoneCredential(phoneA));
  assert.equal(again.uid, phoneUser.uid);
  assert.equal(await a.service.createUserProfile(again.uid, 'Other', 'Name'), false, 'existing profile is kept');
  assert.equal((await profile(a, again.uid)).firstName, 'Awa');

  // 3. Differently formatted input normalizes to the same identity.
  const national = phoneA.replace('+226', '').replace(/(\d{2})(?=\d)/g, '$1 ');
  assert.equal(phone.normalizePhoneNumber(national, 'BF'), phoneA);
  await signOut(a.auth);
  assert.equal((await a.service.loginWithPhone(await phoneCredential(phone.normalizePhoneNumber(`00${phoneA.slice(1)}`, 'BF')))).uid, phoneUser.uid);

  // 4. Wrong and reused codes are rejected without signing in.
  await signOut(a.auth);
  await expectAccessError(a.service.loginWithPhone(await phoneCredential(phoneA, '000000')), 'invalidCode', 'wrong code');
  const once = await phoneCredential(phoneA);
  await a.service.loginWithPhone(once);
  await signOut(a.auth);
  await assert.rejects(a.service.loginWithPhone(once), 'a redeemed verification cannot be reused');
  assert.equal(a.auth.currentUser, null);

  // 5. Link email/password to the phone account: same UID, data preserved, confirmation sent.
  await a.service.loginWithPhone(await phoneCredential(phoneA));
  const emailA = `access-a-${runId}@example.test`;
  await a.service.linkEmailPassword(emailA, 'Linked-pass-123');
  assert.deepEqual([...a.service.loginMethods(a.auth.currentUser)], ['phone', 'password']);
  assert.equal((await emailActions(emailA, 'VERIFY_EMAIL')).length, 1, 'linking requests email confirmation');
  await signOut(a.auth);
  const viaEmail = await a.service.loginUser(emailA, 'Linked-pass-123');
  assert.equal(viaEmail.uid, phoneUser.uid, 'both methods return the same UID');
  assert.deepEqual((await profile(a, viaEmail.uid)).bookmarked, ['provider-1']);

  // 6. Email-only signup: no phone required; confirmation requested.
  const emailB = `access-b-${runId}@example.test`;
  const emailUser = await b.service.signupUser('Ali Traoré Diallo', emailB, 'Email-only-123');
  assert.equal(emailUser.phoneNumber, null);
  assert.deepEqual([...b.service.loginMethods(emailUser)], ['password']);
  const emailProfile = await profile(b, emailUser.uid);
  assert.equal(emailProfile.firstName, 'Ali');
  assert.equal(emailProfile.lastName, 'Traoré Diallo');
  assert.equal(emailProfile.phoneNumber, '');
  assert.equal((await emailActions(emailB, 'VERIFY_EMAIL')).length, 1, 'signup requests email confirmation');

  // 7. Link a phone to the email account: same UID. A phone that already
  // signs in to another account is refused first, without merging.
  await expectAccessError(b.service.linkPhone(await phoneCredential(phoneA)), 'phoneInUse', 'phone owned elsewhere');
  assert.deepEqual([...b.service.loginMethods(b.auth.currentUser)], ['password']);
  const phoneB = uniquePhone();
  await b.service.linkPhone(await phoneCredential(phoneB));
  assert.equal(b.auth.currentUser.phoneNumber, phoneB);
  await signOut(b.auth);
  assert.equal((await b.service.loginWithPhone(await phoneCredential(phoneB))).uid, emailUser.uid);

  // 8. Conflicts fail without merging: another account's phone and email.
  await expectAccessError(b.service.changePhone(await phoneCredential(phoneA)), 'phoneInUse', 'change to a phone owned elsewhere');
  const c = createClient('c');
  await c.service.loginWithPhone(await phoneCredential(uniquePhone()));
  await expectAccessError(c.service.linkEmailPassword(emailA, 'Another-pass-123'), 'emailInUse', 'email owned elsewhere');
  assert.equal(b.auth.currentUser.phoneNumber, phoneB, 'the failed link changed nothing');
  await signOut(a.auth);
  assert.equal((await a.service.loginWithPhone(await phoneCredential(phoneA))).uid, phoneUser.uid, 'the owner keeps the phone');
  await expectAccessError(a.service.linkPhone(await phoneCredential(uniquePhone())), 'alreadyLinked', 'second phone');

  // 9. Change number: same UID, new number signs in, old number no longer does.
  const phoneB2 = uniquePhone();
  await b.service.changePhone(await phoneCredential(phoneB2));
  await signOut(b.auth);
  assert.equal((await b.service.loginWithPhone(await phoneCredential(phoneB2))).uid, emailUser.uid);
  await signOut(b.auth);
  const reused = await b.service.loginWithPhone(await phoneCredential(phoneB));
  assert.notEqual(reused.uid, emailUser.uid, 'the released number is a new, profile-less account');
  assert.equal(await b.service.getUserProfile(reused.uid), null);

  // 10. Remove a method; the last one cannot be removed.
  await signOut(b.auth);
  await b.service.loginUser(emailB, 'Email-only-123');
  await b.service.reauthenticate(b.service.passwordCredential('Email-only-123'));
  await b.service.removeLoginMethod('phone');
  assert.deepEqual([...b.service.loginMethods(b.auth.currentUser)], ['password']);
  await expectAccessError(b.service.removeLoginMethod('password'), 'lastLoginMethod', 'last method');
  await expectAccessError(b.service.reauthenticate(b.service.passwordCredential('wrong-password')), 'wrongCredentials', 'bad re-auth');

  // 11. Concurrent first sign-in of one new number on two devices: one profile.
  const shared = uniquePhone();
  const deviceOne = createClient('device-one');
  const deviceTwo = createClient('device-two');
  const first = await deviceOne.service.loginWithPhone(await phoneCredential(shared));
  const second = await deviceTwo.service.loginWithPhone(await phoneCredential(shared));
  assert.equal(first.uid, second.uid);
  const outcomes = await Promise.all([
    deviceOne.service.createUserProfile(first.uid, 'First', 'Device'),
    deviceTwo.service.createUserProfile(second.uid, 'Second', 'Device'),
  ]);
  assert.deepEqual(outcomes.sort(), [false, true], 'exactly one device creates the profile');
  const winner = (await profile(deviceOne, first.uid)).firstName;
  assert.ok(['First', 'Second'].includes(winner));
  assert.equal((await profile(deviceTwo, first.uid)).firstName, winner);

  // 12. A profile can only be created for the signed-in account.
  await assert.rejects(deviceOne.service.createUserProfile(emailUser.uid, 'Not', 'Mine'));
  await signInWithEmailAndPassword(c.auth, emailA, 'Linked-pass-123');
  assert.equal(await c.service.createUserProfile(phoneUser.uid, 'Over', 'Write'), false, 'existing profile cannot be replaced');
  assert.equal((await profile(a, phoneUser.uid)).firstName, 'Awa');

  console.log('Account access checks passed: normalization, error mapping, phone-only, email-only, linking both ways, same-UID sign-in, conflicts, number change, removal, re-authentication, and concurrent profile creation.');
} finally {
  await Promise.all(apps.map((app) => deleteApp(app)));
}
