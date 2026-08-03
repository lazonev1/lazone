import { doc, setDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/backend/main/src/config/firebase';

export async function saveUserNotificationToken(userId: string, token: string): Promise<void> {
  const userDocRef = doc(db, COLLECTIONS.USERS, userId);

  await setDoc(
    userDocRef,
    {
      notificationTokens: arrayUnion(token),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function removeUserNotificationToken(userId: string, token: string): Promise<void> {
  const userDocRef = doc(db, COLLECTIONS.USERS, userId);

  await updateDoc(userDocRef, {
    notificationTokens: arrayRemove(token),
    updatedAt: serverTimestamp(),
  });
}
