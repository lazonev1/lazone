import {
  BookingStatusEvent,
  BookingViewModel,
  CreateBookingInput,
  UpdateBookingInput,
  BookingChecklistItem,
} from '@/types/booking';
import * as BookingService from '@/backend/main/src/services/bookingService';
import type {
  BookingDocument,
  BookingStatusEventDocument,
} from '@/backend/main/src/services/bookingService';

/**
 * Booking Repository
 *
 * Transforms Firestore BookingDocuments into UI-ready BookingViewModels.
 * Thin layer since provider/service names are denormalized on the document.
 */

// ========== Transform ==========

function toStatusEventViewModel(event: BookingStatusEventDocument): BookingStatusEvent {
  return {
    id: event._id,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    actorId: event.actorId,
    actorRole: event.actorRole,
    occurredAt: event.occurredAt?.toDate?.().toISOString() ?? new Date().toISOString(),
  };
}

function toViewModel(
  doc: BookingDocument,
  statusHistory: BookingStatusEvent[] = [],
  timelineUnavailable = false
): BookingViewModel {
  const bookingDate = doc.bookingDate?.toDate?.() ?? new Date();
  const createdAt = doc.createdAt?.toDate?.() ?? new Date();
  const updatedAt = doc.updatedAt?.toDate?.() ?? null;
  const checklist = doc.checklist ?? [];
  const checklistProgress = doc.checklistProgress ?? {};
  const resolvedChecklist = checklist.map((item) => ({
    ...item,
    completed: checklistProgress[item.id] ?? item.completed,
  }));

  return {
    id: doc._id,
    requesterId: doc.requesterId,
    requesterName: doc.requesterName,
    providerId: doc.providerId,
    providerName: doc.providerName,
    serviceId: doc.serviceId,
    serviceName: doc.serviceName,
    bookingDate: bookingDate.toISOString(),
    price: doc.price,
    notes: doc.notes ?? undefined,
    status: doc.status,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt?.toISOString(),
    statusHistory,
    timelineUnavailable,
    checklist: resolvedChecklist,
    // Derive progress from the item data rather than trusting a client-written counter.
    checklistTotal: resolvedChecklist.length,
    checklistCompletedCount: resolvedChecklist.filter((item) => item.completed).length,
    requesterChangeRequest: doc.requesterChangeRequest,
  };
}

// ========== Read ==========

export async function getUserBookings(userId: string): Promise<BookingViewModel[]> {
  console.log('[BookingRepository] Fetching bookings for user:', userId);

  const docs = await BookingService.getBookingsByRequesterId(userId);
  return docs.map((doc) => toViewModel(doc));
}

export async function getBookingDetail(bookingId: string): Promise<BookingViewModel | null> {
  console.log('[BookingRepository] Fetching booking detail:', bookingId);

  const doc = await BookingService.getBookingById(bookingId);
  if (!doc) return null;

  try {
    const events = await BookingService.getBookingStatusEvents(bookingId);
    return toViewModel(doc, events.map(toStatusEventViewModel));
  } catch (error) {
    // Keep the booking usable if the optional audit subcollection is temporarily
    // unavailable. The detail screen clearly labels the fallback state.
    console.warn('[BookingRepository] Timeline unavailable:', error);
    return toViewModel(doc, [], true);
  }
}

// ========== Write ==========

export async function createBooking(
  userId: string,
  requesterName: string,
  input: CreateBookingInput
): Promise<BookingViewModel> {
  console.log('[BookingRepository] Creating booking...');

  const bookingId = await BookingService.createBooking({
    requesterId: userId,
    requesterName,
    providerId: input.providerId,
    providerName: input.providerName,
    serviceId: input.serviceId,
    serviceName: input.serviceName,
    bookingDate: input.bookingDate,
    price: input.price,
    notes: input.notes,
    checklist: input.checklist,
  });

  // Fetch the created document to get server timestamps
  const created = await BookingService.getBookingById(bookingId);
  if (!created) {
    throw new Error('Booking was created but could not be retrieved');
  }

  console.log('[BookingRepository] Booking created successfully');
  return toViewModel(created);
}

export async function updateBooking(
  bookingId: string,
  input: UpdateBookingInput
): Promise<BookingViewModel> {
  console.log('[BookingRepository] Updating booking:', bookingId);

  await BookingService.updateBooking(bookingId, {
    serviceId: input.serviceId,
    serviceName: input.serviceName,
    bookingDate: input.bookingDate,
    price: input.price,
    notes: input.notes,
    checklist: input.checklist,
  });

  // Fetch updated document
  const updated = await BookingService.getBookingById(bookingId);
  if (!updated) {
    throw new Error('Booking was updated but could not be retrieved');
  }

  console.log('[BookingRepository] Booking updated successfully');
  return toViewModel(updated);
}

export async function updateBookingChecklist(bookingId: string, checklist: BookingChecklistItem[]): Promise<void> {
  await BookingService.updateBookingChecklist(bookingId, checklist);
}

export async function submitBookingForConfirmation(bookingId: string): Promise<void> {
  await BookingService.updateBookingStatus(bookingId, 'awaiting_confirmation');
}

export async function confirmBookingCompletion(bookingId: string): Promise<void> {
  await BookingService.updateBookingStatus(bookingId, 'completed');
}

export async function requestBookingChanges(bookingId: string, reason: string): Promise<void> {
  await BookingService.updateBookingStatus(bookingId, 'in_progress', { changeRequest: reason });
}

export async function cancelBooking(bookingId: string): Promise<void> {
  console.log('[BookingRepository] Cancelling booking:', bookingId);
  await BookingService.updateBookingStatus(bookingId, 'cancelled');
  console.log('[BookingRepository] Booking cancelled successfully');
}

// ========== Provider-side Read ==========

export async function getProviderBookings(providerId: string): Promise<BookingViewModel[]> {
  console.log('[BookingRepository] Fetching bookings for provider:', providerId);

  const docs = await BookingService.getBookingsByProviderId(providerId);
  return docs.map((doc) => toViewModel(doc));
}

// ========== Provider-side Status Mutations ==========

export async function confirmBooking(bookingId: string): Promise<void> {
  console.log('[BookingRepository] Confirming booking:', bookingId);
  await BookingService.updateBookingStatus(bookingId, 'confirmed');
  console.log('[BookingRepository] Booking confirmed successfully');
}

export async function declineBooking(bookingId: string): Promise<void> {
  console.log('[BookingRepository] Declining booking:', bookingId);
  await BookingService.updateBookingStatus(bookingId, 'cancelled');
  console.log('[BookingRepository] Booking declined successfully');
}

export async function startBooking(bookingId: string): Promise<void> {
  console.log('[BookingRepository] Starting booking:', bookingId);
  await BookingService.updateBookingStatus(bookingId, 'in_progress');
  console.log('[BookingRepository] Booking marked in progress successfully');
}

export async function completeBooking(bookingId: string): Promise<void> {
  // Backwards-compatible name: providers submit delivery for requester review;
  // only the requester can perform the final completion transition.
  await submitBookingForConfirmation(bookingId);
}
