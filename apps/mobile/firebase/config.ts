import { initializeApp, getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
// import { getFirestore } from '@react-native-firebase/firestore';

// Initialize Firebase if it hasn't been initialized
function getFirebaseApp() {
  try {
    return getApp();
  } catch (e) {
    return initializeApp();
  }
}

// Get the Firebase app instance
const app = getFirebaseApp();

// Export services using the modular API
export const auth = getAuth(app);
// export const firestore = getFirestore(app);

export default app;