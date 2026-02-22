import { useState, useEffect, useCallback } from 'react';
import { BookingViewModel, CreateBookingInput, UpdateBookingInput } from '@/types/booking';
import * as bookingRepo from '@/repositories/bookingRepository';

/**
 * Hook for the "My Bookings" list screen.
 * Fetches all bookings for the current user and provides create/cancel mutations.
 */

export interface UseBookingsResult {
  bookings: BookingViewModel[];
  isLoading: boolean;
  error: Error | null;
  createBooking: (
    requesterName: string,
    input: CreateBookingInput
  ) => Promise<BookingViewModel>;
  cancelBooking: (bookingId: string) => Promise<void>;
  refreshBookings: () => Promise<void>;
}

export function useBookings(userId?: string): UseBookingsResult {
  const [bookings, setBookings] = useState<BookingViewModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBookings = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await bookingRepo.getUserBookings(userId);
      setBookings(data);
    } catch (err) {
      console.error('[useBookings] Error fetching bookings:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch bookings'));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const createBooking = useCallback(
    async (requesterName: string, input: CreateBookingInput): Promise<BookingViewModel> => {
      if (!userId) throw new Error('User must be signed in to book');

      setError(null);

      try {
        const newBooking = await bookingRepo.createBooking(userId, requesterName, input);
        console.log('[useBookings] Booking created:', newBooking.id);

        // Add to local state (most recent first)
        setBookings((prev) => [newBooking, ...prev]);
        return newBooking;
      } catch (err) {
        console.error('[useBookings] Error creating booking:', err);
        const error = err instanceof Error ? err : new Error('Failed to create booking');
        setError(error);
        throw error;
      }
    },
    [userId]
  );

  const cancelBooking = useCallback(
    async (bookingId: string): Promise<void> => {
      const previous = [...bookings];

      // Optimistic update
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' as const } : b))
      );

      try {
        await bookingRepo.cancelBooking(bookingId);
        console.log('[useBookings] Booking cancelled:', bookingId);
      } catch (err) {
        console.error('[useBookings] Error cancelling booking:', err);
        // Rollback
        setBookings(previous);
        const error = err instanceof Error ? err : new Error('Failed to cancel booking');
        setError(error);
        throw error;
      }
    },
    [bookings]
  );

  const refreshBookings = useCallback(async () => {
    await fetchBookings();
  }, [fetchBookings]);

  return {
    bookings,
    isLoading,
    error,
    createBooking,
    cancelBooking,
    refreshBookings,
  };
}

/**
 * Hook for a single booking detail / edit screen.
 * Fetches one booking and provides cancel/update mutations.
 */

export interface UseBookingDetailResult {
  booking: BookingViewModel | null;
  isLoading: boolean;
  error: Error | null;
  cancelBooking: () => Promise<void>;
  updateBooking: (input: UpdateBookingInput) => Promise<BookingViewModel>;
  refreshBooking: () => Promise<void>;
}

export function useBookingDetail(bookingId?: string): UseBookingDetailResult {
  const [booking, setBooking] = useState<BookingViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBooking = useCallback(async () => {
    if (!bookingId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await bookingRepo.getBookingDetail(bookingId);
      setBooking(data);
    } catch (err) {
      console.error('[useBookingDetail] Error fetching booking:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch booking'));
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const cancelBooking = useCallback(async (): Promise<void> => {
    if (!bookingId || !booking) throw new Error('No booking loaded');

    const previous = { ...booking };

    // Optimistic update
    setBooking({ ...booking, status: 'cancelled' });

    try {
      await bookingRepo.cancelBooking(bookingId);
      console.log('[useBookingDetail] Booking cancelled');
    } catch (err) {
      console.error('[useBookingDetail] Error cancelling booking:', err);
      setBooking(previous); // Rollback
      const error = err instanceof Error ? err : new Error('Failed to cancel booking');
      setError(error);
      throw error;
    }
  }, [bookingId, booking]);

  const updateBooking = useCallback(
    async (input: UpdateBookingInput): Promise<BookingViewModel> => {
      if (!bookingId) throw new Error('No booking loaded');

      try {
        const updated = await bookingRepo.updateBooking(bookingId, input);
        setBooking(updated);
        console.log('[useBookingDetail] Booking updated');
        return updated;
      } catch (err) {
        console.error('[useBookingDetail] Error updating booking:', err);
        const error = err instanceof Error ? err : new Error('Failed to update booking');
        setError(error);
        throw error;
      }
    },
    [bookingId]
  );

  const refreshBooking = useCallback(async () => {
    await fetchBooking();
  }, [fetchBooking]);

  return {
    booking,
    isLoading,
    error,
    cancelBooking,
    updateBooking,
    refreshBooking,
  };
}
