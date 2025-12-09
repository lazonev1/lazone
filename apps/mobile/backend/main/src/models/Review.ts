import { Timestamp, DocumentReference } from 'firebase/firestore';

export interface ReviewResponse {
  text: string;
  date: Timestamp;
}

export interface Review {
  _id: string; // Firestore document ID
  bookingId: DocumentReference; // Unique ref to Booking
  providerId: DocumentReference; // Ref to Provider
  requesterId: DocumentReference; // Ref to User
  serviceId: DocumentReference; // Ref to Service
  rating: number; // 1-5
  comment: string;
  images: string[]; // URLs
  responses: ReviewResponse[];
  isHelpful: number; // Count of helpful votes
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
