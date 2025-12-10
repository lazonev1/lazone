import { Timestamp, DocumentReference } from "firebase/firestore";

export interface Conversation {
  _id: string; // Firestore document ID
  participants: DocumentReference[]; // Array of 2 User refs
  participantDetails: {
    // Adding this to denormalize data for quick UI rendering, we don't have to fetch user's details in a separate query 
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
