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

async function writeProviderServicesInBatches(db, providerId, services, batchSize = 5) {
  for (let start = 0; start < services.length; start += batchSize) {
    const batch = writeBatch(db);
    services.slice(start, start + batchSize).forEach((service) => {
      batch.set(doc(db, 'providers', providerId, 'services', service.id), service);
    });
    await batch.commit();
  }
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

async function writeStatusTransitionWithEvent(
  db,
  bookingRef,
  eventId,
  toStatus,
  event,
  extraFields = {},
) {
  const batch = writeBatch(db);
  batch.update(bookingRef, {
    status: toStatus,
    latestTransitionId: eventId,
    updatedAt: serverTimestamp(),
    ...extraFields,
  });
  batch.set(doc(db, 'bookings', bookingRef.id, 'events', eventId), event);
  await batch.commit();
}

async function editPendingBooking(db, bookingRef, updates) {
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(bookingRef);
    if (!snapshot.exists()) throw new Error('booking not found');
    if (snapshot.data().status !== 'pending') throw new Error('booking is no longer pending');
    transaction.update(bookingRef, { ...updates, updatedAt: serverTimestamp() });
  });
}

async function createReviewWithClaim(db, reviewRef, reviewData) {
  const claimRef = doc(db, 'reviewBookingClaims', reviewData.bookingId);
  await runTransaction(db, async transaction => {
    const review = await transaction.get(reviewRef);
    const claim = await transaction.get(claimRef);
    if (review.exists() || claim.exists()) throw new Error('booking already reviewed');
    transaction.set(reviewRef, reviewData);
    transaction.set(claimRef, {
      bookingId: reviewData.bookingId,
      reviewId: reviewRef.id,
      requesterId: reviewData.requesterId,
      createdAt: serverTimestamp(),
    });
  });
}

async function writeHelpfulVote(db, reviewId, voterId, currentCount, add) {
  const voteRef = doc(db, 'reviews', reviewId, 'helpfulVotes', voterId);
  const reviewRef = doc(db, 'reviews', reviewId);
  const batch = writeBatch(db);
  if (add) {
    batch.set(voteRef, { reviewId, voterId, createdAt: serverTimestamp() });
  } else {
    batch.delete(voteRef);
  }
  batch.update(reviewRef, {
    isHelpful: currentCount + (add ? 1 : -1),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
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

  const providerService = { id: 'service-1', name: 'Test Service', description: '', price: '1000', availability: null };
  await expectAllowed('provider creates a private catalogue draft', () => setDoc(
    doc(providerClient.db, 'providers', providerId), {
      publicSchemaVersion: 0,
      firstName: 'Test',
      lastName: 'Provider',
      services: [providerService],
      serviceIds: { [providerService.id]: true },
      location: { country: 'BF', city: 'Ouagadougou', coordinates: { latitude: 12.35, longitude: -1.23 } },
    },
  ));
  await expectDenied('anonymous user cannot read a provider catalogue draft', () => getDoc(
    doc(anonymousClient.db, 'providers', providerId),
  ));
  await expectAllowed('provider writes the authoritative draft service', () => setDoc(
    doc(providerClient.db, 'providers', providerId, 'services', providerService.id), providerService,
  ));
  await expectAllowed('provider publishes the catalogue and promotes the account together', () => {
    const batch = writeBatch(providerClient.db);
    batch.update(doc(providerClient.db, 'providers', providerId), {
      publicSchemaVersion: 1,
      updatedAt: serverTimestamp(),
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
  await expectDenied('provider cannot publish an invalid authoritative service', () => setDoc(
    doc(providerClient.db, 'providers', providerId, 'services', 'invalid-service'),
    { id: 'invalid-service', name: '', description: '', price: '-1', availability: null },
  ));
  await expectDenied('unrelated user cannot publish a provider service', () => setDoc(
    doc(outsiderClient.db, 'providers', providerId, 'services', 'outsider-service'),
    { id: 'outsider-service', name: 'Forged', description: '', price: '1', availability: null },
  ));
  await expectDenied('provider cannot delete a service still published in the profile', () => deleteDoc(
    doc(providerClient.db, 'providers', providerId, 'services', providerService.id),
  ));
  await expectAllowed('provider updates service projection and authority atomically', () => {
    const updatedService = { ...providerService, description: 'Updated service description' };
    const batch = writeBatch(providerClient.db);
    batch.update(doc(providerClient.db, 'providers', providerId), {
      services: [updatedService],
      serviceIds: { [updatedService.id]: true },
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(providerClient.db, 'providers', providerId, 'services', providerService.id), updatedService);
    return batch.commit();
  });
  const maximumProviderServices = Array.from({ length: 20 }, (_, index) => ({
    id: `service-${index + 1}`,
    name: index === 0 ? providerService.name : `Service ${index + 1}`,
    description: index === 0 ? 'Updated service description' : '',
    price: String(1000 + index),
    availability: null,
  }));
  await expectAllowed('provider stages the 20-service boundary privately', () => updateDoc(
    doc(providerClient.db, 'providers', providerId), {
      services: maximumProviderServices,
      serviceIds: Object.fromEntries(maximumProviderServices.map((service) => [service.id, true])),
      publicSchemaVersion: 0,
      updatedAt: serverTimestamp(),
    },
  ));
  await expectDenied('anonymous user cannot read a staged catalogue update', () => getDoc(
    doc(anonymousClient.db, 'providers', providerId),
  ));
  await expectAllowed('provider writes 20 authoritative services in bounded batches', () => (
    writeProviderServicesInBatches(providerClient.db, providerId, maximumProviderServices)
  ));
  await expectAllowed('provider publishes the completed 20-service catalogue', () => updateDoc(
    doc(providerClient.db, 'providers', providerId), {
      publicSchemaVersion: 1,
      updatedAt: serverTimestamp(),
    },
  ));
  await expectDenied('provider cannot stage more than 20 services', () => {
    const overflowServices = [
      ...maximumProviderServices,
      { id: 'service-21', name: 'Service 21', description: '', price: '1020', availability: null },
    ];
    return updateDoc(doc(providerClient.db, 'providers', providerId), {
      services: overflowServices,
      serviceIds: Object.fromEntries(overflowServices.map((service) => [service.id, true])),
      publicSchemaVersion: 0,
      updatedAt: serverTimestamp(),
    });
  });
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

  const orphanProviderId = `orphan-provider-${runId}`;
  await seedAdminDocument(`providers/${orphanProviderId}/services/orphan-service`, {
    id: { stringValue: 'orphan-service' },
    name: { stringValue: 'Orphan Service' },
    description: { stringValue: '' },
    price: { stringValue: '1000' },
  });
  await expectDenied('service is not public without its parent provider', () => getDoc(
    doc(anonymousClient.db, 'providers', orphanProviderId, 'services', 'orphan-service'),
  ));

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
  const validBookingPayload = {
    requesterId,
    requesterName: 'Test Requester',
    providerId,
    providerName: 'Test Provider',
    serviceId: 'service-1',
    serviceName: 'Test Service',
    bookingDate: new Date(Date.now() + 60 * 60 * 1000),
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
  };
  await expectAllowed('booking creation', () => setDoc(requesterBookingRef, validBookingPayload));

  const hostileBookingRef = (label) => doc(requesterClient.db, 'bookings', `${label}-${runId}`);
  await expectDenied('self-booking is rejected', () => setDoc(
    doc(providerClient.db, 'bookings', `self-${runId}`),
    { ...validBookingPayload, requesterId: providerId },
  ));
  await expectDenied('booking for a nonexistent provider service is rejected', () => setDoc(
    hostileBookingRef('missing-service'),
    { ...validBookingPayload, serviceId: 'missing-service', serviceName: 'Missing' },
  ));
  await expectDenied('booking cannot target an orphaned provider service', () => setDoc(
    hostileBookingRef('orphan-service'),
    {
      ...validBookingPayload,
      providerId: orphanProviderId,
      providerName: 'Deleted Provider',
      serviceId: 'orphan-service',
      serviceName: 'Orphan Service',
    },
  ));
  await expectDenied('booking cannot forge the selected service name', () => setDoc(
    hostileBookingRef('forged-service-name'),
    { ...validBookingPayload, serviceName: 'Impersonated service' },
  ));
  await expectDenied('booking cannot contain a negative price', () => setDoc(
    hostileBookingRef('negative-price'),
    { ...validBookingPayload, price: -1 },
  ));
  await expectDenied('booking cannot contain a fractional price', () => setDoc(
    hostileBookingRef('fractional-price'),
    { ...validBookingPayload, price: 10.5 },
  ));
  await expectDenied('booking price cannot exceed the supported CFA range', () => setDoc(
    hostileBookingRef('excessive-price'),
    { ...validBookingPayload, price: 1_000_000_000 },
  ));
  await expectDenied('booking must preserve the minimum scheduling lead time', () => setDoc(
    hostileBookingRef('too-soon'),
    { ...validBookingPayload, bookingDate: new Date(Date.now() + 60_000) },
  ));
  await expectDenied('booking cannot be created in the past', () => setDoc(
    hostileBookingRef('past-date'),
    { ...validBookingPayload, bookingDate: new Date(Date.now() - 60_000) },
  ));
  await expectDenied('booking cannot exceed the scheduling horizon', () => setDoc(
    hostileBookingRef('far-date'),
    { ...validBookingPayload, bookingDate: new Date(Date.now() + 366 * 24 * 60 * 60 * 1000) },
  ));
  await expectDenied('booking cannot add unrecognized fields', () => setDoc(
    hostileBookingRef('extra-field'),
    { ...validBookingPayload, paid: true },
  ));
  await expectDenied('booking cannot contain malformed checklist items', () => setDoc(
    hostileBookingRef('malformed-checklist'),
    { ...validBookingPayload, checklist: [null], checklistProgress: { 'item-1': false } },
  ));
  await expectDenied('booking checklist IDs and progress must match', () => setDoc(
    hostileBookingRef('forged-checklist'),
    {
      ...validBookingPayload,
      checklist: [{ id: 'forged', description: 'Forged item', completed: false }],
      checklistProgress: { forged: false },
    },
  ));
  await expectDenied('pending booking edit cannot set a negative price', () => updateDoc(
    requesterBookingRef,
    { price: -1, updatedAt: serverTimestamp() },
  ));
  await expectDenied('pending booking edit cannot switch to an unpublished service', () => updateDoc(
    requesterBookingRef,
    { serviceId: 'missing-service', serviceName: 'Missing', updatedAt: serverTimestamp() },
  ));

  await expectAllowed('requester edits current pending booking terms', () => editPendingBooking(
    requesterClient.db,
    requesterBookingRef,
    { notes: 'Updated before acceptance', price: 1100 },
  ));
  await expectDenied('provider cannot edit requester booking terms', () => updateDoc(
    providerBookingRef,
    { notes: 'Provider-authored terms', updatedAt: serverTimestamp() },
  ));
  await expectDenied('unrelated user cannot edit booking terms', () => updateDoc(
    doc(outsiderClient.db, 'bookings', bookingId),
    { notes: 'Outsider-authored terms', updatedAt: serverTimestamp() },
  ));

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
  await expectDenied('accepted booking terms cannot be overwritten', () => updateDoc(
    requesterBookingRef,
    { notes: 'Attempted stale edit', updatedAt: serverTimestamp() },
  ));

  const editRaceId = `edit-race-${runId}`;
  const editRaceRequesterRef = doc(requesterClient.db, 'bookings', editRaceId);
  const editRaceProviderRef = doc(providerClient.db, 'bookings', editRaceId);
  await expectAllowed('edit-race booking creation', () => setDoc(editRaceRequesterRef, {
    ...validBookingPayload,
    notes: 'Original terms',
  }));
  const editRaceResults = await Promise.allSettled([
    editPendingBooking(requesterClient.db, editRaceRequesterRef, { notes: 'Requester edit' }),
    writeStatusTransition(
      providerClient.db,
      editRaceProviderRef,
      'edit-race-accepted',
      'pending',
      'confirmed',
      providerId,
      'provider',
    ),
  ]);
  assert.equal(editRaceResults[1].status, 'fulfilled', 'provider acceptance should succeed');
  const editRaceSnapshot = await getDoc(editRaceRequesterRef);
  assert.equal(editRaceSnapshot.data().status, 'confirmed');
  assert.equal(
    editRaceSnapshot.data().notes,
    editRaceResults[0].status === 'fulfilled' ? 'Requester edit' : 'Original terms',
    'an accepted booking must contain either the committed edit or the original terms, never a later overwrite',
  );

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
  await expectDenied('requester cannot reuse an older event for a new transition', () => updateDoc(
    requesterBookingRef,
    {
      status: 'in_progress',
      latestTransitionId: 'event-confirmed',
      requesterChangeRequest: 'This update must create its own audit event.',
      updatedAt: serverTimestamp(),
    }
  ));
  await expectDenied('status transition without an event', () => updateDoc(
    requesterBookingRef,
    {
      status: 'in_progress',
      latestTransitionId: 'event-missing',
      requesterChangeRequest: 'Please finish the remaining detail.',
      updatedAt: serverTimestamp(),
    }
  ));
  await expectDenied('transition event with mismatched previous status', () => writeStatusTransition(
    requesterClient.db, requesterBookingRef, 'event-wrong-from', 'confirmed', 'in_progress', requesterId, 'requester', {
      requesterChangeRequest: 'Please finish the remaining detail.',
    }
  ));
  await expectDenied('transition event with mismatched target status', () => writeStatusTransitionWithEvent(
    requesterClient.db,
    requesterBookingRef,
    'event-wrong-to',
    'in_progress',
    {
      fromStatus: 'awaiting_confirmation',
      toStatus: 'completed',
      actorId: requesterId,
      actorRole: 'requester',
      occurredAt: serverTimestamp(),
    },
    { requesterChangeRequest: 'Please finish the remaining detail.' },
  ));
  await expectDenied('transition event with mismatched actor', () => writeStatusTransition(
    requesterClient.db, requesterBookingRef, 'event-wrong-actor', 'awaiting_confirmation', 'in_progress', providerId, 'requester', {
      requesterChangeRequest: 'Please finish the remaining detail.',
    }
  ));
  await expectDenied('transition event with mismatched actor role', () => writeStatusTransition(
    requesterClient.db, requesterBookingRef, 'event-wrong-role', 'awaiting_confirmation', 'in_progress', requesterId, 'provider', {
      requesterChangeRequest: 'Please finish the remaining detail.',
    }
  ));
  await expectDenied('transition event with a client timestamp', () => writeStatusTransitionWithEvent(
    requesterClient.db,
    requesterBookingRef,
    'event-wrong-time',
    'in_progress',
    {
      fromStatus: 'awaiting_confirmation',
      toStatus: 'in_progress',
      actorId: requesterId,
      actorRole: 'requester',
      occurredAt: new Date('2020-01-01'),
    },
    { requesterChangeRequest: 'Please finish the remaining detail.' },
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

  const standaloneEventRef = doc(
    requesterClient.db,
    'bookings',
    bookingId,
    'events',
    'event-standalone',
  );
  await expectDenied('standalone transition event', () => setDoc(standaloneEventRef, {
    fromStatus: 'completed',
    toStatus: 'cancelled',
    actorId: requesterId,
    actorRole: 'requester',
    occurredAt: serverTimestamp(),
  }));

  const crossBookingId = `cross-booking-${runId}`;
  const crossRequesterBookingRef = doc(requesterClient.db, 'bookings', crossBookingId);
  const crossProviderBookingRef = doc(providerClient.db, 'bookings', crossBookingId);
  await expectAllowed('cross-reference test booking creation', () => setDoc(crossRequesterBookingRef, {
    requesterId,
    requesterName: 'Test Requester',
    providerId,
    providerName: 'Test Provider',
    serviceId: 'service-1',
    serviceName: 'Test Service',
    bookingDate: new Date(Date.now() + 60 * 60 * 1000),
    price: 1000,
    notes: null,
    status: 'pending',
    checklist: [{ id: 'item-1', description: 'Cross-reference test', completed: false }],
    checklistTotal: 1,
    checklistCompletedCount: 0,
    checklistProgress: { 'item-1': false },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  await expectAllowed('cross-reference test booking acceptance', () => writeStatusTransition(
    providerClient.db,
    crossProviderBookingRef,
    'cross-booking-event',
    'pending',
    'confirmed',
    providerId,
    'provider',
  ));
  await expectDenied('event from another booking cannot authorize a transition', () => updateDoc(
    crossProviderBookingRef,
    {
      status: 'in_progress',
      latestTransitionId: 'event-started',
      updatedAt: serverTimestamp(),
    },
  ));

  const concurrentBookingId = `concurrent-booking-${runId}`;
  const concurrentRequesterBookingRef = doc(requesterClient.db, 'bookings', concurrentBookingId);
  const concurrentProviderBookingRef = doc(providerClient.db, 'bookings', concurrentBookingId);
  await expectAllowed('concurrency test booking creation', () => setDoc(concurrentRequesterBookingRef, {
    requesterId,
    requesterName: 'Test Requester',
    providerId,
    providerName: 'Test Provider',
    serviceId: 'service-1',
    serviceName: 'Test Service',
    bookingDate: new Date(Date.now() + 60 * 60 * 1000),
    price: 1000,
    notes: null,
    status: 'pending',
    checklist: [{ id: 'item-1', description: 'Concurrency test', completed: false }],
    checklistTotal: 1,
    checklistCompletedCount: 0,
    checklistProgress: { 'item-1': false },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  await expectAllowed('concurrency test booking acceptance', () => writeStatusTransition(
    providerClient.db,
    concurrentProviderBookingRef,
    'concurrent-accepted',
    'pending',
    'confirmed',
    providerId,
    'provider',
  ));
  const concurrentResults = await Promise.allSettled([
    writeStatusTransition(
      providerClient.db,
      concurrentProviderBookingRef,
      'concurrent-start-a',
      'confirmed',
      'in_progress',
      providerId,
      'provider',
    ),
    writeStatusTransition(
      providerClient.db,
      concurrentProviderBookingRef,
      'concurrent-start-b',
      'confirmed',
      'in_progress',
      providerId,
      'provider',
    ),
  ]);
  assert.equal(
    concurrentResults.filter(result => result.status === 'fulfilled').length,
    1,
    'exactly one concurrent status transition should succeed',
  );
  const concurrentEvents = await getDocs(collection(
    providerClient.db,
    'bookings',
    concurrentBookingId,
    'events',
  ));
  assert.equal(concurrentEvents.size, 2, 'accepted and started events should be the complete history');

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
    responseUpdatedAt: null,
    isHelpful: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await expectAllowed('requester can check their own absent review claim', async () => {
    const snapshot = await getDoc(doc(requesterClient.db, 'reviewBookingClaims', bookingId));
    assert.equal(snapshot.exists(), false);
  });
  await expectDenied('outsider cannot inspect another booking review claim', () => getDoc(
    doc(outsiderClient.db, 'reviewBookingClaims', bookingId),
  ));
  await expectDenied('review cannot be created without its immutable booking claim', () => setDoc(reviewRef, reviewData));
  await expectAllowed('requester atomically creates booking review and claim', () => createReviewWithClaim(
    requesterClient.db,
    reviewRef,
    reviewData,
  ));
  await expectAllowed('requester can read their immutable review claim', () => getDoc(
    doc(requesterClient.db, 'reviewBookingClaims', bookingId),
  ));
  await expectDenied('review claims cannot be listed', () => getDocs(
    collection(requesterClient.db, 'reviewBookingClaims'),
  ));
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
    { responses: [{ text: 'Thank you for the feedback.' }], responseUpdatedAt: serverTimestamp(), updatedAt: serverTimestamp() },
  ));
  await expectAllowed('provider edits their single response', () => updateDoc(
    doc(providerClient.db, 'reviews', bookingId),
    { responses: [{ text: 'Thank you — we appreciate the updated feedback.' }], responseUpdatedAt: serverTimestamp(), updatedAt: serverTimestamp() },
  ));
  await expectDenied('requester cannot impersonate provider response', () => updateDoc(
    reviewRef,
    { responses: [{ text: 'Forged response' }], responseUpdatedAt: serverTimestamp(), updatedAt: serverTimestamp() },
  ));
  await expectDenied('unrelated user cannot publish a provider response', () => updateDoc(
    doc(outsiderClient.db, 'reviews', bookingId),
    { responses: [{ text: 'Unrelated response' }], responseUpdatedAt: serverTimestamp(), updatedAt: serverTimestamp() },
  ));
  await expectDenied('provider cannot create a public response thread', () => updateDoc(
    doc(providerClient.db, 'reviews', bookingId),
    {
      responses: [{ text: 'First response' }, { text: 'Second response' }],
      responseUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  ));
  await expectDenied('provider response cannot exceed the length limit', () => updateDoc(
    doc(providerClient.db, 'reviews', bookingId),
    { responses: [{ text: 'x'.repeat(501) }], responseUpdatedAt: serverTimestamp(), updatedAt: serverTimestamp() },
  ));
  await expectDenied('provider response cannot inject client-authored metadata', () => updateDoc(
    doc(providerClient.db, 'reviews', bookingId),
    { responses: [{ text: 'Response', date: new Date() }], responseUpdatedAt: serverTimestamp(), updatedAt: serverTimestamp() },
  ));
  await expectDenied('helpful count cannot change without a private vote record', () => updateDoc(
    doc(outsiderClient.db, 'reviews', bookingId),
    { isHelpful: 1, updatedAt: serverTimestamp() },
  ));
  await expectDenied('private vote cannot be created without its matching count update', () => setDoc(
    doc(outsiderClient.db, 'reviews', bookingId, 'helpfulVotes', outsiderId),
    { reviewId: bookingId, voterId: outsiderId, createdAt: serverTimestamp() },
  ));
  await expectAllowed('voter can check their own absent vote', async () => {
    const snapshot = await getDoc(doc(outsiderClient.db, 'reviews', bookingId, 'helpfulVotes', outsiderId));
    assert.equal(snapshot.exists(), false);
  });
  await expectDenied('review author cannot vote on own review', () => writeHelpfulVote(
    requesterClient.db,
    bookingId,
    requesterId,
    0,
    true,
  ));
  await expectDenied('reviewed provider cannot vote on the review', () => writeHelpfulVote(
    providerClient.db,
    bookingId,
    providerId,
    0,
    true,
  ));
  await expectDenied('voter cannot forge another voter identity', () => writeHelpfulVote(
    outsiderClient.db,
    bookingId,
    providerId,
    0,
    true,
  ));
  await expectAllowed('outsider casts one private helpful vote', () => writeHelpfulVote(
    outsiderClient.db,
    bookingId,
    outsiderId,
    0,
    true,
  ));
  await expectAllowed('voter can read their own private vote', async () => {
    const snapshot = await getDoc(doc(outsiderClient.db, 'reviews', bookingId, 'helpfulVotes', outsiderId));
    assert.equal(snapshot.exists(), true);
  });
  await expectDenied('review author cannot read another user vote', () => getDoc(
    doc(requesterClient.db, 'reviews', bookingId, 'helpfulVotes', outsiderId),
  ));
  await expectDenied('private voter records cannot be listed', () => getDocs(
    collection(outsiderClient.db, 'reviews', bookingId, 'helpfulVotes'),
  ));
  await expectDenied('voter cannot reset the helpful count without deleting their vote', () => updateDoc(
    doc(outsiderClient.db, 'reviews', bookingId),
    { isHelpful: 0, updatedAt: serverTimestamp() },
  ));
  await expectDenied('duplicate helpful vote cannot inflate the count', () => writeHelpfulVote(
    outsiderClient.db,
    bookingId,
    outsiderId,
    1,
    true,
  ));
  await expectAllowed('outsider removes only their own helpful vote', () => writeHelpfulVote(
    outsiderClient.db,
    bookingId,
    outsiderId,
    1,
    false,
  ));
  const concurrentVotes = await Promise.allSettled([
    writeHelpfulVote(outsiderClient.db, bookingId, outsiderId, 0, true),
    writeHelpfulVote(outsiderClient.db, bookingId, outsiderId, 0, true),
  ]);
  assert.equal(
    concurrentVotes.filter(result => result.status === 'fulfilled').length,
    1,
    'exactly one concurrent vote creation should succeed',
  );
  await expectAllowed('concurrent-vote winner can remove their vote', () => writeHelpfulVote(
    outsiderClient.db,
    bookingId,
    outsiderId,
    1,
    false,
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
  const requesterService = { id: 'requester-service', name: 'Second service', description: '', price: '2000', availability: null };
  const requesterProviderRef = doc(requesterClient.db, 'providers', requesterId);
  await expectAllowed('existing requester creates a private provider draft', () => setDoc(requesterProviderRef, {
    publicSchemaVersion: 0, firstName: 'Test', lastName: 'Requester',
    services: [requesterService],
    serviceIds: { [requesterService.id]: true },
  }));
  await expectAllowed('existing requester writes their authoritative service', () => setDoc(
    doc(requesterClient.db, 'providers', requesterId, 'services', requesterService.id),
    requesterService,
  ));
  const enrollment = writeBatch(requesterClient.db);
  enrollment.update(requesterProviderRef, { publicSchemaVersion: 1, updatedAt: serverTimestamp() });
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
    requesterId, requesterName: 'Test Requester', providerId, providerName: 'Test Provider',
    serviceId: 'service-1', serviceName: 'Test Service',
    bookingDate: new Date(Date.now() + 60 * 60 * 1000), price: 1000, notes: null, status: 'pending',
    checklist: [{ id: 'item-1', description: 'New request', completed: false }],
    checklistTotal: 1, checklistCompletedCount: 0, checklistProgress: { 'item-1': false },
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }));
  await expectAllowed('provider keeps existing conversations', () => getDoc(conversationRef));
  await expectAllowed('provider continues an existing requester conversation', () => writeMessageWithSummary(
    requesterClient.db,
    conversationId,
    requesterId,
    'Still the same account',
  ));
  await expectAllowed('provider can still edit their requester review', () => updateDoc(reviewRef, { comment: 'Updated after enrollment', updatedAt: serverTimestamp() }));
  await expectAllowed('requester deletes their review while immutable claim remains', () => deleteDoc(reviewRef));
  await expectDenied('deleted review cannot be recreated for the same booking', () => setDoc(reviewRef, reviewData));
  await expectAllowed('provider can edit their business profile', () => updateDoc(doc(requesterClient.db, 'providers', requesterId), { bio: 'Updated business description' }));
  await expectDenied('other provider cannot read bookmarks after enrollment', () => getDoc(doc(providerClient.db, 'users', requesterId)));

  console.log('Firestore booking, messaging, and requester-to-provider capability checks passed.');
} finally {
  await deleteApp(providerClient.app);
  await deleteApp(requesterClient.app);
  await deleteApp(outsiderClient.app);
  await deleteApp(anonymousClient.app);
}
