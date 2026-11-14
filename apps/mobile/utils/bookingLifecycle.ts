import type { BookingStatus } from '../types/booking';

export type BookingActorRole = 'requester' | 'provider';

/** Client-side domain contract, not an authorization boundary. Firestore rules
 * independently enforce the same policy and immutable linked-event writes. */
const TRANSITIONS: Record<BookingActorRole, Record<BookingStatus, readonly BookingStatus[]>> = {
  requester: {
    pending: ['cancelled'],
    confirmed: ['cancelled'],
    in_progress: [],
    awaiting_confirmation: ['completed', 'in_progress'],
    completed: [],
    cancelled: [],
  },
  provider: {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['in_progress'],
    in_progress: ['awaiting_confirmation'],
    awaiting_confirmation: [],
    completed: [],
    cancelled: [],
  },
};

export function canTransitionBooking(from: string, to: string, role: string): boolean {
  if (role !== 'requester' && role !== 'provider') return false;
  if (!Object.prototype.hasOwnProperty.call(TRANSITIONS[role], from)) return false;
  return TRANSITIONS[role][from as BookingStatus].some(status => status === to);
}

export function requireBookingTransition(
  booking: { status: string; requesterId: string; providerId: string },
  actorId: string,
  to: BookingStatus,
): BookingActorRole {
  if (!actorId || !booking.requesterId || !booking.providerId || booking.requesterId === booking.providerId) {
    throw new Error('Booking participant identity is invalid');
  }
  const role = actorId === booking.requesterId ? 'requester'
    : actorId === booking.providerId ? 'provider' : null;
  if (!role) throw new Error('Only booking participants can update the booking status');
  if (!canTransitionBooking(booking.status, to, role)) {
    throw new Error(`The ${role} cannot transition a booking from "${booking.status}" to "${to}"`);
  }
  return role;
}
