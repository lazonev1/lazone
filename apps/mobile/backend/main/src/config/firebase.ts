import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
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

// Initialize services
export const db = getFirestore(app);
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
} as const;
