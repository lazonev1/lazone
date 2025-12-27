import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { auth, db, COLLECTIONS } from "../config/firebase";
import { User } from "../models/User";

/**
 * Creates a new user account
 */
export async function signupUser(
  fullName: string,
  email: string,
  password: string,
  phoneNumber: string
) {
  // 1. Create user in Firebase Auth
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
  const firebaseUser = userCredential.user;

  // 2. Prepare user data for Firestore
  const [firstName, ...lastNameParts] = fullName.split(" ");
  const lastName = lastNameParts.join(" ");

  const newUser: Omit<User, "_id" | "dob" | "createdAt" | "updatedAt"> = {
    firstName: firstName || "",
    lastName: lastName || "",
    phoneNumber: phoneNumber || "",
    role: "requester",
    verified: false,
    subscriptionType: "free",
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

  // 4. Fetch the created user profile
  const profile = await getUserProfile(firebaseUser.uid);

  // 5. Return both the auth user and the profile data
  return { firebaseUser, profile };
}

/**
 * Logs in an existing user
 */
export async function loginUser(email: string, password: string): Promise<FirebaseUser> {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
  return userCredential.user;
}

/**
 * Logs out the current user
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Gets user profile from Firestore
 */
export async function getUserProfile(userId: string): Promise<User | null> {
  const userDocRef = doc(db, COLLECTIONS.USERS, userId);
  const userDoc = await getDoc(userDocRef);
  if (userDoc.exists()) {
    const data = userDoc.data();
    return {
      _id: userDoc.id,
      ...data,
      dob: data.dob as Timestamp,
      createdAt: data.createdAt as Timestamp,
      updatedAt: data.updatedAt as Timestamp,
    } as User;
  }
  return null;
}
