import { doc, getDoc } from 'firebase/firestore';
import { COLLECTIONS, db } from '../config/firebase';
import type { PublicProfile } from '../models/PublicProfile';

/** The only cross-account identity data that the client may read. */
export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  const snapshot = await getDoc(doc(db, COLLECTIONS.PUBLIC_PROFILES, userId));
  return snapshot.exists() ? snapshot.data() as PublicProfile : null;
}
