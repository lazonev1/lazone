import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  serverTimestamp,
  getDoc,
  runTransaction,
  Timestamp,
  writeBatch,
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
  const batch = writeBatch(db);
  batch.set(userDocRef, {
    ...newUser,
    dob: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, COLLECTIONS.PUBLIC_PROFILES, firebaseUser.uid), {
    firstName: newUser.firstName,
    lastName: newUser.lastName,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();

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

/**
 * Updates user profile fields in Firestore
 */
export async function updateUserProfile(
  userId: string,
  data: { firstName?: string; lastName?: string; phoneNumber?: string }
): Promise<void> {
  const userDocRef = doc(db, COLLECTIONS.USERS, userId);
  const nameChanged = data.firstName !== undefined || data.lastName !== undefined;
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(userDocRef);
    if (!snapshot.exists()) throw new Error('User profile not found');
    const providerRef = doc(db, COLLECTIONS.PROVIDERS, userId);
    const publicProfileRef = doc(db, COLLECTIONS.PUBLIC_PROFILES, userId);
    const providerSnapshot = nameChanged ? await transaction.get(providerRef) : null;
    const publicProfileSnapshot = nameChanged ? await transaction.get(publicProfileRef) : null;
    const current = snapshot.data();
    transaction.update(userDocRef, { ...data, updatedAt: serverTimestamp() });
    if (nameChanged) {
      const firstName = data.firstName ?? current.firstName ?? '';
      const lastName = data.lastName ?? current.lastName ?? '';
      const currentPublicProfile = publicProfileSnapshot?.data();
      transaction.set(publicProfileRef, {
        firstName,
        lastName,
        ...(currentPublicProfile?.avatar || current.avatar
          ? { avatar: currentPublicProfile?.avatar ?? current.avatar }
          : {}),
        updatedAt: serverTimestamp(),
      });
      if (providerSnapshot?.exists()) {
        transaction.update(providerRef, { firstName, lastName, updatedAt: serverTimestamp() });
      }
    }
  });
}
