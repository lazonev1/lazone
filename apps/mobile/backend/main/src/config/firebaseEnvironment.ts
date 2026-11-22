export const DEMO_FIREBASE_PROJECT = 'demo-lazone-mobile';

export function resolveFirebaseEmulators(
  enabled: string | undefined,
  host: string | undefined,
  development: boolean,
  legacyEnabled?: string,
  legacyHost?: string,
) {
  if (legacyEnabled === 'true' || legacyHost) {
    throw new Error('The Firestore-only test switch was removed. Use EXPO_PUBLIC_FIREBASE_EMULATORS instead.');
  }
  if ((!enabled || enabled === 'false') && !host) return null;
  if (enabled !== 'true' || !development) {
    throw new Error('Firebase emulator setup requires explicit development mode.');
  }
  if (host !== '127.0.0.1' && host !== '10.0.2.2') {
    throw new Error('Firebase emulators require 127.0.0.1 (iOS Simulator) or 10.0.2.2 (Android Emulator).');
  }
  return { host, projectId: DEMO_FIREBASE_PROJECT, authPort: 9099, firestorePort: 8080, storagePort: 9199 };
}

export const firebaseEmulators = resolveFirebaseEmulators(
  process.env.EXPO_PUBLIC_FIREBASE_EMULATORS,
  process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST,
  typeof __DEV__ !== 'undefined' && __DEV__,
  process.env.EXPO_PUBLIC_USE_FIRESTORE_EMULATOR,
  process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST,
);
