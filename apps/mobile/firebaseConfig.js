// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// We need Firestore, not just Analytics
import { getFirestore } from "firebase/firestore";
// import { getAnalytics } from "firebase/analytics"; // Optional: Analytics often requires specific native config in RN

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

// Initialize Firestore and export it
export const db = getFirestore(app);

export default app;