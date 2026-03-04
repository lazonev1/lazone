/**
 * Booking Types
 *
 * All types for the booking system.
 * IDs are strings (Firestore document IDs).
 * Statuses align with the backend model.
 */

/** Booking status — matches backend model */
export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

/**
 * What the UI displays — resolved names, formatted ISO strings.
 * This is the output of the repository's transform layer.
 */
export interface BookingViewModel {
  id: string;
  // Requester
  requesterId: string;
  requesterName: string;
  // Provider
  providerId: string;
  providerName: string;
  providerAvatar?: string;
  // Service
  serviceId: string;
  serviceName: string;
  // Details
  bookingDate: string; // ISO string
  price: number;
  notes?: string;
  // Tracking
  status: BookingStatus;
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string
}

/**
 * What the booking form submits to create a new booking.
 * Provider/service names are captured at submission time (denormalized).
 */
export interface CreateBookingInput {
  providerId: string;
  providerName: string;
  serviceId: string;
  serviceName: string;
  bookingDate: Date;
  price: number;
  notes?: string;
}

/**
 * What the edit form submits to update an existing booking.
 * All fields optional — only changed fields need to be sent.
 */
export interface UpdateBookingInput {
  serviceId?: string;
  serviceName?: string;
  bookingDate?: Date;
  price?: number;
  notes?: string;
}
