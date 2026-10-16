import { useState, useEffect, useCallback, useRef } from "react";
import * as messageRepository from "@/repositories/messageRepository";
import {
  MessageViewModel,
  ConversationViewModel,
  ConversationListItem,
  ConversationPeer,
} from "@/types/message";
import i18n from "@/localization";

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
export function useMessages(conversationId?: string, limit: number = 50) {
  const [messages, setMessages] = useState<MessageViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const activeConversationRef = useRef<string | undefined>(conversationId);

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) {
      activeConversationRef.current = undefined;
      setMessages([]);
      setError(null);
      setLoading(false);
      return;
    }

    if (activeConversationRef.current !== conversationId) setMessages([]);
    activeConversationRef.current = conversationId;
    setLoading(true);
    setError(null);

    const unsubscribe = messageRepository.subscribeToMessages(
      conversationId,
      (updatedMessages) => {
        setMessages(updatedMessages);
        setError(null);
        setLoading(false);
      },
      limit,
      (subscriptionError) => {
        setError(subscriptionError.message);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [conversationId, limit, retryVersion]);

  const retry = useCallback(() => setRetryVersion((version) => version + 1), []);
  const isCurrentConversation = activeConversationRef.current === conversationId;

  const sendMessage = useCallback(
    async (senderId: string, text: string): Promise<void> => {
      if (!conversationId) {
        throw new Error(i18n.t("messages:errors.conversationUnavailable"));
      }
      await messageRepository.sendMessage(conversationId, senderId, text);
      // No need to manually add — onSnapshot will pick it up.
    },
    [conversationId]
  );

  return {
    messages: isCurrentConversation ? messages : [],
    loading: isCurrentConversation ? loading : Boolean(conversationId),
    error: isCurrentConversation ? error : null,
    retry,
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
  const [retryVersion, setRetryVersion] = useState(0);
  const activeUserRef = useRef(userId);

  useEffect(() => {
    if (!userId) {
      activeUserRef.current = "";
      setConversations([]);
      setError(null);
      setLoading(false);
      return;
    }

    if (activeUserRef.current !== userId) setConversations([]);
    activeUserRef.current = userId;
    setLoading(true);
    setError(null);

    // Subscribe to real-time updates
    const unsubscribe = messageRepository.subscribeToConversations(
      userId,
      (updatedConversations) => {
        setConversations(updatedConversations);
        setError(null);
        setLoading(false);
      },
      (subscriptionError) => {
        setError(subscriptionError.message);
        setLoading(false);
      },
    );

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [userId, retryVersion]);

  const retry = useCallback(() => setRetryVersion((version) => version + 1), []);
  const isCurrentUser = activeUserRef.current === userId;

  return {
    conversations: isCurrentUser ? conversations : [],
    loading: isCurrentUser ? loading : Boolean(userId),
    error: isCurrentUser ? error : null,
    retry,
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
  const [retryVersion, setRetryVersion] = useState(0);
  const typingExpiryRef = useRef(new Map<string, number>());
  const rawTypingRef = useRef(new Map<string, boolean>());
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeUserRef = useRef(userId);

  useEffect(() => {
    if (!userId) {
      activeUserRef.current = "";
      setConversations([]);
      setError(null);
      setLoading(false);
      return;
    }

    if (activeUserRef.current !== userId) setConversations([]);
    activeUserRef.current = userId;
    setLoading(true);
    setError(null);
    typingExpiryRef.current.clear();
    rawTypingRef.current.clear();

    const scheduleTypingExpiry = () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      const expiries = [...typingExpiryRef.current.values()];
      if (!expiries.length) return;
      const delay = Math.max(0, Math.min(...expiries) - Date.now());
      typingTimerRef.current = setTimeout(() => {
        const now = Date.now();
        setConversations((current) => current.map((conversation) => ({
          ...conversation,
          isTyping: conversation.isTyping
            && (typingExpiryRef.current.get(conversation._id) ?? 0) > now,
        })));
        for (const [id, expiresAt] of typingExpiryRef.current) {
          if (expiresAt <= now) typingExpiryRef.current.delete(id);
        }
        scheduleTypingExpiry();
      }, delay + 25);
    };

    // Subscribe to real-time updates
    const unsubscribe = messageRepository.subscribeToConversationsList(
      userId,
      (updatedConversations) => {
        const now = Date.now();
        const visibleConversations = updatedConversations.map((conversation) => {
          const wasTyping = rawTypingRef.current.get(conversation._id) ?? false;
          rawTypingRef.current.set(conversation._id, conversation.isTyping);
          if (conversation.isTyping && !wasTyping) {
            typingExpiryRef.current.set(conversation._id, now + 5_000);
          } else if (!conversation.isTyping) {
            typingExpiryRef.current.delete(conversation._id);
          }
          return {
            ...conversation,
            isTyping: conversation.isTyping
              && (typingExpiryRef.current.get(conversation._id) ?? 0) > now,
          };
        });
        setConversations(visibleConversations);
        setError(null);
        setLoading(false);
        scheduleTypingExpiry();
      },
      (subscriptionError) => {
        setError(subscriptionError.message);
        setLoading(false);
      },
    );

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [userId, retryVersion]);

  const retry = useCallback(() => setRetryVersion((version) => version + 1), []);
  const isCurrentUser = activeUserRef.current === userId;

  return {
    conversations: isCurrentUser ? conversations : [],
    loading: isCurrentUser ? loading : Boolean(userId),
    error: isCurrentUser ? error : null,
    retry,
  };
}

/** Loads the counterpart identity from the authorized conversation record. */
export function useConversationPeer(conversationId: string | undefined, userId: string) {
  const [peer, setPeer] = useState<ConversationPeer | null>(null);
  const [loading, setLoading] = useState(Boolean(conversationId && userId));
  const [error, setError] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const identityKey = `${userId}:${conversationId ?? ""}`;
  const activeIdentityRef = useRef(identityKey);

  useEffect(() => {
    activeIdentityRef.current = identityKey;
    setPeer(null);
    setError(null);
    if (!conversationId || !userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    return messageRepository.subscribeToConversationPeer(
      conversationId,
      userId,
      (nextPeer) => {
        setPeer(nextPeer);
        setError(nextPeer ? null : i18n.t("messages:errors.conversationUnavailable"));
        setLoading(false);
      },
      (subscriptionError) => {
        setError(subscriptionError.message);
        setLoading(false);
      },
    );
  }, [conversationId, identityKey, userId, retryVersion]);

  const retry = useCallback(() => setRetryVersion((version) => version + 1), []);
  const isCurrentIdentity = activeIdentityRef.current === identityKey;

  return {
    peer: isCurrentIdentity ? peer : null,
    loading: isCurrentIdentity ? loading : Boolean(conversationId && userId),
    error: isCurrentIdentity ? error : null,
    retry,
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
          err instanceof Error ? err.message : i18n.t("messages:errors.findConversationFailed");
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
