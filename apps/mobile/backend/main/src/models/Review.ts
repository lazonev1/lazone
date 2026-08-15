import { Timestamp } from 'firebase/firestore';

export interface ReviewResponse {
  text: string;
  date: Timestamp;
}

export interface Review {
  _id: string; // Firestore document ID
  /** Firestore document IDs are stored as strings in the mobile app. */
  bookingId: string;
  providerId: string;
  requesterId: string;
  serviceId: string;
  rating: number; // 1-5
  comment: string;
  images: string[]; // URLs
  responses: ReviewResponse[];
  isHelpful: number; // Count of helpful votes
  helpfulBy: string[]; // User IDs who marked this review as helpful
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
