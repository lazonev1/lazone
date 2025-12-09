import { Timestamp } from 'firebase/firestore';

export interface Service {
  id: string; // Firestore document ID
  userId: string; // Provider's user ID
  name: string;
  description: string;
  price: number; // In smallest currency unit (e.g., cents)
  category: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
