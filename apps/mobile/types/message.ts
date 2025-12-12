/**
 * UI Models for Messaging
 * These types represent the data structure used in UI components after
 * fetching from Firestore and populating DocumentReferences.
 */

/**
 * ViewModel for a message with populated sender info
 */
export interface MessageViewModel {
  _id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  createdAt: string; // ISO date string for easy display
  createdAtTimestamp: number; // For sorting/comparison
}

/**
 * ViewModel for a conversation with populated data
 */
export interface ConversationViewModel {
  _id: string;
  participants: Array<{
    userId: string;
    name: string;
    avatar?: string;
  }>;
  lastMessage?: {
    messageId: string;
    text: string;
    senderId: string;
    senderName: string;
    createdAt: string;
  };
  unreadCount?: number; // Calculated based on lastRead
  lastRead: { [userId: string]: string }; // ISO date strings
  typing: { [userId: string]: boolean };
  createdAt: string;
  updatedAt: string;
}

/**
 * ViewModel for conversation list view (simplified)
 */
export interface ConversationListItem {
  _id: string;
  otherUser: {
    userId: string;
    name: string;
    avatar?: string;
  };
  lastMessage?: {
    text: string;
    createdAt: string;
    isFromMe: boolean;
  };
  unreadCount: number;
  isTyping: boolean;
  updatedAt: string;
}
