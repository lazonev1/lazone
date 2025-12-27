import { Timestamp, DocumentReference } from "firebase/firestore";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "in_progress";

export interface Booking {
  _id: string; // Firestore document ID
  requesterId: DocumentReference; // Ref to User
  providerId: DocumentReference; // Ref to Provider
  serviceId: DocumentReference; // Ref to Service
  bookingDate: Timestamp;
  status: BookingStatus;
  notes?: string;
  price: number; // Price at the time of booking
  paymentId?: DocumentReference; // Ref to Payment document
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
