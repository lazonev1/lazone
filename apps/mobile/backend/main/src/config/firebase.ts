import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { type Auth, connectAuthEmulator, getAuth } from 'firebase/auth';
import { firebaseEmulators } from './firebaseEnvironment';
// import { Platform } from 'react-native';
// Try to initialize React Native auth only when running in RN environment.
// When running Node scripts (seeders, admin tools) we skip RN-specific auth
// to avoid requiring AsyncStorage.
let initializeAuthFunction: any;
let getReactNativePersistenceFunction: any;
let ReactNativeAsyncStorage: any;
try {
  // Use require so imports that don't exist in Node don't throw at module load
  // in environments where React Native modules are unavailable.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const authPkg = require('firebase/auth');
  initializeAuthFunction = authPkg.initializeAuth;
  getReactNativePersistenceFunction = authPkg.getReactNativePersistence;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ReactNativeAsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {
  // Not running in React Native / AsyncStorage not available — skip RN auth init
}

// Your web app's Firebase configuration from firebaseConfig.js
const firebaseConfig = {
  apiKey: "AIzaSyAN1QiM1LLgHC4DjNL6ds3QCIfafmfnBJY",
  authDomain: "lazonev1-5da5a.firebaseapp.com",
  projectId: "lazonev1-5da5a",
  storageBucket: "lazonev1-5da5a.appspot.com", // Corrected from your file to standard format
  messagingSenderId: "732284471327",
  appId: "1:732284471327:web:7d36a6cc3a773089552d2a",
  measurementId: "G-4WZZ86MGC9"
};

// A separate app isolates the project, bucket, and persisted Auth session.
const app = firebaseEmulators
  ? initializeApp({
      apiKey: 'demo-lazone-local-api-key',
      projectId: firebaseEmulators.projectId,
      authDomain: `${firebaseEmulators.projectId}.firebaseapp.com`,
      storageBucket: `${firebaseEmulators.projectId}.appspot.com`,
    }, 'lazone-emulator')
  : initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const storage = getStorage(app);
// Initialize Auth with React Native persistence only when available
let authInstance: Auth;
if (initializeAuthFunction && getReactNativePersistenceFunction && ReactNativeAsyncStorage) {
  try {
    authInstance = initializeAuthFunction(app, {
      persistence: getReactNativePersistenceFunction(ReactNativeAsyncStorage),
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'auth/already-initialized') {
      authInstance = getAuth(app);
    } else {
      throw error;
    }
  }
} else {
  authInstance = getAuth(app);
}
if (firebaseEmulators) {
  const { host, authPort, firestorePort, storagePort } = firebaseEmulators;
  // Connect before any app service can use these SDKs. Never fall back to live.
  connectAuthEmulator(authInstance, `http://${host}:${authPort}`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, firestorePort);
  connectStorageEmulator(storage, host, storagePort);
}
export const auth = authInstance;

// Collection names for type-safe queries
export const COLLECTIONS = {
  USERS: 'users',
  PUBLIC_PROFILES: 'publicProfiles',
  PROVIDERS: 'providers',
  PORTFOLIOS: 'portfolios',
  SERVICES: 'services',
  BOOKINGS: 'bookings',
  REVIEWS: 'reviews',
  REVIEW_CLAIMS: 'reviewBookingClaims',
  MESSAGES: 'messages',
  CONVERSATIONS: 'conversations',
  EARNINGS: 'earnings',
  REFERRALS: 'referrals',
} as const;
