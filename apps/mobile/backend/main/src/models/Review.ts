import { Timestamp } from 'firebase/firestore';

export interface ReviewResponse {
  text: string;
  /** @deprecated Legacy response timestamp; new writes use responseUpdatedAt. */
  date?: Timestamp;
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
  responseUpdatedAt?: Timestamp | null;
  isHelpful: number; // Count of helpful votes
  /** @deprecated Legacy voter IDs. New votes are private helpfulVotes documents. */
  helpfulBy?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
