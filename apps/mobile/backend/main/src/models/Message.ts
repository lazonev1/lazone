import { Timestamp, DocumentReference } from 'firebase/firestore';

export interface Attachment {
  type: string;
  url: string;
  name: string;
  bookingId?: string;
}

export interface Message {
  _id: string; // Firestore document ID
  conversationId: string;
  sender: DocumentReference; // Ref to User
  receiver: DocumentReference; // Ref to User
  content: string;
  attachments: Attachment[];
  read: boolean;
  readAt?: Timestamp;
  createdAt: Timestamp;
}
