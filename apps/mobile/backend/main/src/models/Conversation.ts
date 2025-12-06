import { Timestamp, DocumentReference } from 'firebase/firestore';

export interface Conversation {
  _id: string; // Firestore document ID
  participants: DocumentReference[]; // Array of 2 User refs
  unreadMessages: DocumentReference[]; // Refs to unread Message docs
  messages: DocumentReference[]; // Refs to all Message docs
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
