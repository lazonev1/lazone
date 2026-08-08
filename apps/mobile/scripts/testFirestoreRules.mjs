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

async function writeStatusTransition(db, bookingRef, eventId, fromStatus, toStatus, actorId, actorRole) {
  const eventRef = doc(db, 'bookings', bookingRef.id, 'events', eventId);
  const batch = writeBatch(db);
  batch.update(bookingRef, {
    status: toStatus,
    latestTransitionId: eventId,
    updatedAt: serverTimestamp(),
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
  await createUserWithEmailAndPassword(
    outsiderClient.auth,
    `outsider-${runId}@example.test`,
    'Password123!'
  );
  const providerId = providerCredential.user.uid;
  const requesterId = requesterCredential.user.uid;

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

  await expectAllowed('provider completes service', () => writeStatusTransition(
    providerClient.db, providerBookingRef, 'event-completed', 'in_progress', 'completed', providerId, 'provider'
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
