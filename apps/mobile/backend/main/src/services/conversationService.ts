import {
  where,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  serverTimestamp,
  addDoc,
  Timestamp,
  updateDoc,
  getDoc,
  setDoc,
  startAfter,
  DocumentSnapshot,
} from "firebase/firestore";
import { db, COLLECTIONS } from "../config/firebase";
import { Message } from "../models/Message";
import { Conversation } from "../models/Conversation";
import { User } from "../models/User";

/**
 * Fetches messages for a conversation with pagination.
 * @param conversationId The ID of the conversation.
 * @param messageLimit The maximum number of messages to fetch.
 * @param startAfterDoc The document to start after for pagination.
 * @returns A promise that resolves to an array of message objects.
 */
export const getMessagesForConversation = async (
  conversationId: string,
  messageLimit: number = 20,
  startAfterDoc?: DocumentSnapshot
): Promise<Message[]> => {
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

  const messages = querySnapshot.docs
    .map((doc) => ({ _id: doc.id, ...doc.data() } as Message))
    .reverse();

  return messages;
};

/**
 * Sends a new message in a conversation.
 * @param conversationId The ID of the conversation.
 * @param senderId The ID of the user sending the message.
 * @param text The message content.
 * @returns The newly created message object.
 */
export const sendMessage = async (
  conversationId: string,
  senderId: string,
  text: string
): Promise<Message> => {
  // Reference to the messages subcollection
  const messagesColRef = collection(
    db,
    COLLECTIONS.CONVERSATIONS,
    conversationId,
    COLLECTIONS.MESSAGES
  );

  // Create the new message document
  const newMessage: Omit<Message, "_id"> = {
    conversationId: doc(db, COLLECTIONS.CONVERSATIONS, conversationId),
    senderId: doc(db, COLLECTIONS.USERS, senderId),
    text,
    createdAt: serverTimestamp() as Timestamp,
  };

  const messageDocRef = await addDoc(messagesColRef, newMessage);

  // Also, update the 'lastMessage' on the parent conversation document
  const conversationDocRef = doc(db, COLLECTIONS.CONVERSATIONS, conversationId);
  await updateDoc(conversationDocRef, {
    lastMessage: messageDocRef,
    updatedAt: serverTimestamp(),
  });

  return {
    _id: messageDocRef.id,
    ...newMessage,
  } as Message;
};

/**
 * Finds an existing conversation between two users or creates a new one.
 * This prevents duplicate conversation documents by creating a canonical ID.
 * @param userId1 The ID of the first user.
 * @param userId2 The ID of the second user.
 * @returns The ID of the conversation.
 */
export const findOrCreateConversation = async (
  userId1: string,
  userId2: string
): Promise<string> => {
  // 1. Create a canonical conversation ID
  const sortedIds = [userId1, userId2].sort();
  const conversationId = sortedIds.join("_");

  const conversationDocRef = doc(db, COLLECTIONS.CONVERSATIONS, conversationId);
  const conversationDoc = await getDoc(conversationDocRef);

  if (conversationDoc.exists()) {
    return conversationId;
  }

  // 4. If it doesn't exist, fetch participant details for denormalization
  const user1Doc = await getDoc(doc(db, COLLECTIONS.USERS, userId1));
  const user2Doc = await getDoc(doc(db, COLLECTIONS.USERS, userId2));

  if (!user1Doc.exists() || !user2Doc.exists()) {
    throw new Error("One or both users not found");
  }

  const user1Data = user1Doc.data() as User;
  const user2Data = user2Doc.data() as User;

  const newConversation: Omit<Conversation, "_id"> = {
    participants: [
      doc(db, COLLECTIONS.USERS, userId1),
      doc(db, COLLECTIONS.USERS, userId2),
    ],
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

  await setDoc(conversationDocRef, newConversation);

  return conversationId;
};

/**
 * Updates the lastRead timestamp for a user in a specific conversation.
 * @param conversationId The ID of the conversation.
 * @param userId The ID of the user whose read status is being updated.
 */
export const updateReadStatus = async (
  conversationId: string,
  userId: string
): Promise<void> => {
  const conversationDocRef = doc(db, COLLECTIONS.CONVERSATIONS, conversationId);

  const fieldToUpdate = `lastRead.${userId}`;

  await updateDoc(conversationDocRef, {
    [fieldToUpdate]: serverTimestamp(),
  });
};

/**
 * Listens for real-time updates to all conversations for a specific user.
 * @param userId The ID of the user.
 * @param onConversationsUpdate A callback function that receives the updated list of conversations.
 * @returns An unsubscribe function to stop listening for updates.
 */
export const getConversations = (
  userId: string,
  onConversationsUpdate: (conversations: Conversation[]) => void
) => {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  const q = query(
    collection(db, COLLECTIONS.CONVERSATIONS),
    where("participants", "array-contains", userRef)
  );

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const conversations = querySnapshot.docs.map(
      (doc) => ({ _id: doc.id, ...doc.data() } as Conversation)
    );
    onConversationsUpdate(conversations);
  });

  return unsubscribe;
};

/**
 * Sets the typing status for a user in a conversation.
 * @param conversationId The ID of the conversation.
 * @param userId The ID of the user who is typing.
 * @param isTyping Whether the user is currently typing.
 */
export const setTypingStatus = async (
  conversationId: string,
  userId: string,
  isTyping: boolean
): Promise<void> => {
  const conversationDocRef = doc(db, COLLECTIONS.CONVERSATIONS, conversationId);
  const fieldToUpdate = `typing.${userId}`;

  await updateDoc(conversationDocRef, {
    [fieldToUpdate]: isTyping,
  });
};
