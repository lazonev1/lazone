import { DocumentReference } from "firebase/firestore";

/**
 * Public business document, added to an existing User account at the same uid.
 * The account keeps bookmarks, preferences, and all requester capabilities in
 * users/{uid}; those fields are never duplicated in this public document.
 */
export interface Provider {
  _id: string;
  publicSchemaVersion: 1;
  firstName: string;
  lastName: string;
  avatar?: string;
  location?: {
    country: string;
    city: string;
    coordinates?: { latitude: number; longitude: number };
  };
  businessName: string;
  profession: string;
  categoryName: string; // Display name of the service category
  bio: string; // Provider description/bio
  remoteService: boolean; // Whether provider offers remote services
  reviews: DocumentReference[]; // References to Review documents
  averageRating: number;
  reviewCount: number;
  coverImage?: string;
  portfolio?: DocumentReference; // Reference to a Portfolio document
  pricing?: string; // Price range display (e.g., "50000 - 150000 CFA")
  services: { id: string; name: string; description: string; price: string; availability?: string | null }[];
}
