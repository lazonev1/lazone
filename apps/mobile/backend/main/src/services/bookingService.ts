import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  runTransaction,
  updateDoc,
  serverTimestamp,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { auth, db, COLLECTIONS } from '../config/firebase';
import { BookingChecklistItem, BookingStatus } from '@/types/booking';

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
  latestTransitionId?: string;
  checklist: BookingChecklistItem[];
  checklistTotal: number;
  checklistCompletedCount: number;
  checklistProgress?: Record<string, boolean>;
  requesterChangeRequest?: string;
}

export interface BookingStatusEventDocument {
  _id: string;
  fromStatus: BookingStatus;
  toStatus: BookingStatus;
  actorId: string;
  actorRole: 'requester' | 'provider';
  occurredAt: Timestamp;
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
  checklist: BookingChecklistItem[];
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
      checklist: data.checklist,
      checklistTotal: data.checklist.length,
      checklistCompletedCount: 0,
      checklistProgress: Object.fromEntries(data.checklist.map((item) => [item.id, false])),
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

export async function getBookingStatusEvents(
  bookingId: string
): Promise<BookingStatusEventDocument[]> {
  const eventsQuery = query(
    collection(db, COLLECTIONS.BOOKINGS, bookingId, 'events'),
    orderBy('occurredAt', 'asc')
  );
  const snapshot = await getDocs(eventsQuery);
  return snapshot.docs.map(
    (event) => ({ _id: event.id, ...event.data() }) as BookingStatusEventDocument
  );
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
    checklist?: BookingChecklistItem[];
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
    if (updates.checklist !== undefined) {
      payload.checklist = updates.checklist;
      payload.checklistTotal = updates.checklist.length;
      payload.checklistCompletedCount = 0;
      payload.checklistProgress = Object.fromEntries(updates.checklist.map((item) => [item.id, false]));
    }

    await updateDoc(doc(db, COLLECTIONS.BOOKINGS, bookingId), payload);

    console.log('[BookingService] Booking updated successfully');
  } catch (error) {
    console.error('[BookingService] Error updating booking:', error);
    throw error;
  }
}

export async function updateBookingStatus(
  bookingId: string,
  newStatus: BookingStatus,
  details?: { changeRequest?: string }
): Promise<void> {
  console.log(`[BookingService] Updating booking ${bookingId} status to: ${newStatus}`);

  try {
    const actorId = auth.currentUser?.uid;
    if (!actorId) {
      throw new Error('You must be signed in to update a booking status');
    }
    const bookingRef = doc(db, COLLECTIONS.BOOKINGS, bookingId);
    const eventRef = doc(collection(db, COLLECTIONS.BOOKINGS, bookingId, 'events'));
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(bookingRef);
      if (!snapshot.exists()) throw new Error('Booking not found');
      const existing = { _id: snapshot.id, ...snapshot.data() } as BookingDocument;

      const validTransitions: Record<BookingStatus, BookingStatus[]> = {
        pending: ['confirmed', 'cancelled'],
        confirmed: ['in_progress', 'cancelled'],
        in_progress: ['awaiting_confirmation'],
        awaiting_confirmation: ['completed', 'in_progress'],
        completed: [],
        cancelled: [],
      };
      if (!validTransitions[existing.status].includes(newStatus)) {
        throw new Error(`Cannot transition from "${existing.status}" to "${newStatus}"`);
      }

      const actorRole = actorId === existing.providerId
        ? 'provider'
        : actorId === existing.requesterId
          ? 'requester'
          : null;
      if (!actorRole) throw new Error('Only booking participants can update the booking status');
      if (newStatus === 'awaiting_confirmation' && actorRole !== 'provider') {
        throw new Error('Only the provider can submit work for confirmation');
      }
      if (newStatus === 'completed' && actorRole !== 'requester') {
        throw new Error('Only the requester can confirm completed work');
      }
      if (newStatus === 'in_progress' && existing.status === 'awaiting_confirmation' && actorRole !== 'requester') {
        throw new Error('Only the requester can request changes');
      }

      const bookingUpdate: Record<string, unknown> = {
        status: newStatus,
        updatedAt: serverTimestamp(),
        latestTransitionId: eventRef.id,
      };
      if (newStatus === 'in_progress' && existing.status === 'awaiting_confirmation') {
        bookingUpdate.requesterChangeRequest = details?.changeRequest?.trim() || 'Requester requested changes before accepting completion.';
      }
      if (newStatus === 'awaiting_confirmation') bookingUpdate.requesterChangeRequest = null;

      transaction.update(bookingRef, bookingUpdate);
      transaction.set(eventRef, {
        fromStatus: existing.status,
        toStatus: newStatus,
        actorId,
        actorRole,
        occurredAt: serverTimestamp(),
      });
    });

    console.log('[BookingService] Booking status updated successfully');
  } catch (error) {
    console.error('[BookingService] Error updating booking status:', error);
    throw error;
  }
}

export async function updateBookingChecklist(
  bookingId: string,
  checklist: BookingChecklistItem[]
): Promise<void> {
  const existing = await getBookingById(bookingId);
  const actorId = auth.currentUser?.uid;
  if (!existing || !actorId || actorId !== existing.providerId) throw new Error('Only the provider can update the checklist');
  if (existing.status !== 'in_progress') throw new Error('Checklist can only be updated while work is in progress');
  if (checklist.length !== existing.checklistTotal || checklist.some((item) => !item.description.trim())) {
    throw new Error('Checklist items cannot be removed or left blank during service');
  }
  const checklistDefinitionChanged = checklist.some((item, index) => {
    const original = existing.checklist[index];
    return !original || item.id !== original.id || item.description.trim() !== original.description.trim();
  });
  if (checklistDefinitionChanged) {
    throw new Error('The requester checklist cannot be changed during service');
  }
  await updateDoc(doc(db, COLLECTIONS.BOOKINGS, bookingId), {
    checklistProgress: Object.fromEntries(checklist.map((item) => [item.id, item.completed])),
    checklistCompletedCount: checklist.filter((item) => item.completed).length,
    updatedAt: serverTimestamp(),
  });
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
