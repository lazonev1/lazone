import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Referral, ReferralStatus } from '../models/Referral';

const REFERRALS_COLLECTION = 'referrals';

/**
 * Backend Service Layer — Direct Firestore Operations for Referrals
 * Returns database models. Does NOT transform data for UI consumption.
 */

// ── Read operations ──

/**
 * Fetches a single referral document by ID
 */
export async function getReferralById(referralId: string): Promise<Referral | null> {
  try {
    const snap = await getDoc(doc(db, REFERRALS_COLLECTION, referralId));
    if (!snap.exists()) return null;
    return { _id: snap.id, ...snap.data() } as Referral;
  } catch (error) {
    console.error('Error fetching referral:', error);
    throw error;
  }
}

/**
 * Fetches all referrals created by a specific user, newest first
 */
export async function getReferralsByReferrerId(
  referrerId: string,
  pageLimit: number = 50
): Promise<Referral[]> {
  try {
    const q = query(
      collection(db, REFERRALS_COLLECTION),
      where('referrerId', '==', referrerId),
      orderBy('createdAt', 'desc'),
      limit(pageLimit)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ _id: d.id, ...d.data() } as Referral));
  } catch (error) {
    console.error('Error fetching referrals for user:', error);
    throw error;
  }
}

/**
 * Fetches referrals by status for a given referrer
 */
export async function getReferralsByStatus(
  referrerId: string,
  status: ReferralStatus
): Promise<Referral[]> {
  try {
    const q = query(
      collection(db, REFERRALS_COLLECTION),
      where('referrerId', '==', referrerId),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ _id: d.id, ...d.data() } as Referral));
  } catch (error) {
    console.error('Error fetching referrals by status:', error);
    throw error;
  }
}

// ── Write operations ──

/**
 * Creates a new referral record (when user shares an invite)
 */
export async function createReferral(
  referralData: Omit<Referral, '_id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, REFERRALS_COLLECTION), {
      ...referralData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating referral:', error);
    throw error;
  }
}

/**
 * Updates the status of a referral
 */
export async function updateReferralStatus(
  referralId: string,
  status: ReferralStatus,
  additionalData?: Partial<Omit<Referral, '_id' | 'createdAt'>>
): Promise<void> {
  try {
    const ref = doc(db, REFERRALS_COLLECTION, referralId);
    await updateDoc(ref, {
      status,
      ...additionalData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating referral status:', error);
    throw error;
  }
}
