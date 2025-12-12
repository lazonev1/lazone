import { Timestamp } from 'firebase/firestore';

export interface Service {
  id: string; // Firestore document ID
  userId: string; // Provider's user ID
  name: string;
  description: string;
  price: number; // In smallest currency unit (e.g., cents)
  category: string;
  availability?: string; // Optional: when the service is available (e.g., "Weekdays", "Available anytime")
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
