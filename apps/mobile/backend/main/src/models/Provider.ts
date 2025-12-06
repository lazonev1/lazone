import { Timestamp, DocumentReference } from 'firebase/firestore';

export interface Provider {
  userId: string; // Corresponds to a User document ID
  businessName: string;
  profession: string;
  reviews: DocumentReference[]; // References to Review documents
  averageRating: number;
  reviewCount: number;
  coverImage?: string;
  portfolio?: DocumentReference; // Reference to a Portfolio document
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
