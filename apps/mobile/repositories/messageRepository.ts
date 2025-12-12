import {
  getDoc,
  Timestamp,
  DocumentReference,
  DocumentSnapshot,
} from "firebase/firestore";
import { conversationService } from "@/backend/main/src/services/conversationService";
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
export class MessageRepository {
  /**
   * Fetches messages for a conversation and transforms them to UI format
   */
  async getMessagesForConversation(
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
        messages.map((msg) => this.transformMessageToUI(msg))
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
  async sendMessage(
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
      return await this.transformMessageToUI(message);
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }

  /**
   * Finds or creates a conversation and returns the ID
   */
  async findOrCreateConversation(
    userId1: string,
    userId2: string
  ): Promise<string> {
    return conversationService.findOrCreateConversation(userId1, userId2);
  }

  /**
   * Updates read status for a conversation
   */
  async updateReadStatus(
    conversationId: string,
    userId: string
  ): Promise<void> {
    return conversationService.updateReadStatus(conversationId, userId);
  }

  /**
   * Sets typing status for a conversation
   */
  async setTypingStatus(
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
  subscribeToConversations(
    userId: string,
    onUpdate: (conversations: ConversationViewModel[]) => void
  ): () => void {
    return conversationService.getConversations(
      userId,
      async (conversations) => {
        // Transform all conversations to UI format
        const uiConversations = await Promise.all(
          conversations.map((conv) =>
            this.transformConversationToUI(conv, userId)
          )
        );

        onUpdate(uiConversations);
      }
    );
  }

  /**
   * Gets conversations as a list optimized for list views
   */
  subscribeToConversationsList(
    userId: string,
    onUpdate: (conversations: ConversationListItem[]) => void
  ): () => void {
    return conversationService.getConversations(
      userId,
      async (conversations) => {
        // Transform to list items
        const listItems = await Promise.all(
          conversations.map((conv) => this.transformToListItem(conv, userId))
        );

        // Sort by most recent
        listItems.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

        onUpdate(listItems);
      }
    );
  }

  // ========== PRIVATE TRANSFORMATION METHODS ==========

  /**
   * Transforms a database Message to UI MessageViewModel
   */
  private async transformMessageToUI(
    message: Message
  ): Promise<MessageViewModel> {
    // Fetch sender details from the DocumentReference
    const senderDoc = await getDoc(message.senderId);
    const senderData = senderDoc.exists() ? (senderDoc.data() as User) : null;

    return {
      _id: message._id,
      conversationId: this.extractIdFromRef(message.conversationId),
      senderId: senderDoc.id,
      senderName: senderData
        ? `${senderData.firstName} ${senderData.lastName}`
        : "Unknown User",
      senderAvatar: senderData?.avatar,
      text: message.text,
      createdAt: this.timestampToISO(message.createdAt),
      createdAtTimestamp: this.timestampToMillis(message.createdAt),
    };
  }

  /**
   * Transforms a database Conversation to UI ConversationViewModel
   */
  private async transformConversationToUI(
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
        const senderDoc = await getDoc(msgData.senderId);
        const senderData = senderDoc.exists()
          ? (senderDoc.data() as User)
          : null;

        lastMessage = {
          messageId: lastMsgDoc.id,
          text: msgData.text,
          senderId: senderDoc.id,
          senderName: senderData
            ? `${senderData.firstName} ${senderData.lastName}`
            : "Unknown",
          createdAt: this.timestampToISO(msgData.createdAt),
        };
      }
    }

    // Transform lastRead timestamps
    const lastRead: { [userId: string]: string } = {};
    for (const [userId, timestamp] of Object.entries(conversation.lastRead)) {
      lastRead[userId] = this.timestampToISO(timestamp);
    }

    // Calculate unread count
    const unreadCount = this.calculateUnreadCount(
      conversation,
      currentUserId,
      lastMessage?.createdAt
    );

    return {
      _id: conversation._id,
      participants,
      lastMessage,
      unreadCount,
      lastRead,
      typing: conversation.typing || {},
      createdAt: this.timestampToISO(conversation.createdAt),
      updatedAt: this.timestampToISO(conversation.updatedAt),
    };
  }

  /**
   * Transforms a Conversation to a simplified list item
   */
  private async transformToListItem(
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
        const senderId = this.extractIdFromRef(msgData.senderId);

        lastMessage = {
          text: msgData.text,
          createdAt: this.timestampToISO(msgData.createdAt),
          isFromMe: senderId === currentUserId,
        };
      }
    }

    // Check if other user is typing
    const isTyping = otherUserId
      ? conversation.typing?.[otherUserId] || false
      : false;

    // Calculate unread count
    const unreadCount = this.calculateUnreadCount(
      conversation,
      currentUserId,
      lastMessage?.createdAt
    );

    return {
      _id: conversation._id,
      otherUser,
      lastMessage,
      unreadCount,
      isTyping,
      updatedAt: this.timestampToISO(conversation.updatedAt),
    };
  }

  // ========== UTILITY METHODS ==========

  private extractIdFromRef(ref: DocumentReference): string {
    return ref.id;
  }

  private timestampToISO(timestamp: Timestamp): string {
    return timestamp.toDate().toISOString();
  }

  private timestampToMillis(timestamp: Timestamp): number {
    return timestamp.toMillis();
  }

  private calculateUnreadCount(
    conversation: Conversation,
    userId: string,
    lastMessageDate?: string
  ): number {
    if (!lastMessageDate) return 0;

    const userLastRead = conversation.lastRead[userId];
    if (!userLastRead) return 1; // If never read, assume 1 unread

    const lastReadTime = userLastRead.toMillis();
    const lastMessageTime = new Date(lastMessageDate).getTime();

    // Simple check: if last message is after last read, there's at least 1 unread
    // For accurate count, you'd need to query messages created after lastRead
    return lastMessageTime > lastReadTime ? 1 : 0;
  }
}

// Export singleton instance
export const messageRepository = new MessageRepository();

