import { Timestamp } from "firebase/firestore";
import { Location } from "./Location";

export interface User {
  _id: string; // Firestore document ID
  phoneNumber: string;
  firstName: string;
  lastName: string;
  dob: Timestamp;
  role: "requester" | "provider" | "both";
  avatar?: string;
  verified: boolean;
  subscriptionType: "free" | "premium" | "enterprise";
  bookmarked: string[]; // Provider IDs the user has saved
  location?: Location;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
