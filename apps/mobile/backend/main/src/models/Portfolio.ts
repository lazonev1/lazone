import { Timestamp, DocumentReference } from 'firebase/firestore';

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  documentUrl: string;
}

export interface PortfolioImage {
  id: string;
  image: string;
  caption: string;
}

export interface Portfolio {
  id: string; // Firestore document ID
  userId: string; // The Provider's user ID
  certifications: Certification[];
  portfolioImages: PortfolioImage[];
  services: DocumentReference[]; // References to Service documents
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
