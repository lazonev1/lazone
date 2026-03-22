import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';
// Try to initialize React Native auth only when running in RN environment.
// When running Node scripts (seeders, admin tools) we skip RN-specific auth
// to avoid requiring AsyncStorage.
let initializeAuthFunction: any;
let getReactNativePersistenceFunction: any;
let ReactNativeAsyncStorage: any;
try {
  // Use require so imports that don't exist in Node don't throw at module load
  // in environments where React Native modules are unavailable.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const authPkg = require('firebase/auth');
  initializeAuthFunction = authPkg.initializeAuth;
  getReactNativePersistenceFunction = authPkg.getReactNativePersistence;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ReactNativeAsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
// EXPO_PUBLIC_USE_FIRESTORE_EMULATOR should be set in mobile/.env.local to enable Firestore emulator connection for development.
// If not set will default to DEFAULT (live Firestore)
if (process.env.EXPO_PUBLIC_USE_FIRESTORE_EMULATOR === 'true') {
  // Connect to emulator BEFORE any Firestore calls
  // EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST also must be set in mobile/.env.local file 
  // and should point to machine's local IP address, e.g. EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST=192.168.1.126, to be available for both real devices and emulators
  // Using localhost will cause connection issues on real devices and Android emulators, but should work on iOS simulators.
  // Using 10.0.2.2 will work for Android emulators, but not on iOS simulators or real devices.
  let emulatorHost = process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST as string; 
  try {
    connectFirestoreEmulator(db, emulatorHost, 8080);
    console.log('✓ Web SDK connected to Firestore emulator');
  } catch (e: any) {
    // Ignore "already called" errors
    if (!e.message.includes('already called')) {
      console.log('Emulator connection error:', e.message);
    }
  }
}

export const storage = getStorage(app);
// Initialize Auth with React Native persistence only when available
export let auth: any = undefined;
if (initializeAuthFunction && getReactNativePersistenceFunction && ReactNativeAsyncStorage) {
  try {
    auth = initializeAuthFunction(app, {
      persistence: getReactNativePersistenceFunction(ReactNativeAsyncStorage),
    });
  } catch (e) {
    // ignore auth init errors for non-RN environments
    auth = undefined;
  }
}

// Collection names for type-safe queries
export const COLLECTIONS = {
  USERS: 'users',
  PROVIDERS: 'providers',
  PORTFOLIOS: 'portfolios',
  SERVICES: 'services',
  BOOKINGS: 'bookings',
  REVIEWS: 'reviews',
  MESSAGES: 'messages',
  CONVERSATIONS: 'conversations',
  EARNINGS: 'earnings',
  REFERRALS: 'referrals',
} as const;