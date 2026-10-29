import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signOut, verifyPasswordResetCode, confirmPasswordReset, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';

// Compile the actual service, without importing the production/native Firebase config.
const source = readFileSync(new URL('../backend/main/src/services/passwordRecoveryService.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const require = createRequire(import.meta.url);
function loadService(authModule = { sendPasswordResetEmail }) {
  const exports = {};
  runInNewContext(`(function(require, exports) { ${compiled}\n})`)(
    name => name === 'firebase/auth' ? authModule : require(name), exports,
  );
  return exports;
}

let calls = 0;
let received;
const stub = { languageCode: null };
const unit = loadService({ sendPasswordResetEmail: async (_auth, email) => { calls++; received = email; } });
for (const input of ['', '  ', 'missing-at', 'a@', 'a b@example.test', `${'x'.repeat(250)}@a.test`]) {
  await assert.rejects(unit.requestPasswordReset(stub, input, 'en'), { code: 'auth/invalid-email' });
}
assert.equal(calls, 0);
await unit.requestPasswordReset(stub, '  Person@example.test  ', 'fr-CA');
assert.equal(received, 'Person@example.test');
assert.equal(stub.languageCode, 'fr');
await unit.requestPasswordReset(stub, 'person@example.test', 'en-US');
assert.equal(stub.languageCode, 'en');
await assert.rejects(unit.requestPasswordReset(undefined, 'person@example.test', 'en'));
for (const code of ['auth/user-not-found', 'auth/user-disabled']) {
  const service = loadService({ sendPasswordResetEmail: async () => { throw { code }; } });
  await service.requestPasswordReset(stub, 'person@example.test', 'en');
}
for (const [code, key] of [
  ['auth/network-request-failed', 'network'], ['auth/too-many-requests', 'tooManyRequests'],
  ['auth/invalid-email', 'invalidEmail'], ['auth/internal-error', 'unavailable'],
]) {
  const failure = { code };
  const service = loadService({ sendPasswordResetEmail: async () => { throw failure; } });
  await assert.rejects(service.requestPasswordReset(stub, 'person@example.test', 'en'), error => error === failure);
  assert.equal(service.recoveryErrorKey(failure), key);
}

// Fail closed: this suite must be launched by the local Auth emulator.
assert.match(process.env.FIREBASE_AUTH_EMULATOR_HOST || '', /^(127\.0\.0\.1|localhost|0\.0\.0\.0):9099$/);
const projectId = 'demo-recovery';
const app = initializeApp({ projectId, apiKey: 'demo-key' }, `recovery-${Date.now()}`);
const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
const service = loadService();
try {
  const email = `recovery-${Date.now()}@example.test`;
  const oldPassword = 'Before-reset-123!';
  const newPassword = 'After-reset-456!';
  await createUserWithEmailAndPassword(auth, email, oldPassword);
  await signOut(auth);
  await service.requestPasswordReset(auth, ` ${email} `, 'fr');
  assert.equal(auth.languageCode, 'fr');
  assert.equal(auth.currentUser, null, 'requesting recovery must not sign in');
  const response = await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${projectId}/oobCodes`);
  assert.equal(response.status, 200);
  const { oobCodes } = await response.json();
  const reset = oobCodes.find(code => code.email === email && code.requestType === 'PASSWORD_RESET');
  assert.ok(reset, 'a real reset action must be generated');
  assert.equal(await verifyPasswordResetCode(auth, reset.oobCode), email);
  await confirmPasswordReset(auth, reset.oobCode, newPassword);
  await assert.rejects(confirmPasswordReset(auth, reset.oobCode, newPassword));
  await assert.rejects(signInWithEmailAndPassword(auth, email, oldPassword));
  await signInWithEmailAndPassword(auth, email, newPassword);
  await signOut(auth);
  await service.requestPasswordReset(auth, `unknown-${Date.now()}@example.test`, 'en');
  assert.equal(auth.currentUser, null);
  console.log('Password recovery checks passed: validation, error privacy, locale, reset, code reuse, and sign-in.');
} finally {
  await deleteApp(app);
}
