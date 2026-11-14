import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { compileFunction } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const appSdk = require('firebase/app');
const authSdk = require('firebase/auth');
const firestoreSdk = require('firebase/firestore');
const storageSdk = require('firebase/storage');
const load = (path, modules = {}, globals = {}) => {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  // Compile in the current realm so the Firebase SDK receives plain objects,
  // not objects whose prototypes belong to another VM context.
  compileFunction(outputText, ['require', 'exports', 'process', '__DEV__'])(
    name => modules[name] ?? require(name), exports, globals.process ?? { env: {} }, globals.__DEV__,
  );
  return exports;
};
const environment = load('backend/main/src/config/firebaseEnvironment.ts', {}, {
  __DEV__: true,
  process: { env: { EXPO_PUBLIC_FIREBASE_EMULATORS: 'true', EXPO_PUBLIC_FIREBASE_EMULATOR_HOST: '127.0.0.1' } },
});
const { firebaseEmulators: local, resolveFirebaseEmulators } = environment;
assert.equal(resolveFirebaseEmulators(undefined, undefined, true), null);
assert.equal(resolveFirebaseEmulators(undefined, undefined, false), null);
assert.equal(resolveFirebaseEmulators('true', '10.0.2.2', true).projectId, 'demo-lazone-mobile');
assert.throws(() => resolveFirebaseEmulators('true', '127.0.0.1', false), /development/);
assert.throws(() => resolveFirebaseEmulators('true', undefined, true), /require/);
assert.throws(() => resolveFirebaseEmulators('true', 'https://not-local:1234', true), /require/);
assert.throws(() => resolveFirebaseEmulators(undefined, '127.0.0.1', true), /explicit/);
assert.throws(() => resolveFirebaseEmulators(undefined, undefined, true, 'true'), /removed/);
assert.throws(() => resolveFirebaseEmulators(undefined, undefined, true, undefined, 'localhost'), /removed/);

// Require the dedicated emulator suite. No scripts may target the shared project.
assert.equal(process.env.GCLOUD_PROJECT, local.projectId);
for (const [name, port] of [['FIREBASE_AUTH_EMULATOR_HOST', local.authPort], ['FIRESTORE_EMULATOR_HOST', local.firestorePort], ['FIREBASE_STORAGE_EMULATOR_HOST', local.storagePort]]) {
  assert.equal(process.env[name], `127.0.0.1:${port}`, `Run test:simulator-firebase with the dedicated emulator suite (${name})`);
}
const config = JSON.parse(readFileSync(new URL('../firebase.simulator.json', import.meta.url), 'utf8'));
assert.deepEqual(Object.keys(config.emulators).filter(key => !['ui', 'singleProjectMode'].includes(key)).sort(), ['auth', 'firestore', 'storage']);
assert.equal(config.functions, undefined);
const appModule = {
  ...appSdk,
  initializeApp(options, name) {
    assert.equal(options.projectId, local.projectId);
    assert.equal(options.storageBucket, `${local.projectId}.appspot.com`);
    assert.equal(name, 'lazone-emulator');
    return appSdk.initializeApp(options, name);
  },
};
const clients = load('backend/main/src/config/firebase.ts', {
  './firebaseEnvironment': environment,
  'firebase/app': appModule,
  'firebase/auth': authSdk,
  'firebase/firestore': firestoreSdk,
  'firebase/storage': storageSdk,
  '@react-native-async-storage/async-storage': {},
});
const { auth, db, storage } = clients;
const authService = load('backend/main/src/services/authService.ts', {
  '../config/firebase': clients, 'firebase/auth': authSdk, 'firebase/firestore': firestoreSdk,
});
const fail = () => { throw new Error('Native push must not be called in simulator mode'); };
const notifications = load('services/notifications/pushNotifications.ts', {
  '@/backend/main/src/config/firebaseEnvironment': environment,
  '@/repositories/notificationRepository': { saveUserNotificationToken: fail, removeUserNotificationToken: fail },
  '@react-native-firebase/messaging': { getMessaging: fail },
  'react-native': { Platform: { OS: 'ios' } },
  '@react-native-async-storage/async-storage': { getItem: async () => null, setItem: async () => {} },
  './topics': load('services/notifications/topics.ts'),
});
const handlers = load('services/notifications/messageHandlers.ts', {
  '@/backend/main/src/config/firebaseEnvironment': environment,
  '@react-native-firebase/messaging': { getMessaging: fail },
  'react-native': {},
});
try {
  const user = await authService.signupUser('Local Requester', `smoke-${Date.now()}@example.test`, 'Local-test-only-123', '');
  const profile = await authService.getUserProfile(user.uid);
  assert.equal(profile.role, 'requester');
  assert.equal(profile.firstName, 'Local');
  assert.equal((await firestoreSdk.getDoc(firestoreSdk.doc(db, 'publicProfiles', user.uid))).exists(), true);
  const file = storageSdk.ref(storage, `users/${user.uid}/simulator-fixture.png`);
  const fixture = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  await storageSdk.uploadBytes(file, fixture, { contentType: 'image/png' });
  assert.equal((await storageSdk.getMetadata(file)).size, fixture.length);
  assert.match(await storageSdk.getDownloadURL(file), /^http:\/\/127\.0\.0\.1:9199\//);
  await storageSdk.deleteObject(file);
  assert.equal(await notifications.requestNotificationPermission(), false);
  await notifications.initializePushNotificationsForUser(user.uid);
  await notifications.cleanupPushNotificationsOnLogout(user.uid);
  await notifications.updateNotificationTopicSetting(user.uid, 'all', false);
  handlers.registerForegroundMessageHandler(() => '/')();
  handlers.registerNotificationOpenHandlers({ push: fail })();
  await authService.logoutUser();
  assert.equal(auth.currentUser, null);
  await authService.loginUser(user.email, 'Local-test-only-123');
  assert.equal(auth.currentUser.uid, user.uid);
  console.log('Simulator Firebase checks passed: fail-closed config, local account and profile, local Storage round trip, no push, logout and sign-in.');
} finally {
  await appSdk.deleteApp(appSdk.getApp('lazone-emulator'));
}
