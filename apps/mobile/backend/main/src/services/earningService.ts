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
  startAfter,
  serverTimestamp,
  Timestamp,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Earning, EarningStatus } from '../models/Earning';

const EARNINGS_COLLECTION = 'earnings';

/**
 * Backend Service Layer — Direct Firestore Operations for Earnings
 * Returns database models with DocumentReference fields.
 * Does NOT transform data for UI consumption.
 */

/**
 * Fetches a single earning document by ID
 */
export async function getEarningById(earningId: string): Promise<Earning | null> {
  try {
    const earningDoc = await getDoc(doc(db, EARNINGS_COLLECTION, earningId));

    if (!earningDoc.exists()) {
      return null;
    }

    return { _id: earningDoc.id, ...earningDoc.data() } as Earning;
  } catch (error) {
    console.error('Error fetching earning:', error);
    throw error;
  }
}

/**
 * Fetches all earnings for a specific provider, ordered by creation date (newest first)
 * Supports cursor-based pagination.
 */
export async function getEarningsByProviderId(
  providerId: string,
  pageLimit: number = 20,
  startAfterDoc?: QueryDocumentSnapshot
): Promise<Earning[]> {
  try {
    let q = query(
      collection(db, EARNINGS_COLLECTION),
      where('providerId', '==', providerId),
      orderBy('createdAt', 'desc'),
      limit(pageLimit)
    );

    if (startAfterDoc) {
      q = query(q, startAfter(startAfterDoc));
    }

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    } as Earning));
  } catch (error) {
    console.error('Error fetching earnings for provider:', error);
    throw error;
  }
}

/**
 * Fetches earnings for a provider filtered by status
 */
export async function getEarningsByStatus(
  providerId: string,
  status: EarningStatus
): Promise<Earning[]> {
  try {
    const q = query(
      collection(db, EARNINGS_COLLECTION),
      where('providerId', '==', providerId),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    } as Earning));
  } catch (error) {
    console.error('Error fetching earnings by status:', error);
    throw error;
  }
}

/**
 * Fetches earnings within a date range (for period summaries)
 */
export async function getEarningsByDateRange(
  providerId: string,
  startDate: Date,
  endDate: Date
): Promise<Earning[]> {
  try {
    const q = query(
      collection(db, EARNINGS_COLLECTION),
      where('providerId', '==', providerId),
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate)),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    } as Earning));
  } catch (error) {
    console.error('Error fetching earnings by date range:', error);
    throw error;
  }
}

/**
 * Creates a new earning record
 */
export async function createEarning(
  earningData: Omit<Earning, '_id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, EARNINGS_COLLECTION), {
      ...earningData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating earning:', error);
    throw error;
  }
}

/**
 * Updates the status of an earning (e.g., pending → completed → paid)
 */
export async function updateEarningStatus(
  earningId: string,
  status: EarningStatus
): Promise<void> {
  try {
    const earningRef = doc(db, EARNINGS_COLLECTION, earningId);

    const updateData: Record<string, any> = {
      status,
      updatedAt: serverTimestamp(),
    };

    // Set paidAt when marking as paid (provider received payout)
    if (status === 'paid') {
      updateData.paidAt = serverTimestamp();
    }

    await updateDoc(earningRef, updateData);
  } catch (error) {
    console.error('Error updating earning status:', error);
    throw error;
  }
}

/**
 * Partially updates an earning document
 */
export async function updateEarning(
  earningId: string,
  updates: Partial<Omit<Earning, '_id' | 'createdAt'>>
): Promise<void> {
  try {
    await updateDoc(doc(db, EARNINGS_COLLECTION, earningId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating earning:', error);
    throw error;
  }
}
