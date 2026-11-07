import { useState, useEffect, useCallback, useMemo } from 'react';
import { BookingChecklistItem, BookingViewModel, CreateBookingInput, UpdateBookingInput } from '@/types/booking';
import * as bookingRepo from '@/repositories/bookingRepository';
import { useAuth } from '@/contexts/auth';
import i18n from '@/localization';

type Subscribe<T> = (id: string, next: (value: T) => void, fail: (error: Error) => void) => () => void;

/** Shared lifecycle: hide another identity's data immediately, retain same-key
 * content on retry, and actually restart listeners after terminal errors. */
function useBookingSubscription<T>(
  key: string | undefined,
  id: string | undefined,
  subscribe: Subscribe<T>,
  empty: T,
) {
  const [retryVersion, setRetryVersion] = useState(0);
  const [state, setState] = useState<{
    key?: string; data: T; ready: boolean; refreshing: boolean; error: Error | null;
  }>({ key, data: empty, ready: false, refreshing: false, error: null });

  useEffect(() => {
    if (!key || !id) return;
    let active = true;
    setState(previous => ({
      key,
      data: previous.key === key ? previous.data : empty,
      ready: previous.key === key && previous.ready,
      refreshing: previous.key === key && previous.ready,
      error: null,
    }));
    const unsubscribe = subscribe(id, data => {
      if (active) setState({ key, data, ready: true, refreshing: false, error: null });
    }, error => {
      if (!active) return;
      setState(previous => ({
        key,
        data: error.name === 'FirebaseError' && 'code' in error && error.code === 'permission-denied'
          ? empty : previous.key === key ? previous.data : empty,
        ready: true,
        refreshing: false,
        error,
      }));
    });
    return () => { active = false; unsubscribe(); };
  }, [empty, id, key, retryVersion, subscribe]);

  const refresh = useCallback(async () => { setRetryVersion(value => value + 1); }, []);
  const current = Boolean(key) && state.key === key;
  return {
    data: current ? state.data : empty,
    isLoading: Boolean(key) && (!current || !state.ready),
    isRefreshing: current && state.refreshing,
    error: current ? state.error : null,
    refresh,
  };
}

const EMPTY_BOOKINGS: BookingViewModel[] = [];

export interface UseBookingsResult {
  bookings: BookingViewModel[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  createBooking: (requesterName: string, input: CreateBookingInput) => Promise<BookingViewModel>;
  cancelBooking: (bookingId: string) => Promise<void>;
  refreshBookings: () => Promise<void>;
}

export function useBookings(userId?: string): UseBookingsResult {
  const { user } = useAuth();
  const ownerId = user?.uid === userId ? userId : undefined;
  const resource = useBookingSubscription(ownerId, ownerId, bookingRepo.subscribeToUserBookings, EMPTY_BOOKINGS);
  const createBooking = useCallback(async (requesterName: string, input: CreateBookingInput) => {
    if (!ownerId) throw new Error(i18n.t('booking:errors.signInRequired'));
    return bookingRepo.createBooking(ownerId, requesterName, input);
  }, [ownerId]);

  return {
    bookings: resource.data,
    isLoading: resource.isLoading,
    isRefreshing: resource.isRefreshing,
    error: resource.error,
    createBooking,
    cancelBooking: bookingRepo.cancelBooking,
    refreshBookings: resource.refresh,
  };
}

export interface UseBookingDetailResult {
  booking: BookingViewModel | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  cancelBooking: () => Promise<void>;
  updateBooking: (input: UpdateBookingInput) => Promise<BookingViewModel>;
  startBooking: () => Promise<void>;
  completeBooking: () => Promise<void>;
  updateChecklist: (checklist: BookingChecklistItem[]) => Promise<void>;
  submitForConfirmation: () => Promise<void>;
  confirmCompletion: () => Promise<void>;
  requestChanges: (reason: string) => Promise<void>;
  refreshBooking: () => Promise<void>;
}

export function useBookingDetail(bookingId?: string): UseBookingDetailResult {
  const { user } = useAuth();
  const key = user?.uid && bookingId ? `${user.uid}:${bookingId}` : undefined;
  const resource = useBookingSubscription(key, bookingId, bookingRepo.subscribeToBookingDetail, null);
  const requireBookingId = useCallback(() => {
    if (!key || !bookingId) throw new Error(i18n.t('booking:errors.noBookingLoaded'));
    return bookingId;
  }, [bookingId, key]);
  // Firestore transactions authorize/recheck every mutation. Only the live
  // subscription changes displayed data, so failures cannot roll it backward.
  const cancelBooking = useCallback(() => bookingRepo.cancelBooking(requireBookingId()), [requireBookingId]);
  const updateBooking = useCallback((input: UpdateBookingInput) =>
    bookingRepo.updateBooking(requireBookingId(), input), [requireBookingId]);
  const startBooking = useCallback(() => bookingRepo.startBooking(requireBookingId()), [requireBookingId]);
  const submitForConfirmation = useCallback(() =>
    bookingRepo.submitBookingForConfirmation(requireBookingId()), [requireBookingId]);
  const confirmCompletion = useCallback(() =>
    bookingRepo.confirmBookingCompletion(requireBookingId()), [requireBookingId]);
  const requestChanges = useCallback((reason: string) =>
    bookingRepo.requestBookingChanges(requireBookingId(), reason), [requireBookingId]);
  const updateChecklist = useCallback((checklist: BookingChecklistItem[]) =>
    bookingRepo.updateBookingChecklist(requireBookingId(), checklist), [requireBookingId]);

  return {
    booking: resource.data,
    isLoading: resource.isLoading,
    isRefreshing: resource.isRefreshing,
    error: resource.error,
    cancelBooking, updateBooking, startBooking,
    completeBooking: submitForConfirmation,
    submitForConfirmation, confirmCompletion, requestChanges, updateChecklist,
    refreshBooking: resource.refresh,
  };
}

export interface UseProviderBookingsResult {
  allBookings: BookingViewModel[];
  incomingRequests: BookingViewModel[];
  upcomingBookings: BookingViewModel[];
  completedBookings: BookingViewModel[];
  acceptBooking: (bookingId: string) => Promise<void>;
  declineBooking: (bookingId: string) => Promise<void>;
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  refreshBookings: () => Promise<void>;
}

export function useProviderBookings(providerId?: string): UseProviderBookingsResult {
  const { user } = useAuth();
  const ownerId = user?.uid === providerId ? providerId : undefined;
  const resource = useBookingSubscription(ownerId, ownerId, bookingRepo.subscribeToProviderBookings, EMPTY_BOOKINGS);
  const allBookings = resource.data;
  const incomingRequests = useMemo(() => allBookings.filter(booking => booking.status === 'pending'), [allBookings]);
  const upcomingBookings = useMemo(() => allBookings.filter(booking =>
    ['confirmed', 'in_progress', 'awaiting_confirmation'].includes(booking.status)), [allBookings]);
  const completedBookings = useMemo(() => allBookings.filter(booking => booking.status === 'completed'), [allBookings]);
  return {
    allBookings, incomingRequests, upcomingBookings, completedBookings,
    acceptBooking: bookingRepo.confirmBooking,
    declineBooking: bookingRepo.declineBooking,
    isLoading: resource.isLoading,
    isRefreshing: resource.isRefreshing,
    error: resource.error,
    refreshBookings: resource.refresh,
  };
}
