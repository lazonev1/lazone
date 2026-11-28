import {
  AuthCredential,
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  linkWithCredential,
  PhoneAuthCredential,
  reauthenticateWithCredential,
  sendEmailVerification,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  unlink,
  updatePhoneNumber,
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
import { LAST_LOGIN_METHOD_CODE } from "./accountAccessErrors";

export type LoginMethod = "phone" | "password";

const PROVIDER_IDS: Record<LoginMethod, string> = {
  phone: "phone",
  password: "password",
};

/**
 * Private and public documents for a new account. Login identities live in
 * Firebase Authentication; `phoneNumber` is kept empty for the existing
 * account schema and is never treated as a credential.
 */
function newAccountDocuments(firstName: string, lastName: string) {
  const account: Omit<User, "_id" | "dob" | "createdAt" | "updatedAt"> = {
    firstName,
    lastName,
    phoneNumber: "",
    role: "requester",
    verified: false,
    subscriptionType: "free",
    bookmarked: [],
  };
  return {
    account: { ...account, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
    publicProfile: { firstName, lastName, updatedAt: serverTimestamp() },
  };
}

function splitFullName(fullName: string) {
  const [firstName, ...lastNameParts] = fullName.trim().split(/\s+/);
  return { firstName: firstName || "", lastName: lastNameParts.join(" ") };
}

/**
 * Creates a new email/password account
 */
export async function signupUser(
  fullName: string,
  email: string,
  password: string
): Promise<FirebaseUser> {
  // 1. Create user in Firebase Auth
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
  const firebaseUser = userCredential.user;

  // 2. Create the private and public profile documents together
  const { firstName, lastName } = splitFullName(fullName);
  const { account, publicProfile } = newAccountDocuments(firstName, lastName);
  const batch = writeBatch(db);
  batch.set(doc(db, COLLECTIONS.USERS, firebaseUser.uid), account);
  batch.set(doc(db, COLLECTIONS.PUBLIC_PROFILES, firebaseUser.uid), publicProfile);
  try {
    await batch.commit();
  } catch (profileWriteError) {
    // Auth and Firestore cannot participate in one atomic transaction. If the
    // required profile write fails, remove the just-created Auth account so a
    // retry does not fail with "email already in use" against an orphan.
    try {
      await deleteUser(firebaseUser);
    } catch (rollbackError) {
      console.error('Failed to roll back incomplete Auth signup:', rollbackError);
      try {
        await signOut(auth);
      } catch (signOutError) {
        console.error('Failed to sign out incomplete Auth signup:', signOutError);
      }
    }
    throw profileWriteError;
  }

  // 3. Ownership confirmation is requested but not required to use the app.
  await requestEmailVerification(firebaseUser);
  return firebaseUser;
}

/**
 * Creates the profile for a signed-in account that has none yet (a new phone
 * account, or an interrupted signup). Returns false if another device already
 * created it, in which case the existing profile is left unchanged.
 */
export async function createUserProfile(
  userId: string,
  firstName: string,
  lastName: string
): Promise<boolean> {
  if (auth.currentUser?.uid !== userId) throw new Error("Cannot create another account's profile");
  const userDocRef = doc(db, COLLECTIONS.USERS, userId);
  const { account, publicProfile } = newAccountDocuments(firstName.trim(), lastName.trim());
  return runTransaction(db, async transaction => {
    if ((await transaction.get(userDocRef)).exists()) return false;
    transaction.set(userDocRef, account);
    transaction.set(doc(db, COLLECTIONS.PUBLIC_PROFILES, userId), publicProfile);
    return true;
  });
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
 * Signs in with a verified SMS code. A new number creates a new Auth account;
 * an existing number always returns its existing account.
 */
export async function loginWithPhone(credential: PhoneAuthCredential): Promise<FirebaseUser> {
  return (await signInWithCredential(auth, credential)).user;
}

function requireCurrentUser(): FirebaseUser {
  const user = auth.currentUser;
  if (!user) throw Object.assign(new Error("No authenticated user"), { code: "auth/requires-recent-login" });
  return user;
}

export function loginMethods(user: FirebaseUser): LoginMethod[] {
  return (Object.keys(PROVIDER_IDS) as LoginMethod[])
    .filter(method => user.providerData.some(info => info.providerId === PROVIDER_IDS[method]));
}

/** Sends the email ownership link. Failure is not fatal; the user can resend. */
export async function requestEmailVerification(user: FirebaseUser = requireCurrentUser()): Promise<boolean> {
  if (!user.email || user.emailVerified) return false;
  try {
    await sendEmailVerification(user);
    return true;
  } catch (error) {
    console.warn("Email verification request failed:", (error as { code?: string }).code);
    return false;
  }
}

/** Adds a verified phone number to the current account (same UID). */
export async function linkPhone(credential: PhoneAuthCredential): Promise<FirebaseUser> {
  const user = (await linkWithCredential(requireCurrentUser(), credential)).user;
  await user.reload();
  return user;
}

/** Adds email/password sign-in to the current account (same UID). */
export async function linkEmailPassword(email: string, password: string): Promise<FirebaseUser> {
  const credential = EmailAuthProvider.credential(email.trim(), password);
  const user = (await linkWithCredential(requireCurrentUser(), credential)).user;
  await requestEmailVerification(user);
  await user.reload();
  return user;
}

/** Replaces the account's phone number with a newly verified one. */
export async function changePhone(credential: PhoneAuthCredential): Promise<FirebaseUser> {
  const user = requireCurrentUser();
  await updatePhoneNumber(user, credential);
  await user.reload();
  return user;
}

/** Confirms the person holding this session before a credential change. */
export async function reauthenticate(credential: AuthCredential): Promise<void> {
  await reauthenticateWithCredential(requireCurrentUser(), credential);
}

export function passwordCredential(password: string): AuthCredential {
  const email = requireCurrentUser().email;
  if (!email) throw Object.assign(new Error("No email login"), { code: "auth/missing-email" });
  return EmailAuthProvider.credential(email, password);
}

/** Removes a login method, refusing to remove the account's last one. */
export async function removeLoginMethod(method: LoginMethod): Promise<FirebaseUser> {
  const user = requireCurrentUser();
  const methods = loginMethods(user);
  if (!methods.includes(method)) return user;
  if (methods.length < 2) {
    throw Object.assign(new Error("Cannot remove the last login method"), { code: LAST_LOGIN_METHOD_CODE });
  }
  const updated = await unlink(user, PROVIDER_IDS[method]);
  await updated.reload();
  return updated;
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
      ...(data.dob instanceof Timestamp ? { dob: data.dob } : {}),
      createdAt: data.createdAt as Timestamp,
      updatedAt: data.updatedAt as Timestamp,
    } as User;
  }
  return null;
}

/**
 * Updates user profile fields in Firestore. Login identities (phone and email)
 * are managed through Firebase Authentication, not this profile.
 */
export async function updateUserProfile(
  userId: string,
  data: { firstName?: string; lastName?: string }
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
