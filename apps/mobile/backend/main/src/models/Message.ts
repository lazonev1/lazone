import { Timestamp } from "firebase/firestore";

export interface Message {
  _id: string; // Firestore document ID
  conversationId: string; // ID of the parent Conversation
  senderId: string; // ID of the User who sent it
  text: string;
  createdAt: Timestamp;
}
