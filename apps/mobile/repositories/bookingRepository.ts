import { BookingViewModel, CreateBookingInput, UpdateBookingInput } from '@/types/booking';
import * as BookingService from '@/backend/main/src/services/bookingService';
import type { BookingDocument } from '@/backend/main/src/services/bookingService';

/**
 * Booking Repository
 *
 * Transforms Firestore BookingDocuments into UI-ready BookingViewModels.
 * Thin layer since provider/service names are denormalized on the document.
 */

// ========== Transform ==========

function toViewModel(doc: BookingDocument): BookingViewModel {
  const bookingDate = doc.bookingDate?.toDate?.() ?? new Date();
  const createdAt = doc.createdAt?.toDate?.() ?? new Date();
  const updatedAt = doc.updatedAt?.toDate?.() ?? null;

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
  };
}

// ========== Read ==========

export async function getUserBookings(userId: string): Promise<BookingViewModel[]> {
  console.log('[BookingRepository] Fetching bookings for user:', userId);

  const docs = await BookingService.getBookingsByRequesterId(userId);
  return docs.map(toViewModel);
}

export async function getBookingDetail(bookingId: string): Promise<BookingViewModel | null> {
  console.log('[BookingRepository] Fetching booking detail:', bookingId);

  const doc = await BookingService.getBookingById(bookingId);
  if (!doc) return null;
  return toViewModel(doc);
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
  });

  // Fetch updated document
  const updated = await BookingService.getBookingById(bookingId);
  if (!updated) {
    throw new Error('Booking was updated but could not be retrieved');
  }

  console.log('[BookingRepository] Booking updated successfully');
  return toViewModel(updated);
}

export async function cancelBooking(bookingId: string): Promise<void> {
  console.log('[BookingRepository] Cancelling booking:', bookingId);
  await BookingService.updateBookingStatus(bookingId, 'cancelled');
  console.log('[BookingRepository] Booking cancelled successfully');
}

