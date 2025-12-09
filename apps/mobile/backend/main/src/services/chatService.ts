import {
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
} from "firebase/firestore";
import { db, COLLECTIONS } from "../config/firebase";
import { Message } from "../models/Message";
import { Conversation } from "../models/Conversation";

/**
 * Fetches the most recent messages for a specific conversation.
 * @param conversationId The ID of the conversation.
 * @param messageLimit The maximum number of messages to fetch.
 * @returns A promise that resolves to an array of message objects.
 */
export const getMessagesForConversation = async (
  conversationId: string,
  messageLimit: number = 50
): Promise<Message[]> => {
  // 1. Create a reference to the 'messages' subcollection under the specific conversation document.
  const messagesColRef = collection(
    db,
    COLLECTIONS.CONVERSATIONS,
    conversationId,
    COLLECTIONS.MESSAGES
  );

  // 2. Create a query to get the last 'messageLimit' messages, ordered by creation time.
  const q = query(
    messagesColRef,
    orderBy("createdAt", "desc"),
    limit(messageLimit)
  );

  // 3. Execute the query.
  const querySnapshot = await getDocs(q);

  // 4. Map the documents to Message objects and reverse the array to show oldest first.
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
