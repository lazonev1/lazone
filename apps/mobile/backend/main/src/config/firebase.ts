import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration from firebaseConfig.js
const firebaseConfig = {
  apiKey: "AIzaSyAN1QiM1LLgHC4DjNL6ds3QCIfafmfnBJY",
  authDomain: "lazonev1-5da5a.firebaseapp.com",
  projectId: "lazonev1-5da5a",
  storageBucket: "lazonev1-5da5a.firebasestorage.app",
  messagingSenderId: "732284471327",
  appId: "1:732284471327:web:7d36a6cc3a773089552d2a",
  measurementId: "G-4WZZ86MGC9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Auth with persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Collection names for type-safe queries
export const COLLECTIONS = {
  USERS: 'users',
  PROVIDERS: 'providers',
  PORTFOLIOS: 'portfolios',
  SERVICES: 'services',
  BOOKINGS: 'bookings',
  REVIEWS: 'reviews',
  MESSAGES: 'messages',
  CONVERSATIONS: 'conversations'
} as const;
