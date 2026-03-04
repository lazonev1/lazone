import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../config/firebase';
import { BookingStatus } from '@/types/booking';

/**
 * Booking Service — Firebase Firestore Operations
 *
 * Handles all booking-related database operations.
 * Stores plain string IDs (not DocumentReferences) for simplicity,
 * following the same approach used by reviewService.
 *
 * Provider/service names are denormalized onto the document
 * so list screens don't need extra reads.
 */

// ========== Firestore document shape ==========

export interface BookingDocument {
  _id: string;
  requesterId: string;
  requesterName: string;
  providerId: string;
  providerName: string;
  serviceId: string;
  serviceName: string;
  bookingDate: Timestamp;
  price: number;
  notes: string | null;
  status: BookingStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ========== CREATE ==========

export async function createBooking(data: {
  requesterId: string;
  requesterName: string;
  providerId: string;
  providerName: string;
  serviceId: string;
  serviceName: string;
  bookingDate: Date;
  price: number;
  notes?: string;
}): Promise<string> {
  console.log('[BookingService] Creating booking for provider:', data.providerId);

  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.BOOKINGS), {
      requesterId: data.requesterId,
      requesterName: data.requesterName,
      providerId: data.providerId,
      providerName: data.providerName,
      serviceId: data.serviceId,
      serviceName: data.serviceName,
      bookingDate: Timestamp.fromDate(data.bookingDate),
      price: data.price,
      notes: data.notes || null,
      status: 'pending' as BookingStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log('[BookingService] Booking created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('[BookingService] Error creating booking:', error);
    throw error;
  }
}

// ========== READ ==========

export async function getBookingById(bookingId: string): Promise<BookingDocument | null> {
  console.log('[BookingService] Fetching booking:', bookingId);

  try {
    const docSnap = await getDoc(doc(db, COLLECTIONS.BOOKINGS, bookingId));

    if (!docSnap.exists()) {
      console.warn('[BookingService] Booking not found:', bookingId);
      return null;
    }

    return { _id: docSnap.id, ...docSnap.data() } as BookingDocument;
  } catch (error) {
    console.error('[BookingService] Error fetching booking:', error);
    throw error;
  }
}

export async function getBookingsByRequesterId(userId: string): Promise<BookingDocument[]> {
  console.log('[BookingService] Fetching bookings for requester:', userId);

  try {
    const q = query(
      collection(db, COLLECTIONS.BOOKINGS),
      where('requesterId', '==', userId)
    );

    const snapshot = await getDocs(q);
    const bookings = snapshot.docs
      .map((d) => ({ _id: d.id, ...d.data() }) as BookingDocument)
      // Sort client-side (most recent first) to avoid requiring a composite index
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() ?? 0;
        const bTime = b.createdAt?.toMillis?.() ?? 0;
        return bTime - aTime;
      });

    console.log(`[BookingService] Found ${bookings.length} bookings for requester`);
    return bookings;
  } catch (error) {
    console.error('[BookingService] Error fetching requester bookings:', error);
    throw error;
  }
}

export async function getBookingsByProviderId(providerId: string): Promise<BookingDocument[]> {
  console.log('[BookingService] Fetching bookings for provider:', providerId);

  try {
    const q = query(
      collection(db, COLLECTIONS.BOOKINGS),
      where('providerId', '==', providerId)
    );

    const snapshot = await getDocs(q);
    const bookings = snapshot.docs
      .map((d) => ({ _id: d.id, ...d.data() }) as BookingDocument)
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() ?? 0;
        const bTime = b.createdAt?.toMillis?.() ?? 0;
        return bTime - aTime;
      });

    console.log(`[BookingService] Found ${bookings.length} bookings for provider`);
    return bookings;
  } catch (error) {
    console.error('[BookingService] Error fetching provider bookings:', error);
    throw error;
  }
}

// ========== UPDATE ==========

export async function updateBooking(
  bookingId: string,
  updates: {
    serviceId?: string;
    serviceName?: string;
    bookingDate?: Date;
    price?: number;
    notes?: string;
  }
): Promise<void> {
  console.log('[BookingService] Updating booking:', bookingId);

  try {
    // Verify booking exists and is pending
    const existing = await getBookingById(bookingId);
    if (!existing) {
      throw new Error('Booking not found');
    }
    if (existing.status !== 'pending') {
      throw new Error('Only pending bookings can be edited');
    }

    // Build the update payload — only include fields that were provided
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (updates.serviceId !== undefined) payload.serviceId = updates.serviceId;
    if (updates.serviceName !== undefined) payload.serviceName = updates.serviceName;
    if (updates.bookingDate !== undefined) payload.bookingDate = Timestamp.fromDate(updates.bookingDate);
    if (updates.price !== undefined) payload.price = updates.price;
    if (updates.notes !== undefined) payload.notes = updates.notes || null;

    await updateDoc(doc(db, COLLECTIONS.BOOKINGS, bookingId), payload);

    console.log('[BookingService] Booking updated successfully');
  } catch (error) {
    console.error('[BookingService] Error updating booking:', error);
    throw error;
  }
}

export async function updateBookingStatus(
  bookingId: string,
  newStatus: BookingStatus
): Promise<void> {
  console.log(`[BookingService] Updating booking ${bookingId} status to: ${newStatus}`);

  try {
    const existing = await getBookingById(bookingId);
    if (!existing) {
      throw new Error('Booking not found');
    }

    // Validate status transitions
    const validTransitions: Record<BookingStatus, BookingStatus[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
      completed: [], // Terminal state
      cancelled: [], // Terminal state
    };

    const allowed = validTransitions[existing.status];
    if (!allowed.includes(newStatus)) {
      throw new Error(
        `Cannot transition from "${existing.status}" to "${newStatus}"`
      );
    }

    await updateDoc(doc(db, COLLECTIONS.BOOKINGS, bookingId), {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });

    console.log('[BookingService] Booking status updated successfully');
  } catch (error) {
    console.error('[BookingService] Error updating booking status:', error);
    throw error;
  }
}

// ========== QUERY HELPERS ==========

/**
 * Check if a user has at least one completed booking with a provider.
 * Used by the review system to gate review eligibility.
 */
export async function hasCompletedBookingWithProvider(
  userId: string,
  providerId: string
): Promise<boolean> {
  console.log(`[BookingService] Checking completed bookings: user=${userId}, provider=${providerId}`);

  try {
    const q = query(
      collection(db, COLLECTIONS.BOOKINGS),
      where('requesterId', '==', userId),
      where('providerId', '==', providerId),
      where('status', '==', 'completed')
    );

    const snapshot = await getDocs(q);
    const hasCompleted = !snapshot.empty;

    console.log(`[BookingService] Has completed booking: ${hasCompleted}`);
    return hasCompleted;
  } catch (error) {
    console.error('[BookingService] Error checking completed bookings:', error);
    throw error;
  }
}

