import {
  getDoc,
  getDocs,
  doc,
  collection,
  query,
  where,
  Timestamp,
  DocumentSnapshot,
} from "firebase/firestore";
import { db, COLLECTIONS } from "@/backend/main/src/config/firebase";
import * as conversationService from "@/backend/main/src/services/conversationService";
import { Message } from "@/backend/main/src/models/Message";
import { Conversation } from "@/backend/main/src/models/Conversation";
import { User } from "@/backend/main/src/models/User";
import {
  MessageViewModel,
  ConversationViewModel,
  ConversationListItem,
} from "@/types/message";

/**
 * Message Repository
 *
 * Responsible for transforming database models (with DocumentReferences)
 * from backend services into UI-ready ViewModels.
 *
 * This repository acts as an adapter between the Firestore backend layer
 * and the UI layer, ensuring no Firestore types leak into the UI.
 */

/**
 * Fetches messages for a conversation and transforms them to UI format
 */
export async function getMessagesForConversation(
  conversationId: string,
  messageLimit: number = 20,
  startAfterDoc?: DocumentSnapshot
): Promise<MessageViewModel[]> {
  try {
    // 1. Fetch messages from backend service (returns database models)
    const messages = await conversationService.getMessagesForConversation(
      conversationId,
      messageLimit,
      startAfterDoc
    );

    // 2. Transform each message to UI format
    const uiMessages = await Promise.all(
      messages.map((msg) => transformMessageToUI(msg))
    );

    return uiMessages;
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }
}

/**
 * Sends a message and returns it in UI format
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string
): Promise<MessageViewModel> {
  try {
    // 1. Send message using backend service
    const message = await conversationService.sendMessage(
      conversationId,
      senderId,
      text
    );

    // 2. Transform to UI format
    return await transformMessageToUI(message);
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

/**
 * Finds or creates a conversation and returns the ID
 */
export async function findOrCreateConversation(
  userId1: string,
  userId2: string
): Promise<string> {
  return conversationService.findOrCreateConversation(userId1, userId2);
}

/**
 * Updates read status for a conversation
 */
export async function updateReadStatus(
  conversationId: string,
  userId: string
): Promise<void> {
  return conversationService.updateReadStatus(conversationId, userId);
}

/**
 * Sets typing status for a conversation
 */
export async function setTypingStatus(
  conversationId: string,
  userId: string,
  isTyping: boolean
): Promise<void> {
  return conversationService.setTypingStatus(
    conversationId,
    userId,
    isTyping
  );
}

/**
 * Subscribes to conversations for a user
 * Transforms the data before calling the callback
 */
export function subscribeToConversations(
  userId: string,
  onUpdate: (conversations: ConversationViewModel[]) => void
): () => void {
  return conversationService.getConversations(
    userId,
    async (conversations) => {
      try {
        // Transform all conversations to UI format
        const uiConversations = await Promise.all(
          conversations.map((conv) =>
            transformConversationToUI(conv, userId)
          )
        );

        onUpdate(uiConversations);
      } catch (error) {
        console.error("Error transforming conversations:", error);
        onUpdate([]);
      }
    }
  );
}

/**
 * Gets conversations as a list optimized for list views
 */
export function subscribeToConversationsList(
  userId: string,
  onUpdate: (conversations: ConversationListItem[]) => void
): () => void {
  return conversationService.getConversations(
    userId,
    async (conversations) => {
      try {
        // Transform to list items
        const listItems = await Promise.all(
          conversations.map((conv) => transformToListItem(conv, userId))
        );

        // Sort by most recent
        listItems.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

        onUpdate(listItems);
      } catch (error) {
        console.error("Error transforming conversation list:", error);
        onUpdate([]);
      }
    }
  );
}

/**
 * Subscribes to real-time messages in a conversation and transforms them to UI format
 */
export function subscribeToMessages(
  conversationId: string,
  onUpdate: (messages: MessageViewModel[]) => void,
  messageLimit: number = 50
): () => void {
  return conversationService.subscribeToMessages(
    conversationId,
    async (messages) => {
      const uiMessages = await Promise.all(
        messages.map((msg) => transformMessageToUI(msg))
      );
      onUpdate(uiMessages);
    },
    messageLimit
  );
}

// ========== TRANSFORMATION FUNCTIONS ==========

/**
 * Transforms a database Message to UI MessageViewModel
 */
async function transformMessageToUI(
  message: Message
): Promise<MessageViewModel> {
  // Fetch sender details using the string userId
  const senderDoc = await getDoc(doc(db, COLLECTIONS.USERS, message.senderId));
  const senderData = senderDoc.exists() ? (senderDoc.data() as User) : null;

  return {
    _id: message._id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    senderName: senderData
      ? `${senderData.firstName} ${senderData.lastName}`
      : "Unknown User",
    senderAvatar: senderData?.avatar,
    text: message.text,
    createdAt: timestampToISO(message.createdAt),
    createdAtTimestamp: timestampToMillis(message.createdAt),
  };
}

/**
 * Transforms a database Conversation to UI ConversationViewModel
 */
async function transformConversationToUI(
  conversation: Conversation,
  currentUserId: string
): Promise<ConversationViewModel> {
  // Transform participants
  const participants = Object.entries(conversation.participantDetails).map(
    ([userId, details]) => ({
      userId,
      name: details.name,
      avatar: details.avatar,
    })
  );

  // Fetch and transform last message if exists
  let lastMessage;
  if (conversation.lastMessage) {
    const lastMsgDoc = await getDoc(conversation.lastMessage);
    if (lastMsgDoc.exists()) {
      const msgData = lastMsgDoc.data() as Message;
      const senderDoc = await getDoc(doc(db, COLLECTIONS.USERS, msgData.senderId));
      const senderData = senderDoc.exists()
        ? (senderDoc.data() as User)
        : null;

      lastMessage = {
        messageId: lastMsgDoc.id,
        text: msgData.text,
        senderId: msgData.senderId,
        senderName: senderData
          ? `${senderData.firstName} ${senderData.lastName}`
          : "Unknown",
        createdAt: timestampToISO(msgData.createdAt),
      };
    }
  }

  // Transform lastRead timestamps
  const lastRead: { [userId: string]: string } = {};
  for (const [userId, timestamp] of Object.entries(conversation.lastRead)) {
    lastRead[userId] = timestampToISO(timestamp);
  }

  // Calculate unread count
  const unreadCount = await calculateUnreadCount(
    conversation,
    currentUserId,
  );

  return {
    _id: conversation._id,
    participants,
    lastMessage,
    unreadCount,
    lastRead,
    typing: conversation.typing || {},
    createdAt: timestampToISO(conversation.createdAt),
    updatedAt: timestampToISO(conversation.updatedAt),
  };
}

/**
 * Transforms a Conversation to a simplified list item
 */
async function transformToListItem(
  conversation: Conversation,
  currentUserId: string
): Promise<ConversationListItem> {
  // Find the other user
  const otherUserId = Object.keys(conversation.participantDetails).find(
    (id) => id !== currentUserId
  );

  const otherUser = otherUserId
    ? {
        userId: otherUserId,
        name: conversation.participantDetails[otherUserId].name,
        avatar: conversation.participantDetails[otherUserId].avatar,
      }
    : {
        userId: "unknown",
        name: "Unknown User",
      };

  // Fetch last message
  let lastMessage;
  if (conversation.lastMessage) {
    const lastMsgDoc = await getDoc(conversation.lastMessage);
    if (lastMsgDoc.exists()) {
      const msgData = lastMsgDoc.data() as Message;

      lastMessage = {
        text: msgData.text,
        createdAt: timestampToISO(msgData.createdAt),
        isFromMe: msgData.senderId === currentUserId,
      };
    }
  }

  // Check if other user is typing
  const isTyping = otherUserId
    ? conversation.typing?.[otherUserId] || false
    : false;

  // Calculate unread count
  const unreadCount = await calculateUnreadCount(
    conversation,
    currentUserId,
  );

  return {
    _id: conversation._id,
    otherUser,
    lastMessage,
    unreadCount,
    isTyping,
    updatedAt: timestampToISO(conversation.updatedAt),
  };
}

// ========== UTILITY FUNCTIONS ==========

function timestampToISO(timestamp: Timestamp | null | undefined): string {
  if (!timestamp || typeof timestamp.toDate !== 'function') {
    return new Date().toISOString();
  }
  return timestamp.toDate().toISOString();
}

function timestampToMillis(timestamp: Timestamp | null | undefined): number {
  if (!timestamp || typeof timestamp.toMillis !== 'function') {
    return Date.now();
  }
  return timestamp.toMillis();
}

async function calculateUnreadCount(
  conversation: Conversation,
  userId: string,
): Promise<number> {
  const userLastRead = conversation.lastRead[userId];

  // Build a query for messages in this conversation after the user's lastRead
  const messagesColRef = collection(
    db,
    COLLECTIONS.CONVERSATIONS,
    conversation._id,
    COLLECTIONS.MESSAGES
  );

  const q = userLastRead && typeof userLastRead.toDate === 'function'
    ? query(messagesColRef, where("createdAt", ">", userLastRead))
    : messagesColRef;

  const snapshot = await getDocs(q);

  return snapshot.docs.reduce((count, docSnapshot) => {
    const message = docSnapshot.data() as Message;
    return message.senderId !== userId ? count + 1 : count;
  }, 0);
}

