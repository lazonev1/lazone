import { Timestamp, DocumentReference } from 'firebase/firestore';

export interface Location {
  formattedAddress: string;
  country: string;
  city: string;
  coordinates: {
    longitude: number;
    latitude: number;
  };
}

export interface User {
  userId: string; // Firestore document ID
  phoneNumber: string;
  firstName: string;
  lastName: string;
  dob: Timestamp;
  role: 'requester' | 'provider' | 'both';
  avatar?: string;
  verified: boolean;
  subscriptionType: 'free' | 'premium' | 'enterprise';
  bookmarked: DocumentReference[]; // References to other User documents
  location?: Location;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
