import {
  collection,
  doc,
  DocumentSnapshot,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  runTransaction,
  writeBatch,
} from "firebase/firestore";
import {COLLECTIONS, db} from "../config/firebase";
import {Message} from "../models/Message";
import {Conversation} from "../models/Conversation";
import {User} from "../models/User";

/**
 * Fetches messages for a conversation with pagination.
 * @param conversationId The ID of the conversation.
 * @param messageLimit The maximum number of messages to fetch.
 * @param startAfterDoc The document to start after for pagination.
 * @returns A promise that resolves to an array of message objects.
 */
export async function getMessagesForConversation(
  conversationId: string,
  messageLimit: number = 20,
  startAfterDoc?: DocumentSnapshot
): Promise<Message[]> {
  const messagesColRef = collection(
    db,
    COLLECTIONS.CONVERSATIONS,
    conversationId,
    COLLECTIONS.MESSAGES
  );

  let q;
  if (startAfterDoc) {
    q = query(
      messagesColRef,
      orderBy("createdAt", "desc"),
      startAfter(startAfterDoc),
      limit(messageLimit)
    );
  } else {
    q = query(
      messagesColRef,
      orderBy("createdAt", "desc"),
      limit(messageLimit)
    );
  }

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs
      .map((doc) => ({_id: doc.id, ...doc.data()} as Message))
      .reverse();
}

/**
 * Sends a new message in a conversation.
 * @param conversationId The ID of the conversation.
 * @param senderId The ID of the user sending the message.
 * @param text The message content.
 * @returns The newly created message object.
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string
): Promise<Message> {
  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new Error("Message cannot be empty");
  }
  if (trimmedText.length > 4000) {
    throw new Error("Message cannot exceed 4000 characters");
  }

  const conversationDocRef = doc(
    db,
    COLLECTIONS.CONVERSATIONS,
    conversationId
  );
  const conversationSnapshot = await getDoc(conversationDocRef);
  if (!conversationSnapshot.exists()) {
    throw new Error("Conversation not found. Reopen the chat and try again.");
  }

  // Reference to the messages subcollection
  const messagesColRef = collection(
    db,
    COLLECTIONS.CONVERSATIONS,
    conversationId,
    COLLECTIONS.MESSAGES
  );

  // Create the new message document
  const newMessage: Omit<Message, "_id"> = {
    conversationId,
    senderId,
    text: trimmedText,
    createdAt: serverTimestamp() as Timestamp,
  };

  // Create the message and update its parent conversation atomically. This
  // prevents an orphaned message if the conversation update is rejected.
  const messageDocRef = doc(messagesColRef);
  const batch = writeBatch(db);
  batch.set(messageDocRef, newMessage);
  batch.update(conversationDocRef, {
    lastMessage: messageDocRef,
    updatedAt: serverTimestamp(),
    [`lastRead.${senderId}`]: serverTimestamp(),
  });
  await batch.commit();

  return {
    _id: messageDocRef.id,
    ...newMessage,
    createdAt: Timestamp.now(),
  } as Message;
}

/**
 * Finds an existing conversation between two users or creates a new one.
 * This prevents duplicate conversation documents by creating a canonical ID.
 * @param userId1 The ID of the first user.
 * @param userId2 The ID of the second user.
 * @returns The ID of the conversation.
 */
export async function findOrCreateConversation(
  userId1: string,
  userId2: string
): Promise<string> {
  if (!userId1 || !userId2 || userId1 === userId2) {
    throw new Error("A conversation requires two different users");
  }

  // 1. Create a canonical conversation ID
  const sortedIds = [userId1, userId2].sort();
  const conversationId = sortedIds.join("_");

  const conversationDocRef = doc(
    db,
    COLLECTIONS.CONVERSATIONS,
    conversationId
  );
  await runTransaction(db, async (transaction) => {
    const conversationDoc = await transaction.get(conversationDocRef);
    if (conversationDoc.exists()) return;

    // Reads stay inside the transaction so an existing conversation can be
    // returned without depending on either user's profile still existing.
    const user1Doc = await transaction.get(doc(db, COLLECTIONS.USERS, userId1));
    const user2Doc = await transaction.get(doc(db, COLLECTIONS.USERS, userId2));
    if (!user1Doc.exists() || !user2Doc.exists()) {
      throw new Error("One or both users not found");
    }

    const user1Data = user1Doc.data() as User;
    const user2Data = user2Doc.data() as User;
    const newConversation: Omit<Conversation, "_id"> = {
      participants: [userId1, userId2],
      participantDetails: {
        [userId1]: {
          name: `${user1Data.firstName} ${user1Data.lastName}`,
          avatar: user1Data.avatar || "",
        },
        [userId2]: {
          name: `${user2Data.firstName} ${user2Data.lastName}`,
          avatar: user2Data.avatar || "",
        },
      },
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
      lastRead: {},
      typing: {},
    };

    transaction.set(conversationDocRef, newConversation);
  });

  return conversationId;
}

/**
 * Updates the lastRead timestamp for a user in a specific conversation.
 * @param conversationId The ID of the conversation.
 * @param userId The ID of the user whose read status is being updated.
 */
export async function updateReadStatus(
  conversationId: string,
  userId: string
): Promise<void> {
  const conversationDocRef = doc(
    db,
    COLLECTIONS.CONVERSATIONS,
    conversationId
  );

  const fieldToUpdate = `lastRead.${userId}`;

  await updateDoc(conversationDocRef, {
    [fieldToUpdate]: serverTimestamp(),
  });
}

/**
 * Listens for real-time updates to all conversations for a specific user.
 * @param userId The ID of the user.
 * @param onConversationsUpdate A callback function that receives the updated list of conversations.
 * @returns An unsubscribe function to stop listening for updates.
 */
export function getConversations(
  userId: string,
  onConversationsUpdate: (conversations: Conversation[]) => void
) {
  const q = query(
    collection(db, COLLECTIONS.CONVERSATIONS),
    where("participants", "array-contains", userId)
  );

  return onSnapshot(q, (querySnapshot) => {
    const conversations = querySnapshot.docs.map(
        (doc) => ({_id: doc.id, ...doc.data()} as Conversation)
    );
    onConversationsUpdate(conversations);
  });
}

/**
 * Sets the typing status for a user in a conversation.
 * @param conversationId The ID of the conversation.
 * @param userId The ID of the user who is typing.
 * @param isTyping Whether the user is currently typing.
 */
export async function setTypingStatus(
  conversationId: string,
  userId: string,
  isTyping: boolean
): Promise<void> {
  const conversationDocRef = doc(
    db,
    COLLECTIONS.CONVERSATIONS,
    conversationId
  );
  const fieldToUpdate = `typing.${userId}`;

  await updateDoc(conversationDocRef, {
    [fieldToUpdate]: isTyping,
  });
}

/**
 * Subscribes to real-time message updates in a conversation.
 * @param conversationId The ID of the conversation.
 * @param onMessagesUpdate A callback function that receives the updated list of messages.
 * @param messageLimit The maximum number of messages to listen to.
 * @returns An unsubscribe function to stop listening for updates.
 */
export function subscribeToMessages(
  conversationId: string,
  onMessagesUpdate: (messages: Message[]) => void,
  messageLimit: number = 50,
  onError?: (error: Error) => void
) {
  const messagesColRef = collection(
    db,
    COLLECTIONS.CONVERSATIONS,
    conversationId,
    COLLECTIONS.MESSAGES
  );

  const q = query(
    messagesColRef,
    orderBy("createdAt", "desc"),
    limit(messageLimit)
  );

  return onSnapshot(q, (querySnapshot) => {
    const messages = querySnapshot.docs
      .map((doc) => ({ _id: doc.id, ...doc.data() } as Message))
      .reverse();
    onMessagesUpdate(messages);
  }, (error) => {
    console.warn('Messages subscription error:', error.message);
    onError?.(error);
  });
}
