import { Timestamp, DocumentReference } from "firebase/firestore";

export interface Conversation {
  _id: string; // Firestore document ID
  participants: string[]; // Array of 2 user IDs (plain strings for simple rules & queries)
  participantDetails: {
    // Denormalized data for quick UI rendering without extra fetches
    [userId: string]: {
      name: string;
      avatar?: string;
    };
  };
  lastMessage?: DocumentReference; // Ref to the last Message doc
  lastRead: { [userId: string]: Timestamp }; // Map of userId to their last read timestamp
  typing?: { [userId: string]: boolean }; // To show typing indicators
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
