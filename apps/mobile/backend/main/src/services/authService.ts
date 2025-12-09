import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db, COLLECTIONS } from '../config/firebase';
import { User } from '../models/User';

export const signupUser = async (fullName: string, email: string, password: string, phoneNumber: string) => {
  // 1. Create user in Firebase Auth
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const firebaseUser = userCredential.user;

  // 2. Prepare user data for Firestore
  const [firstName, ...lastNameParts] = fullName.split(' ');
  const lastName = lastNameParts.join(' ');

  const newUser: Omit<User, 'userId' | 'dob' | 'createdAt' | 'updatedAt'> = {
    firstName: firstName || '',
    lastName: lastName || '',
    phoneNumber: phoneNumber || '',
    role: 'requester',
    verified: false,
    subscriptionType: 'free',
    bookmarked: [],
  };

  // 3. Create user document in Firestore
  const userDocRef = doc(db, COLLECTIONS.USERS, firebaseUser.uid);
  await setDoc(userDocRef, {
    ...newUser,
    dob: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 4. Return both the auth user and the newly created profile data
  return { firebaseUser, profile: { userId: firebaseUser.uid, ...newUser } as User };
};

export const loginUser = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const logoutUser = async () => {
  await signOut(auth);
};

// New function to get user profile from Firestore
export const getUserProfile = async (userId: string): Promise<User | null> => {
  const userDocRef = doc(db, COLLECTIONS.USERS, userId);
  const userDoc = await getDoc(userDocRef);
  if (userDoc.exists()) {
    return { userId: userDoc.id, ...userDoc.data() } as User;
  }
  return null;
};
