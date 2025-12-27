import { DocumentReference } from "firebase/firestore";
import { User } from "./User";

export interface Provider extends User {
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
}
