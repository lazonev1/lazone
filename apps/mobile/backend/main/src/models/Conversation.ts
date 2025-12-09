import { Timestamp, DocumentReference } from 'firebase/firestore';

export interface Conversation {
  _id: string; // Firestore document ID
  participants: DocumentReference[]; // Array of 2 User refs
  lastMessage?: DocumentReference; // Ref to the last Message doc
  lastRead: { [userId: string]: Timestamp }; // Map of userId to their last read timestamp
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
