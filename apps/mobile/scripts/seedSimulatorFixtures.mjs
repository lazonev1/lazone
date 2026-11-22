import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, writeBatch, serverTimestamp } from 'firebase/firestore';

// Disposable local fixtures only. These credentials never belong to live users.
const projectId = 'demo-lazone-mobile';
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
const password = 'Local-test-only-123';
const fixtures = {};
for (const role of ['requester', 'provider']) {
  const app = initializeApp({ apiKey: 'demo-api-key', projectId }, `fixture-${role}`);
  const auth = getAuth(app);
  const db = getFirestore(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  const email = `${role}@lazone-example.test`;
  try {
    let user;
    try { user = (await createUserWithEmailAndPassword(auth, email, password)).user; }
    catch (error) {
      if (error.code !== 'auth/email-already-in-use') throw error;
      user = (await signInWithEmailAndPassword(auth, email, password)).user;
    }
    const account = doc(db, 'users', user.uid);
    if (!(await getDoc(account)).exists()) {
      const batch = writeBatch(db);
      batch.set(account, {
        firstName: 'Local', lastName: role === 'provider' ? 'Provider' : 'Requester',
        phoneNumber: '', role: 'requester', verified: false, subscriptionType: 'free', bookmarked: [],
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'publicProfiles', user.uid), { firstName: 'Local', lastName: role === 'provider' ? 'Provider' : 'Requester' });
      await batch.commit();
    }
    if (role === 'provider' && !(await getDoc(doc(db, 'providers', user.uid))).exists()) {
      const service = { id: 'local-cleaning', name: 'Local cleaning', description: 'Disposable simulator test service', price: '2500', availability: null };
      await setDoc(doc(db, 'providers', user.uid), {
        firstName: 'Local', lastName: 'Provider', businessName: 'Local Test Services', profession: 'Cleaning',
        categoryName: 'Home Services', bio: 'Local simulator fixture, not a real business.', remoteService: false,
        services: [service], serviceIds: { [service.id]: true }, reviews: [], averageRating: 0, reviewCount: 0,
        location: { country: 'BF', city: 'Ouagadougou', coordinates: { latitude: 12.37, longitude: -1.52 } },
        publicSchemaVersion: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'providers', user.uid, 'services', service.id), service);
      const batch = writeBatch(db);
      batch.update(doc(db, 'providers', user.uid), { publicSchemaVersion: 1, updatedAt: serverTimestamp() });
      batch.update(account, { role: 'both', updatedAt: serverTimestamp() });
      await batch.commit();
    }
    if (role === 'provider') {
      const [profile, provider] = await Promise.all([
        getDoc(account), getDoc(doc(db, 'providers', user.uid)),
      ]);
      assert.ok(['provider', 'both'].includes(profile.data()?.role), 'Existing local provider fixture is incomplete; finish its enrollment before reusing it.');
      assert.equal(provider.data()?.publicSchemaVersion, 1, 'Existing local provider fixture must be published.');
    }
    fixtures[role] = { uid: user.uid, email };
  } finally { await deleteApp(app); }
}
console.log(JSON.stringify({ projectId, fixtures }));
