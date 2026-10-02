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

function conversationPayload(participants, participantDetails) {
  return {
    participants,
    participantDetails,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastRead: {},
    typing: {},
  };
}

async function writeMessageWithSummary(
  db,
  conversationId,
  senderId,
  text,
  messageOverrides = {},
  summaryOverrides = {},
  summaryActorId = senderId,
) {
  const conversationRef = doc(db, 'conversations', conversationId);
  const messageRef = doc(collection(db, 'conversations', conversationId, 'messages'));
  const batch = writeBatch(db);
  batch.set(messageRef, {
    conversationId,
    senderId,
    text,
    createdAt: serverTimestamp(),
    ...messageOverrides,
  });
  batch.update(conversationRef, {
    lastMessage: messageRef,
    updatedAt: serverTimestamp(),
    [`lastRead.${summaryActorId}`]: serverTimestamp(),
    ...summaryOverrides,
  });
  await batch.commit();
  return messageRef;
}

async function seedAdminDocument(documentPath, fields) {
  const response = await fetch(
    `http://${emulatorHost}:${emulatorFirestorePort}/v1/projects/demo-rules/databases/(default)/documents/${documentPath}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer owner',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    }
  );
  if (!response.ok) {
    throw new Error(`Unable to seed ${documentPath}: ${response.status} ${await response.text()}`);
  }
}

async function deleteAdminDocument(documentPath) {
  const response = await fetch(
    `http://${emulatorHost}:${emulatorFirestorePort}/v1/projects/demo-rules/databases/(default)/documents/${documentPath}`,
    {
      method: 'DELETE',
      headers: { Authorization: 'Bearer owner' },
    }
  );
  if (!response.ok) {
    throw new Error(`Unable to delete ${documentPath}: ${response.status} ${await response.text()}`);
  }
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
    role: 'requester',
    verified: false,
    subscriptionType: 'free',
    bookmarked: ['private-bookmark'],
    notificationTokens: ['private-push-token'],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
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
    verified: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));

  await expectDenied('new account cannot self-verify', () => setDoc(doc(outsiderClient.db, 'users', outsiderId), {
    firstName: 'Unsafe', lastName: 'Account', phoneNumber: '', role: 'requester',
    verified: true, subscriptionType: 'free', bookmarked: [],
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }));
  await expectDenied('new account cannot claim a paid subscription', () => setDoc(doc(outsiderClient.db, 'users', outsiderId), {
    firstName: 'Unsafe', lastName: 'Account', phoneNumber: '', role: 'requester',
    verified: false, subscriptionType: 'enterprise', bookmarked: [],
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }));
  await expectDenied('new account cannot add unknown privileged fields', () => setDoc(doc(outsiderClient.db, 'users', outsiderId), {
    firstName: 'Unsafe', lastName: 'Account', phoneNumber: '', role: 'requester',
    verified: false, subscriptionType: 'free', bookmarked: [], admin: true,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }));

  await expectAllowed('requester edits account name before becoming a provider', () => runTransaction(
    requesterClient.db, async transaction => {
      const userRef = doc(requesterClient.db, 'users', requesterId);
      await transaction.get(userRef);
      const provider = await transaction.get(doc(requesterClient.db, 'providers', requesterId));
      assert.equal(provider.exists(), false);
      transaction.update(userRef, { firstName: 'Test', updatedAt: serverTimestamp() });
      transaction.set(doc(requesterClient.db, 'publicProfiles', requesterId), {
        firstName: 'Test', lastName: 'Requester',
      });
    }
  ));

  await expectDenied('unrelated user cannot read private account', () => getDoc(doc(outsiderClient.db, 'users', providerId)));
  await expectDenied('anonymous user cannot read private account', () => getDoc(doc(anonymousClient.db, 'users', providerId)));
  await expectAllowed('owner reads private account', () => getDoc(doc(providerClient.db, 'users', providerId)));
  await expectDenied('unrelated user cannot list accounts', () => getDocs(collection(outsiderClient.db, 'users')));
  await expectDenied('owner cannot orphan account data with a document-only delete', () => deleteDoc(
    doc(requesterClient.db, 'users', requesterId)
  ));
  await expectDenied('owner cannot self-verify', () => updateDoc(
    doc(requesterClient.db, 'users', requesterId), { verified: true, updatedAt: serverTimestamp() }
  ));
  await expectDenied('owner cannot assign a paid subscription', () => updateDoc(
    doc(requesterClient.db, 'users', requesterId), { subscriptionType: 'premium', updatedAt: serverTimestamp() }
  ));
  await expectDenied('requester cannot change role without provider enrollment', () => updateDoc(
    doc(requesterClient.db, 'users', requesterId), { role: 'both', updatedAt: serverTimestamp() }
  ));
  await expectDenied('owner cannot add an unrecognized account field', () => updateDoc(
    doc(requesterClient.db, 'users', requesterId), { isAdmin: true, updatedAt: serverTimestamp() }
  ));
  await expectAllowed('provider public identity creation', () => setDoc(doc(providerClient.db, 'publicProfiles', providerId), {
    firstName: 'Test', lastName: 'Provider', avatar: 'https://example.test/provider.png',
  }));
  await expectAllowed('requester public identity creation', () => setDoc(doc(requesterClient.db, 'publicProfiles', requesterId), {
    firstName: 'Test', lastName: 'Requester',
  }));
  await expectAllowed('unrelated user reads public identity', () => getDoc(doc(outsiderClient.db, 'publicProfiles', providerId)));
  await expectAllowed('anonymous user reads public identity', () => getDoc(doc(anonymousClient.db, 'publicProfiles', providerId)));
  await expectDenied('unrelated user cannot list public identities', () => getDocs(collection(outsiderClient.db, 'publicProfiles')));
  await expectDenied('anonymous user cannot list public identities', () => getDocs(collection(anonymousClient.db, 'publicProfiles')));
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
    batch.update(doc(providerClient.db, 'users', providerId), {
      role: 'both', updatedAt: serverTimestamp(),
    });
    return batch.commit();
  });
  await expectDenied('provider cannot downgrade or rewrite their account role', () => updateDoc(
    doc(providerClient.db, 'users', providerId), { role: 'requester', updatedAt: serverTimestamp() }
  ));

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
      const publicProfileRef = doc(providerClient.db, 'publicProfiles', providerId);
      await transaction.get(userRef);
      await transaction.get(providerRef);
      const publicProfile = await transaction.get(publicProfileRef);
      transaction.update(userRef, { firstName: 'Updated', updatedAt: serverTimestamp() });
      transaction.set(publicProfileRef, {
        firstName: 'Updated', lastName: 'Provider', avatar: publicProfile.data().avatar,
        updatedAt: serverTimestamp(),
      });
      transaction.update(providerRef, { firstName: 'Updated', updatedAt: serverTimestamp() });
    }
  ));
  assert.equal((await getDoc(doc(providerClient.db, 'publicProfiles', providerId))).data().avatar, 'https://example.test/provider.png');

  const earningId = `earning-${runId}`;
  await seedAdminDocument(`earnings/${earningId}`, {
    providerId: { stringValue: providerId },
    amount: { integerValue: '1000' },
  });
  const earningRef = doc(providerClient.db, 'earnings', earningId);
  await expectAllowed('earnings owner reads their record', () => getDoc(earningRef));
  await expectDenied('unrelated user cannot read earnings', () => getDoc(doc(outsiderClient.db, 'earnings', earningId)));
  await expectDenied('anonymous user cannot read earnings', () => getDoc(doc(anonymousClient.db, 'earnings', earningId)));
  await expectAllowed('earnings owner queries their records', () => getDocs(query(
    collection(providerClient.db, 'earnings'), where('providerId', '==', providerId)
  )));
  await expectDenied('unrelated user cannot query provider earnings', () => getDocs(query(
    collection(outsiderClient.db, 'earnings'), where('providerId', '==', providerId)
  )));

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
  const participants = [providerId, requesterId].sort();
  const participantDetails = {
    [requesterId]: { name: 'Test Requester', avatar: '' },
    [providerId]: { name: 'Updated Provider', avatar: 'https://example.test/provider.png' },
  };
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
        transaction.set(conversationRef, conversationPayload(participants, participantDetails));
      }
    },
  ));
  await expectDenied('conversation cannot contain the same participant twice', () => setDoc(
    doc(requesterClient.db, 'conversations', `${requesterId}_${requesterId}`),
    conversationPayload(
      [requesterId, requesterId],
      { [requesterId]: { name: 'Test Requester', avatar: '' } },
    ),
  ));
  await expectDenied('conversation ID must match its participants', () => setDoc(
    doc(requesterClient.db, 'conversations', `arbitrary-${runId}`),
    conversationPayload(participants, participantDetails),
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
  await expectAllowed('requester updates own read status', () => updateDoc(conversationRef, {
    [`lastRead.${requesterId}`]: serverTimestamp(),
  }));
  const providerConversationRef = doc(providerClient.db, 'conversations', conversationId);
  await expectAllowed('provider updates own typing status', () => updateDoc(providerConversationRef, {
    [`typing.${providerId}`]: true,
  }));
  await expectDenied('requester cannot change provider read status', () => updateDoc(conversationRef, {
    [`lastRead.${providerId}`]: serverTimestamp(),
  }));
  await expectDenied('provider cannot change requester typing status', () => updateDoc(providerConversationRef, {
    [`typing.${requesterId}`]: true,
  }));
  await expectDenied('participant details cannot be fabricated after creation', () => updateDoc(conversationRef, {
    [`participantDetails.${providerId}.name`]: 'Impersonated Provider',
  }));

  const standaloneMessageRef = doc(collection(requesterClient.db, 'conversations', conversationId, 'messages'));
  await expectDenied('message requires a matching conversation summary update', () => setDoc(
    standaloneMessageRef,
    { conversationId, senderId: requesterId, text: 'Orphan message', createdAt: serverTimestamp() },
  ));
  await expectDenied('message text cannot be empty', () => writeMessageWithSummary(
    requesterClient.db, conversationId, requesterId, '',
  ));
  await expectDenied('message text cannot contain only whitespace', () => writeMessageWithSummary(
    requesterClient.db, conversationId, requesterId, '   ',
  ));
  await expectDenied('message must name its parent conversation', () => writeMessageWithSummary(
    requesterClient.db,
    conversationId,
    requesterId,
    'Wrong parent',
    { conversationId: `different-${conversationId}` },
  ));
  await expectDenied('message sender cannot be forged', () => writeMessageWithSummary(
    requesterClient.db,
    conversationId,
    providerId,
    'Forged sender',
    {},
    {},
    requesterId,
  ));
  await expectDenied('message timestamp must be server-authored', () => writeMessageWithSummary(
    requesterClient.db,
    conversationId,
    requesterId,
    'Wrong timestamp',
    { createdAt: new Date('2020-01-01') },
  ));
  await expectDenied('message cannot add unreviewed fields', () => writeMessageWithSummary(
    requesterClient.db,
    conversationId,
    requesterId,
    'Unexpected payload',
    { isAdmin: true },
  ));
  const missingSummaryMessageRef = doc(
    requesterClient.db,
    'conversations',
    conversationId,
    'messages',
    `missing-summary-${runId}`,
  );
  await expectDenied('conversation summary cannot point to a missing message', () => updateDoc(
    conversationRef,
    {
      lastMessage: missingSummaryMessageRef,
      updatedAt: serverTimestamp(),
      [`lastRead.${requesterId}`]: serverTimestamp(),
    },
  ));
  await expectDenied('conversation summary cannot point outside its message collection', () => {
    const unrelatedRef = doc(requesterClient.db, 'referrals', `spoofed-message-${runId}`);
    const batch = writeBatch(requesterClient.db);
    batch.set(unrelatedRef, {
      referrerId: requesterId,
      conversationId,
      senderId: requesterId,
      createdAt: serverTimestamp(),
    });
    batch.update(conversationRef, {
      lastMessage: unrelatedRef,
      updatedAt: serverTimestamp(),
      [`lastRead.${requesterId}`]: serverTimestamp(),
    });
    return batch.commit();
  });

  let requesterMessageRef;
  await expectAllowed('requester sends message atomically', async () => {
    requesterMessageRef = await writeMessageWithSummary(
      requesterClient.db,
      conversationId,
      requesterId,
      'Hello provider',
    );
  });
  await expectAllowed('provider sends message atomically', () => writeMessageWithSummary(
    providerClient.db,
    conversationId,
    providerId,
    'Hello requester',
  ));
  await expectDenied('conversation summary cannot be rolled back to an old message', () => updateDoc(
    conversationRef,
    {
      lastMessage: requesterMessageRef,
      updatedAt: serverTimestamp(),
      [`lastRead.${requesterId}`]: serverTimestamp(),
    },
  ));

  const legacyConversationId = `legacy-${conversationId}`;
  await seedAdminDocument(`conversations/${legacyConversationId}`, {
    participants: {
      arrayValue: { values: participants.map(value => ({ stringValue: value })) },
    },
    participantDetails: {
      mapValue: {
        fields: {
          [requesterId]: {
            mapValue: {
              fields: {
                name: { stringValue: 'Test Requester' },
                avatar: { stringValue: '' },
              },
            },
          },
          [providerId]: {
            mapValue: {
              fields: {
                name: { stringValue: 'Updated Provider' },
                avatar: { stringValue: 'https://example.test/provider.png' },
              },
            },
          },
        },
      },
    },
    createdAt: { timestampValue: '2026-01-01T00:00:00Z' },
    updatedAt: { timestampValue: '2026-01-01T00:00:00Z' },
  });
  const legacyRequesterRef = doc(requesterClient.db, 'conversations', legacyConversationId);
  await expectAllowed('legacy conversation can initialize caller read status', () => updateDoc(
    legacyRequesterRef,
    { [`lastRead.${requesterId}`]: serverTimestamp() },
  ));
  await expectAllowed('legacy conversation can initialize caller typing status', () => updateDoc(
    legacyRequesterRef,
    { [`typing.${requesterId}`]: true },
  ));
  await expectAllowed('legacy conversation supports secure atomic messages', () => writeMessageWithSummary(
    requesterClient.db,
    legacyConversationId,
    requesterId,
    'Legacy chat still works',
  ));

  await expectAllowed('outsider public identity creation for first-contact tests', () => setDoc(
    doc(outsiderClient.db, 'publicProfiles', outsiderId),
    { firstName: 'Test', lastName: 'Outsider' },
  ));
  const firstContactParticipants = [requesterId, outsiderId].sort();
  const firstContactId = firstContactParticipants.join('_');
  const firstContactDetails = {
    [requesterId]: { name: 'Test Requester', avatar: '' },
    [outsiderId]: { name: 'Test Outsider', avatar: '' },
  };
  const firstContactRequesterRef = doc(requesterClient.db, 'conversations', firstContactId);
  const firstContactOutsiderRef = doc(outsiderClient.db, 'conversations', firstContactId);
  await expectDenied('conversation cannot use fabricated participant identity', () => setDoc(
    firstContactRequesterRef,
    conversationPayload(firstContactParticipants, {
      ...firstContactDetails,
      [outsiderId]: { name: 'Fabricated Name', avatar: '' },
    }),
  ));
  const missingParticipantId = `missing-user-${runId}`;
  const missingProfileParticipants = [requesterId, missingParticipantId].sort();
  await expectDenied('new conversation requires both public identities', () => setDoc(
    doc(requesterClient.db, 'conversations', missingProfileParticipants.join('_')),
    conversationPayload(missingProfileParticipants, {
      [requesterId]: { name: 'Test Requester', avatar: '' },
      [missingParticipantId]: { name: 'Missing User', avatar: '' },
    }),
  ));
  const firstContactResults = await Promise.allSettled([
    setDoc(
      firstContactRequesterRef,
      conversationPayload(firstContactParticipants, firstContactDetails),
    ),
    setDoc(
      firstContactOutsiderRef,
      conversationPayload([...firstContactParticipants].reverse(), firstContactDetails),
    ),
  ]);
  assert.equal(
    firstContactResults.filter(result => result.status === 'fulfilled').length,
    1,
    'exactly one simultaneous first-contact creation should succeed',
  );
  await deleteAdminDocument(`publicProfiles/${outsiderId}`);
  await expectAllowed('existing conversation survives a missing participant profile', () => getDoc(
    firstContactRequesterRef,
  ));
  await expectAllowed('existing participants can message after a public profile is removed', () => writeMessageWithSummary(
    requesterClient.db,
    firstContactId,
    requesterId,
    'Existing conversation remains usable',
  ));

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
  await expectAllowed('provider can add a bookmark', () => updateDoc(accountRef, {
    bookmarked: arrayUnion(outsiderId), updatedAt: serverTimestamp(),
  }));
  assert.deepEqual((await getDoc(accountRef)).data().bookmarked, [providerId, outsiderId]);
  await expectAllowed('provider can remove a bookmark', () => updateDoc(accountRef, {
    bookmarked: arrayRemove(outsiderId), updatedAt: serverTimestamp(),
  }));
  assert.deepEqual((await getDoc(accountRef)).data().bookmarked, [providerId]);
  await expectAllowed('provider keeps notification registration', () => updateDoc(accountRef, {
    notificationTokens: arrayUnion('new-token'), updatedAt: serverTimestamp(),
  }));
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
  await expectAllowed('provider continues an existing requester conversation', () => writeMessageWithSummary(
    requesterClient.db,
    conversationId,
    requesterId,
    'Still the same account',
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
