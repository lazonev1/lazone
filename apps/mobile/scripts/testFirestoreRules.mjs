import { createUserWithEmailAndPassword, connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, deleteDoc, doc, getFirestore, setDoc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
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
  const providerId = providerCredential.user.uid;
  const requesterId = requesterCredential.user.uid;

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

  console.log('Firestore booking lifecycle rules passed.');
} finally {
  await deleteApp(providerClient.app);
  await deleteApp(requesterClient.app);
}
