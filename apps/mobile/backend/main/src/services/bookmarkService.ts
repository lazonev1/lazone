import {
  doc,
  getDocFromServer,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from "firebase/firestore";
import { db, COLLECTIONS } from "../config/firebase";

/**
 * Bookmark Service — Firestore operations for user bookmarks
 *
 * Bookmarks are stored as a string[] on the User document: users/{userId}.bookmarked
 * Uses arrayUnion/arrayRemove for atomic, race-condition-free toggles.
 *
 * Why this works well for LaZone:
 *   - A user realistically saves 10-50 providers, not thousands
 *   - No extra metadata needed (just provider IDs)
 *   - One fewer collection/subcollection to manage
 *   - Requesters and providers share the same private User account and bookmarks
 *   - arrayUnion/arrayRemove are atomic — no read-modify-write needed
 */

/**
 * Add a provider to the user's bookmarks.
 * Atomic — arrayUnion won't add duplicates.
 */
export async function addBookmark(userId: string, providerId: string): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  await updateDoc(userRef, {
    bookmarked: arrayUnion(providerId),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Remove a provider from the user's bookmarks.
 * Atomic — arrayRemove is a no-op if the value doesn't exist.
 */
export async function removeBookmark(userId: string, providerId: string): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  await updateDoc(userRef, {
    bookmarked: arrayRemove(providerId),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get all bookmarked provider IDs for a user.
 * Reads the user document and returns the bookmarked array.
 */
export async function getBookmarkedProviderIds(userId: string): Promise<string[]> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  // Only a server-confirmed list can establish an empty state or toggle direction.
  const snap = await getDocFromServer(userRef);

  if (!snap.exists()) {
    throw new Error('Bookmark owner profile is unavailable');
  }

  const bookmarks: unknown = snap.data().bookmarked;
  if (!Array.isArray(bookmarks)) return [];
  return [...new Set(bookmarks.filter((id): id is string =>
    typeof id === 'string' && id.trim().length > 0 && !id.includes('/'),
  ))];
}

