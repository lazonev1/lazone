import { createUserWithEmailAndPassword, connectAuthEmulator, getAuth } from 'firebase/auth';
import { arrayUnion, arrayRemove, collection, connectFirestoreEmulator, deleteDoc, doc, getDoc, getDocs, getFirestore, query, runTransaction, setDoc, serverTimestamp, updateDoc, where, writeBatch } from 'firebase/firestore';
import assert from 'node:assert/strict';
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
const anonymousClient = createClient(`anonymous-${runId}`);

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
    phoneNumber: '+22600000000',
    dob: new Date('1990-01-01'),
    bookmarked: ['private-bookmark'],
    notificationTokens: ['private-push-token'],
  }));
  await expectAllowed('requester user profile creation', () => setDoc(doc(requesterClient.db, 'users', requesterId), {
    firstName: 'Test',
    lastName: 'Requester',
    role: 'requester',
    phoneNumber: '+22611111111',
    bookmarked: [providerId],
    notificationTokens: ['requester-token'],
    subscriptionType: 'free',
    preferences: { language: 'fr' },
  }));

  await expectAllowed('requester edits account name before becoming a provider', () => runTransaction(
    requesterClient.db, async transaction => {
      const userRef = doc(requesterClient.db, 'users', requesterId);
      await transaction.get(userRef);
      const provider = await transaction.get(doc(requesterClient.db, 'providers', requesterId));
      assert.equal(provider.exists(), false);
      transaction.update(userRef, { firstName: 'Test' });
      transaction.set(doc(requesterClient.db, 'publicProfiles', requesterId), {
        firstName: 'Test', lastName: 'Requester',
      });
    }
  ));

  await expectDenied('unrelated user cannot read private account', () => getDoc(doc(outsiderClient.db, 'users', providerId)));
  await expectDenied('anonymous user cannot read private account', () => getDoc(doc(anonymousClient.db, 'users', providerId)));
  await expectAllowed('owner reads private account', () => getDoc(doc(providerClient.db, 'users', providerId)));
  await expectDenied('unrelated user cannot list accounts', () => getDocs(collection(outsiderClient.db, 'users')));
  await expectAllowed('provider public identity creation', () => setDoc(doc(providerClient.db, 'publicProfiles', providerId), {
    firstName: 'Test', lastName: 'Provider',
  }));
  await expectAllowed('requester public identity creation', () => setDoc(doc(requesterClient.db, 'publicProfiles', requesterId), {
    firstName: 'Test', lastName: 'Requester',
  }));
  await expectAllowed('unrelated user reads public identity', () => getDoc(doc(outsiderClient.db, 'publicProfiles', providerId)));
  await expectAllowed('anonymous user reads public identity', () => getDoc(doc(anonymousClient.db, 'publicProfiles', providerId)));
  await expectDenied('public identity cannot contain private phone', () => updateDoc(
    doc(providerClient.db, 'publicProfiles', providerId), { phoneNumber: '+22600000000' }
  ));
  await expectDenied('unrelated user cannot edit identity', () => updateDoc(
    doc(outsiderClient.db, 'publicProfiles', providerId), { firstName: 'Impersonated' }
  ));

  await expectAllowed('provider creation and role promotion in one commit', () => {
    const batch = writeBatch(providerClient.db);
    batch.set(doc(providerClient.db, 'providers', providerId), {
      publicSchemaVersion: 1,
      firstName: 'Test',
      lastName: 'Provider',
      services: [{ id: 'service-1', name: 'Test Service', price: '1000' }],
      location: { country: 'BF', city: 'Ouagadougou', coordinates: { latitude: 12.35, longitude: -1.23 } },
    });
    batch.update(doc(providerClient.db, 'users', providerId), { role: 'both' });
    return batch.commit();
  });

  await expectDenied('provider without services', () => setDoc(doc(outsiderClient.db, 'providers', outsiderId), {
    publicSchemaVersion: 1,
    firstName: 'Empty',
    lastName: 'Provider',
    services: [],
  }));
  await expectDenied('provider cannot publish account data', () => updateDoc(
    doc(providerClient.db, 'providers', providerId), { dob: new Date('1990-01-01'), bookmarked: ['private-bookmark'] }
  ));
  await expectAllowed('public provider listing', () => getDocs(query(
    collection(requesterClient.db, 'providers'), where('publicSchemaVersion', '==', 1)
  )));
  await expectAllowed('anonymous user reads public provider', () => getDoc(doc(anonymousClient.db, 'providers', providerId)));
  await expectDenied('unfiltered provider listing', () => getDocs(collection(requesterClient.db, 'providers')));
  await expectDenied('non-owner cannot edit provider services', () => updateDoc(
    doc(outsiderClient.db, 'providers', providerId),
    { services: [{ id: 'attacker-service', name: 'Unauthorized service', price: '1' }] },
  ));
  await expectAllowed('owner synchronizes private, public, and provider names atomically', () => runTransaction(
    providerClient.db, async transaction => {
      const userRef = doc(providerClient.db, 'users', providerId);
      const providerRef = doc(providerClient.db, 'providers', providerId);
      await transaction.get(userRef);
      await transaction.get(providerRef);
      transaction.update(userRef, { firstName: 'Updated' });
      transaction.set(doc(providerClient.db, 'publicProfiles', providerId), {
        firstName: 'Updated', lastName: 'Provider', updatedAt: serverTimestamp(),
      });
      transaction.update(providerRef, { firstName: 'Updated', updatedAt: serverTimestamp() });
    }
  ));

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
        const requesterProfile = await transaction.get(doc(requesterClient.db, 'publicProfiles', requesterId));
        const providerProfile = await transaction.get(doc(requesterClient.db, 'publicProfiles', providerId));
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

  // The same requester now enrolls as a provider. No account/history is replaced.
  const accountRef = doc(requesterClient.db, 'users', requesterId);
  const accountBefore = (await getDoc(accountRef)).data();
  const invalidEnrollment = writeBatch(requesterClient.db);
  invalidEnrollment.set(doc(requesterClient.db, 'providers', requesterId), {
    publicSchemaVersion: 1, firstName: 'Test', lastName: 'Requester', services: [],
  });
  invalidEnrollment.update(accountRef, { role: 'both' });
  await expectDenied('invalid enrollment cannot partially promote the account', () => invalidEnrollment.commit());
  assert.equal((await getDoc(accountRef)).data().role, 'requester');
  assert.equal((await getDoc(doc(requesterClient.db, 'providers', requesterId))).exists(), false);
  const enrollment = writeBatch(requesterClient.db);
  enrollment.set(doc(requesterClient.db, 'providers', requesterId), {
    publicSchemaVersion: 1, firstName: 'Test', lastName: 'Requester',
    services: [{ id: 'requester-service', name: 'Second service', price: '2000' }],
  });
  enrollment.update(accountRef, { role: 'both', updatedAt: serverTimestamp() });
  await expectAllowed('existing requester enrolls as provider', () => enrollment.commit());
  const accountAfter = (await getDoc(accountRef)).data();
  assert.equal(accountAfter.role, 'both');
  for (const [key, value] of Object.entries(accountBefore)) {
    if (key !== 'role' && key !== 'updatedAt') assert.deepEqual(accountAfter[key], value, `${key} survives enrollment`);
  }
  await expectAllowed('provider can add a bookmark', () => updateDoc(accountRef, { bookmarked: arrayUnion(outsiderId) }));
  assert.deepEqual((await getDoc(accountRef)).data().bookmarked, [providerId, outsiderId]);
  await expectAllowed('provider can remove a bookmark', () => updateDoc(accountRef, { bookmarked: arrayRemove(outsiderId) }));
  assert.deepEqual((await getDoc(accountRef)).data().bookmarked, [providerId]);
  await expectAllowed('provider keeps notification registration', () => updateDoc(accountRef, { notificationTokens: arrayUnion('new-token') }));
  await expectAllowed('provider reads their old requester booking', () => getDoc(requesterBookingRef));
  await expectAllowed('provider lists their requester bookings', async () => {
    const bookings = await getDocs(query(collection(requesterClient.db, 'bookings'), where('requesterId', '==', requesterId)));
    assert.ok(bookings.docs.some(item => item.id === bookingId));
  });
  await expectAllowed('provider can book another provider', () => setDoc(doc(requesterClient.db, 'bookings', `after-enrollment-${runId}`), {
    requesterId, providerId, serviceId: 'service-1', status: 'pending',
    checklist: [{ id: 'one', description: 'New request', completed: false }],
    checklistTotal: 1, checklistCompletedCount: 0, checklistProgress: { one: false },
  }));
  await expectAllowed('provider keeps existing conversations', () => getDoc(conversationRef));
  await expectAllowed('provider continues an existing requester conversation', () => setDoc(
    doc(collection(requesterClient.db, 'conversations', conversationId, 'messages')),
    { conversationId, senderId: requesterId, text: 'Still the same account', createdAt: serverTimestamp() }
  ));
  await expectAllowed('provider can still edit their requester review', () => updateDoc(reviewRef, { comment: 'Updated after enrollment', updatedAt: serverTimestamp() }));
  await expectAllowed('provider can edit their business profile', () => updateDoc(doc(requesterClient.db, 'providers', requesterId), { bio: 'Updated business description' }));
  await expectDenied('other provider cannot read bookmarks after enrollment', () => getDoc(doc(providerClient.db, 'users', requesterId)));

  console.log('Firestore booking, messaging, and requester-to-provider capability checks passed.');
} finally {
  await deleteApp(providerClient.app);
  await deleteApp(requesterClient.app);
  await deleteApp(outsiderClient.app);
  await deleteApp(anonymousClient.app);
}
