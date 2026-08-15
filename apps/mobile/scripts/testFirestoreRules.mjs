import { createUserWithEmailAndPassword, connectAuthEmulator, getAuth } from 'firebase/auth';
import { collection, connectFirestoreEmulator, deleteDoc, doc, getDoc, getDocs, getFirestore, query, runTransaction, setDoc, serverTimestamp, updateDoc, where, writeBatch } from 'firebase/firestore';
import { deleteApp, initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: 'demo-api-key',
  authDomain: 'demo-rules.firebaseapp.com',
  projectId: 'demo-rules',
  appId: 'demo-rules-app',
};

const emulatorHost = '127.0.0.1';
const emulatorFirestorePort = 8080;
const emulatorAuthPort = 9099;
const runId = Date.now();

function createClient(name) {
  const app = initializeApp(firebaseConfig, name);
  const auth = getAuth(app);
  const db = getFirestore(app);
  connectAuthEmulator(auth, `http://${emulatorHost}:${emulatorAuthPort}`, { disableWarnings: true });
  connectFirestoreEmulator(db, emulatorHost, emulatorFirestorePort);
  return { app, auth, db };
}

async function expectAllowed(label, operation) {
  try {
    await operation();
  } catch (error) {
    throw new Error(`${label} should be allowed: ${error.message}`);
  }
}

async function expectDenied(label, operation) {
  try {
    await operation();
  } catch (error) {
    if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED') return;
    throw new Error(`${label} failed for an unexpected reason: ${error.message}`);
  }
  throw new Error(`${label} should be denied`);
}

async function writeStatusTransition(db, bookingRef, eventId, fromStatus, toStatus, actorId, actorRole, extraFields = {}) {
  const eventRef = doc(db, 'bookings', bookingRef.id, 'events', eventId);
  const batch = writeBatch(db);
  batch.update(bookingRef, {
    status: toStatus,
    latestTransitionId: eventId,
    updatedAt: serverTimestamp(),
    ...extraFields,
  });
  batch.set(eventRef, {
    fromStatus,
    toStatus,
    actorId,
    actorRole,
    occurredAt: serverTimestamp(),
  });
  await batch.commit();
}

const providerClient = createClient(`provider-${runId}`);
const requesterClient = createClient(`requester-${runId}`);
const outsiderClient = createClient(`outsider-${runId}`);

try {
  const providerCredential = await createUserWithEmailAndPassword(
    providerClient.auth,
    `provider-${runId}@example.test`,
    'Password123!'
  );
  const requesterCredential = await createUserWithEmailAndPassword(
    requesterClient.auth,
    `requester-${runId}@example.test`,
    'Password123!'
  );
  const outsiderCredential = await createUserWithEmailAndPassword(
    outsiderClient.auth,
    `outsider-${runId}@example.test`,
    'Password123!'
  );
  const providerId = providerCredential.user.uid;
  const requesterId = requesterCredential.user.uid;
  const outsiderId = outsiderCredential.user.uid;

  await expectAllowed('provider user profile creation', () => setDoc(doc(providerClient.db, 'users', providerId), {
    firstName: 'Test',
    lastName: 'Provider',
  }));
  await expectAllowed('requester user profile creation', () => setDoc(doc(requesterClient.db, 'users', requesterId), {
    firstName: 'Test',
    lastName: 'Requester',
  }));

  await expectAllowed('provider creation', () => setDoc(doc(providerClient.db, 'providers', providerId), {
    firstName: 'Test',
    lastName: 'Provider',
  }));

  const bookingId = `booking-${runId}`;
  const requesterBookingRef = doc(requesterClient.db, 'bookings', bookingId);
  const providerBookingRef = doc(providerClient.db, 'bookings', bookingId);
  await expectAllowed('booking creation', () => setDoc(requesterBookingRef, {
    requesterId,
    requesterName: 'Test Requester',
    providerId,
    providerName: 'Test Provider',
    serviceId: 'service-1',
    serviceName: 'Test Service',
    bookingDate: new Date(),
    price: 1000,
    notes: null,
    status: 'pending',
    checklist: [
      { id: 'item-1', description: 'Complete the requested work', completed: false },
    ],
    checklistTotal: 1,
    checklistCompletedCount: 0,
    checklistProgress: { 'item-1': false },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));

  await expectAllowed('provider accepts booking', () => writeStatusTransition(
    providerClient.db, providerBookingRef, 'event-confirmed', 'pending', 'confirmed', providerId, 'provider'
  ));

  await expectDenied('requester starts service', () => writeStatusTransition(
    requesterClient.db, requesterBookingRef,
    'event-requester-start', 'confirmed', 'in_progress', requesterId, 'requester'
  ));

  await expectDenied('status update reusing an old event ID', () => updateDoc(
    providerBookingRef,
    { status: 'in_progress', latestTransitionId: 'event-confirmed', updatedAt: serverTimestamp() }
  ));

  await expectAllowed('provider starts service', () => writeStatusTransition(
    providerClient.db, providerBookingRef, 'event-started', 'confirmed', 'in_progress', providerId, 'provider'
  ));
  const startedEventRef = doc(providerClient.db, 'bookings', bookingId, 'events', 'event-started');
  await expectDenied('event update', () => updateDoc(startedEventRef, { toStatus: 'completed' }));
  await expectDenied('event delete', () => deleteDoc(startedEventRef));

  await expectDenied('provider cannot complete directly', () => writeStatusTransition(
    providerClient.db, providerBookingRef, 'event-completed', 'in_progress', 'completed', providerId, 'provider'
  ));

  await expectAllowed('provider completes checklist', () => updateDoc(providerBookingRef, {
    checklistProgress: { 'item-1': true },
    checklistCompletedCount: 1,
    updatedAt: serverTimestamp(),
  }));
  await expectAllowed('provider submits completion for confirmation', () => writeStatusTransition(
    providerClient.db, providerBookingRef, 'event-submitted', 'in_progress', 'awaiting_confirmation', providerId, 'provider', { requesterChangeRequest: null }
  ));
  await expectDenied('provider cannot confirm their own completion', () => writeStatusTransition(
    providerClient.db, providerBookingRef, 'event-provider-completed', 'awaiting_confirmation', 'completed', providerId, 'provider'
  ));
  await expectAllowed('requester requests changes', () => writeStatusTransition(
    requesterClient.db, requesterBookingRef, 'event-changes', 'awaiting_confirmation', 'in_progress', requesterId, 'requester', {
      requesterChangeRequest: 'Please finish the remaining detail.',
    }
  ));
  await expectAllowed('provider resubmits completion', () => writeStatusTransition(
    providerClient.db, providerBookingRef, 'event-resubmitted', 'in_progress', 'awaiting_confirmation', providerId, 'provider', { requesterChangeRequest: null }
  ));
  await expectAllowed('requester confirms completion', () => writeStatusTransition(
    requesterClient.db, requesterBookingRef, 'event-completed', 'awaiting_confirmation', 'completed', requesterId, 'requester'
  ));

  const reviewRef = doc(requesterClient.db, 'reviews', bookingId);
  const reviewData = {
    bookingId,
    providerId,
    requesterId,
    serviceId: 'service-1',
    rating: 5,
    comment: 'Everything requested was completed.',
    images: [],
    responses: [],
    isHelpful: 0,
    helpfulBy: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await expectAllowed('requester creates booking review', () => setDoc(reviewRef, reviewData));
  await expectDenied('outsider cannot create a booking review', () => setDoc(
    doc(outsiderClient.db, 'reviews', `different-${bookingId}`),
    { ...reviewData, requesterId: outsiderId },
  ));
  await expectDenied('provider cannot edit the requester rating', () => updateDoc(
    doc(providerClient.db, 'reviews', bookingId),
    { rating: 1, updatedAt: serverTimestamp() },
  ));
  await expectAllowed('provider adds one response', () => updateDoc(
    doc(providerClient.db, 'reviews', bookingId),
    { responses: [{ text: 'Thank you for the feedback.', date: new Date() }], updatedAt: serverTimestamp() },
  ));
  await expectDenied('requester cannot impersonate provider response', () => updateDoc(
    reviewRef,
    { responses: [{ text: 'Forged response', date: new Date() }], updatedAt: serverTimestamp() },
  ));
  await expectAllowed('outsider casts one helpful vote', () => updateDoc(
    doc(outsiderClient.db, 'reviews', bookingId),
    { isHelpful: 1, helpfulBy: [outsiderId], updatedAt: serverTimestamp() },
  ));
  await expectDenied('review author cannot vote on own review', () => updateDoc(
    reviewRef,
    { isHelpful: 0, helpfulBy: [], updatedAt: serverTimestamp() },
  ));
  await expectDenied('reviewed provider cannot vote on the review', () => updateDoc(
    doc(providerClient.db, 'reviews', bookingId),
    { isHelpful: 2, helpfulBy: [outsiderId, providerId], updatedAt: serverTimestamp() },
  ));
  await expectAllowed('requester edits review content', () => updateDoc(
    reviewRef,
    { rating: 4, comment: 'Updated feedback.', updatedAt: serverTimestamp() },
  ));

  const conversationId = [providerId, requesterId].sort().join('_');
  const conversationRef = doc(requesterClient.db, 'conversations', conversationId);
  const missingConversationRef = doc(requesterClient.db, 'conversations', `missing-${runId}`);
  await expectAllowed('nonexistent conversation lookup', async () => {
    const snapshot = await getDoc(missingConversationRef);
    if (snapshot.exists()) throw new Error('expected conversation to be missing');
  });
  await expectAllowed('conversation creation', () => runTransaction(
    requesterClient.db,
    async (transaction) => {
      const snapshot = await transaction.get(conversationRef);
      if (!snapshot.exists()) {
        const requesterProfile = await transaction.get(doc(requesterClient.db, 'users', requesterId));
        const providerProfile = await transaction.get(doc(requesterClient.db, 'users', providerId));
        if (!requesterProfile.exists() || !providerProfile.exists()) {
          throw new Error('expected both participant profiles to exist');
        }
        transaction.set(conversationRef, {
          participants: [requesterId, providerId],
          participantDetails: {
            [requesterId]: { name: 'Test Requester', avatar: '' },
            [providerId]: { name: 'Test Provider', avatar: '' },
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastRead: {},
          typing: {},
        });
      }
    },
  ));
  await expectAllowed('conversation read', () => getDoc(conversationRef));
  await expectAllowed('conversation list', () => getDocs(query(
    collection(requesterClient.db, 'conversations'),
    where('participants', 'array-contains', requesterId),
  )));
  await expectDenied('outsider conversation read', () => getDoc(doc(
    outsiderClient.db,
    'conversations',
    conversationId,
  )));
  const requesterMessageRef = doc(collection(requesterClient.db, 'conversations', conversationId, 'messages'));
  const requesterMessageBatch = writeBatch(requesterClient.db);
  requesterMessageBatch.set(requesterMessageRef, {
    conversationId,
    senderId: requesterId,
    text: 'Hello provider',
    createdAt: serverTimestamp(),
  });
  requesterMessageBatch.update(conversationRef, {
    lastMessage: requesterMessageRef,
    updatedAt: serverTimestamp(),
    [`lastRead.${requesterId}`]: serverTimestamp(),
  });
  await expectAllowed('requester sends message', () => requesterMessageBatch.commit());

  const providerConversationRef = doc(providerClient.db, 'conversations', conversationId);
  const providerMessageRef = doc(collection(providerClient.db, 'conversations', conversationId, 'messages'));
  const providerMessageBatch = writeBatch(providerClient.db);
  providerMessageBatch.set(providerMessageRef, {
    conversationId,
    senderId: providerId,
    text: 'Hello requester',
    createdAt: serverTimestamp(),
  });
  providerMessageBatch.update(providerConversationRef, {
    lastMessage: providerMessageRef,
    updatedAt: serverTimestamp(),
    [`lastRead.${providerId}`]: serverTimestamp(),
  });
  await expectAllowed('provider sends message', () => providerMessageBatch.commit());

  console.log('Firestore booking and messaging rules passed.');
} finally {
  await deleteApp(providerClient.app);
  await deleteApp(requesterClient.app);
  await deleteApp(outsiderClient.app);
}
