import { BookingChecklistItem } from '@/types/booking';
import {
  createMaximumBookingDate,
  createMinimumBookingDate,
  isValidCfaAmount,
  MARKETPLACE_LIMITS,
} from '@/constants/Marketplace';

export interface BookingDraft {
  requesterId: string;
  providerId: string;
  requesterName: string;
  providerName: string;
  serviceId: string;
  serviceName: string;
  bookingDate: Date;
  price: number;
  notes?: string;
  checklist: BookingChecklistItem[];
}

export function assertValidBookingDraft(data: BookingDraft): void {
  if (!data.requesterId || !data.providerId || data.requesterId === data.providerId) {
    throw new Error('Choose a different provider for this request.');
  }
  if (!data.requesterName.trim() || !data.providerName.trim()) {
    throw new Error('Booking participants must have a display name.');
  }
  if (!data.serviceId || !data.serviceName.trim()) {
    throw new Error('Choose a published provider service.');
  }
  if (!(data.bookingDate instanceof Date) || Number.isNaN(data.bookingDate.getTime())) {
    throw new Error('Choose a valid booking date.');
  }
  if (data.bookingDate < createMinimumBookingDate() || data.bookingDate > createMaximumBookingDate()) {
    throw new Error('Choose a booking time at least five minutes from now and no more than one year ahead.');
  }
  if (!isValidCfaAmount(data.price)) {
    throw new Error('Enter a positive price within the supported CFA range.');
  }
  if ((data.notes?.length ?? 0) > MARKETPLACE_LIMITS.maxBookingNotesLength) {
    throw new Error('Additional booking details are too long.');
  }
  if (data.checklist.length === 0 || data.checklist.length > MARKETPLACE_LIMITS.maxChecklistItems) {
    throw new Error(`Add between one and ${MARKETPLACE_LIMITS.maxChecklistItems} checklist items.`);
  }
  data.checklist.forEach((item, index) => {
    if (
      item.id !== `item-${index + 1}`
      || !item.description.trim()
      || item.description.length > MARKETPLACE_LIMITS.maxChecklistDescriptionLength
      || item.completed
    ) {
      throw new Error('Each checklist item must be a valid, incomplete requested outcome.');
    }
  });
}
