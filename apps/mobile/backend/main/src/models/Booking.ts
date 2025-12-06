import { Timestamp, DocumentReference } from 'firebase/firestore';

export type BookingStatus =
  | 'pending'
  | 'quoted'
  | 'accepted'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface BookingTimelineEntry {
  status: BookingStatus;
  timestamp: Timestamp;
  userId: string; // User who made the update
}

export interface Payment {
  status: 'pending' | 'partial' | 'paid' | 'refunded' | 'failed';
  method: string;
  amount: number;
}

export interface Booking {
  id: string; // Firestore document ID
  requesterId: DocumentReference; // Ref to User
  providerId: DocumentReference; // Ref to Provider
  serviceId: DocumentReference; // Ref to Service
  status: BookingStatus;
  scheduledDate: Timestamp;
  time: Timestamp; // Preferred time
  price: number; // Final agreed price
  description: string;
  bookingTimeline: BookingTimelineEntry[];
  payment: Payment;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
}
