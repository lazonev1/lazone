import { useState, useEffect, useCallback } from "react";
import { DocumentSnapshot } from "firebase/firestore";
import * as messageRepository from "@/repositories/messageRepository";
import {
  MessageViewModel,
  ConversationViewModel,
  ConversationListItem,
} from "@/types/message";

/**
 * Hook for fetching and managing messages in a conversation
 *
 * @example
 * ```tsx
 * function ChatScreen({ conversationId }) {
 *   const { messages, loading, error, sendMessage, loadMore } = useMessages(conversationId);
 *
 *   return (
 *     <FlatList
 *       data={messages}
 *       onEndReached={loadMore}
 *       renderItem={({ item }) => <MessageBubble message={item} />}
 *     />
 *   );
 * }
 * ```
 */
export function useMessages(conversationId: string, limit: number = 20) {
  const [messages, setMessages] = useState<MessageViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | undefined>();

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;

    try {
      setLoading(true);
      setError(null);

      const fetchedMessages = await messageRepository.getMessagesForConversation(
        conversationId,
        limit
      );

      setMessages(fetchedMessages);
      setHasMore(fetchedMessages.length >= limit);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch messages";
      setError(message);
      console.error("useMessages error:", err);
    } finally {
      setLoading(false);
    }
  }, [conversationId, limit]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || !lastDoc) return;

    try {
      const moreMessages = await messageRepository.getMessagesForConversation(
        conversationId,
        limit,
        lastDoc
      );

      if (moreMessages.length < limit) {
        setHasMore(false);
      }

      setMessages((prev) => [...prev, ...moreMessages]);
    } catch (err) {
      console.error("Error loading more messages:", err);
    }
  }, [conversationId, limit, lastDoc, hasMore, loading]);

  const sendMessage = useCallback(
    async (senderId: string, text: string): Promise<void> => {
      try {
        const newMessage = await messageRepository.sendMessage(
          conversationId,
          senderId,
          text
        );

        // Add new message to the beginning (most recent)
        setMessages((prev) => [newMessage, ...prev]);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to send message";
        setError(message);
        throw err;
      }
    },
    [conversationId]
  );

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return {
    messages,
    loading,
    error,
    hasMore,
    sendMessage,
    loadMore,
    refetch: fetchMessages,
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
