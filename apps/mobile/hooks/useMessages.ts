import { useState, useEffect, useCallback, useRef } from "react";
import { DocumentSnapshot } from "firebase/firestore";
import * as messageRepository from "@/repositories/messageRepository";
import {
  MessageViewModel,
  ConversationViewModel,
  ConversationListItem,
} from "@/types/message";

/**
 * Hook for real-time messages in a conversation.
 * Subscribes to Firestore onSnapshot for live updates.
 *
 * @example
 * ```tsx
 * function ConversationScreen({ conversationId }) {
 *   const { user } = useAuth();
 *   const { messages, loading, error, sendMessage } = useMessages(conversationId);
 *
 *   return (
 *     <FlatList
 *       data={messages}
 *       renderItem={({ item }) => <MessageBubble message={item} />}
 *     />
 *   );
 * }
 * ```
 */
export function useMessages(conversationId: string, limit: number = 50) {
  const [messages, setMessages] = useState<MessageViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = messageRepository.subscribeToMessages(
      conversationId,
      (updatedMessages) => {
        setMessages(updatedMessages);
        setLoading(false);
      },
      limit
    );

    return () => {
      unsubscribe();
    };
  }, [conversationId, limit]);

  const sendMessage = useCallback(
    async (senderId: string, text: string): Promise<void> => {
      try {
        await messageRepository.sendMessage(
          conversationId,
          senderId,
          text
        );
        // No need to manually add — onSnapshot will pick it up
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to send message";
        setError(message);
        throw err;
      }
    },
    [conversationId]
  );

  return {
    messages,
    loading,
    error,
    sendMessage,
  };
}

/**
 * Hook for managing conversations list
 * Real-time updates via Firestore listener
 *
 * @example
 * ```tsx
 * function ConversationsScreen() {
 *   const { user } = useAuth();
 *   const { conversations, loading } = useConversations(user.id);
 *
 *   return (
 *     <FlatList
 *       data={conversations}
 *       renderItem={({ item }) => (
 *         <ConversationItem
 *           conversation={item}
 *           onPress={() => navigate('Chat', { id: item._id })}
 *         />
 *       )}
 *     />
 *   );
 * }
 * ```
 */
export function useConversations(userId: string) {
  const [conversations, setConversations] = useState<ConversationViewModel[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Subscribe to real-time updates
    const unsubscribe = messageRepository.subscribeToConversations(
      userId,
      (updatedConversations) => {
        setConversations(updatedConversations);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [userId]);

  return {
    conversations,
    loading,
    error,
  };
}

/**
 * Hook for conversations list view (simplified)
 * Optimized for displaying in a list with unread counts, typing indicators, etc.
 *
 * @example
 * ```tsx
 * function MessagesTab() {
 *   const { user } = useAuth();
 *   const { conversations, loading } = useConversationsList(user.id);
 *
 *   return (
 *     <FlatList
 *       data={conversations}
 *       renderItem={({ item }) => (
 *         <ConversationRow
 *           name={item.otherUser.name}
 *           avatar={item.otherUser.avatar}
 *           lastMessage={item.lastMessage?.text}
 *           unreadCount={item.unreadCount}
 *           isTyping={item.isTyping}
 *         />
 *       )}
 *     />
 *   );
 * }
 * ```
 */
export function useConversationsList(userId: string) {
  const [conversations, setConversations] = useState<
    ConversationListItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Subscribe to real-time updates
    const unsubscribe = messageRepository.subscribeToConversationsList(
      userId,
      (updatedConversations) => {
        setConversations(updatedConversations);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [userId]);

  return {
    conversations,
    loading,
    error,
  };
}

/**
 * Hook for managing a single conversation
 * Useful for chat screens
 */
export function useConversation(userId1: string, userId2: string) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId1 || !userId2) {
      setLoading(false);
      return;
    }

    const findConversation = async () => {
      try {
        setLoading(true);
        setError(null);

        const id = await messageRepository.findOrCreateConversation(
          userId1,
          userId2
        );
        setConversationId(id);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to find conversation";
        setError(message);
        console.error("useConversation error:", err);
      } finally {
        setLoading(false);
      }
    };

    findConversation();
  }, [userId1, userId2]);

  const updateReadStatus = useCallback(async () => {
    if (!conversationId || !userId1) return;

    try {
      await messageRepository.updateReadStatus(conversationId, userId1);
    } catch (err) {
      console.error("Error updating read status:", err);
    }
  }, [conversationId, userId1]);

  const setTyping = useCallback(
    async (isTyping: boolean) => {
      if (!conversationId || !userId1) return;

      try {
        await messageRepository.setTypingStatus(conversationId, userId1, isTyping);
      } catch (err) {
        console.error("Error setting typing status:", err);
      }
    },
    [conversationId, userId1]
  );

  return {
    conversationId,
    loading,
    error,
    updateReadStatus,
    setTyping,
  };
}
