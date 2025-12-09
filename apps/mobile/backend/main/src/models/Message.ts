import { Timestamp, DocumentReference } from "firebase/firestore";

export interface Message {
  _id: string; // Firestore document ID
  conversationId: DocumentReference; // Ref to Conversation
  senderId: DocumentReference; // Ref to User who sent it
  text: string;
  createdAt: Timestamp;
}
