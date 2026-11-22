import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { connectStorageEmulator, deleteObject, getBytes, getMetadata, getStorage, listAll, ref, updateMetadata, uploadBytes } from 'firebase/storage';

// Fail closed before initializing any SDK: this script is emulator-only.
assert.match(process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '', /^(127\.0\.0\.1|localhost):9099$/);
assert.match(process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? '', /^(127\.0\.0\.1|localhost):9199$/);
const projectId = 'demo-storage-rules';
const bucket = `${projectId}.appspot.com`;
const runId = Date.now();
function client(name) {
  const app = initializeApp({ projectId, apiKey: 'demo-key', storageBucket: bucket }, `${name}-${runId}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const storage = getStorage(app);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  storage.maxUploadRetryTime = 1000;
  storage.maxOperationRetryTime = 1000;
  return { app, auth, storage };
}
async function denied(label, operation) {
  await assert.rejects(operation, error => {
    assert.equal(error.code, 'storage/unauthorized', `${label}: unexpected ${error.code}`);
    return true;
  }, label);
}
const owner = client('owner');
const outsider = client('outsider');
const guest = client('guest');
const bytes = new Uint8Array([137, 80, 78, 71]);
async function seed(path, contentType = 'image/png') {
  const response = await fetch(`http://127.0.0.1:9199/v0/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(path)}`, {
    method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': contentType }, body: bytes,
  });
  assert.ok(response.ok, `fixture seed failed: ${response.status}`);
}
try {
  const uid = (await createUserWithEmailAndPassword(owner.auth, `storage-owner-${runId}@example.test`, 'TestPassword123!')).user.uid;
  await createUserWithEmailAndPassword(outsider.auth, `storage-other-${runId}@example.test`, 'TestPassword123!');
  for (const root of ['users', 'providers']) {
    const path = `${root}/${uid}/public-test.png`;
    const owned = ref(owner.storage, path);
    await uploadBytes(owned, bytes, { contentType: 'image/png' });
    assert.equal((await getMetadata(owned)).size, bytes.length);
    assert.equal((await getBytes(ref(guest.storage, path))).byteLength, bytes.length);
    await denied('guest upload', () => uploadBytes(ref(guest.storage, `${root}/${uid}/guest.png`), bytes, { contentType: 'image/png' }));
    await denied('outsider overwrite', () => uploadBytes(ref(outsider.storage, path), bytes, { contentType: 'image/png', customMetadata: { owner: uid } }));
    await denied('outsider delete', () => deleteObject(ref(outsider.storage, path)));
    for (const contentType of ['image/svg+xml', 'image/gif', 'text/html', 'application/pdf', 'application/octet-stream']) {
      await denied(`reject ${contentType}`, () => uploadBytes(ref(owner.storage, `${root}/${uid}/wrong-type`), bytes, { contentType }));
    }
    await denied('empty upload', () => uploadBytes(ref(owner.storage, `${root}/${uid}/empty.png`), new Uint8Array(), { contentType: 'image/png' }));
    await denied('oversize upload', () => uploadBytes(ref(owner.storage, `${root}/${uid}/large.png`), new Uint8Array(5 * 1024 * 1024 + 1), { contentType: 'image/png' }));
    await denied('invalid metadata update', () => updateMetadata(owned, { contentType: 'text/html' }));
    assert.equal((await getMetadata(owned)).contentType, 'image/png');
    await denied('public object listing', () => listAll(ref(guest.storage, `${root}/${uid}`)));
    await denied('owner object listing', () => listAll(ref(owner.storage, `${root}/${uid}`)));
    await uploadBytes(owned, bytes, { contentType: 'image/webp' });
    await deleteObject(owned);
    const boundary = ref(owner.storage, `${root}/${uid}/boundary.jpg`);
    await uploadBytes(boundary, new Uint8Array(5 * 1024 * 1024), { contentType: 'image/jpeg' });
    await deleteObject(boundary);
    const legacyPath = `${root}/${uid}/legacy.svg`;
    await seed(legacyPath, 'image/svg+xml');
    await deleteObject(ref(owner.storage, legacyPath));
  }
  await denied('review uploads remain disabled', () => uploadBytes(ref(owner.storage, `reviews/review-${runId}/test.png`), bytes, { contentType: 'image/png' }));
  await denied('private evidence writes remain disabled', () => uploadBytes(ref(owner.storage, `private/${uid}/certificate.pdf`), bytes, { contentType: 'application/pdf' }));
  await denied('unknown paths', () => uploadBytes(ref(owner.storage, `other/${uid}/test.png`), bytes, { contentType: 'image/png' }));
  // Admin-only fixture creation, exclusively against the explicit local bucket.
  const privatePath = `private/${uid}/existing.png`;
  await seed(privatePath);
  for (const reader of [owner, outsider, guest]) await denied('private evidence read', () => getBytes(ref(reader.storage, privatePath)));
  const legacyReviewPath = `reviews/legacy-${runId}/existing.png`;
  await seed(legacyReviewPath);
  assert.equal((await getBytes(ref(guest.storage, legacyReviewPath))).byteLength, bytes.length);
  console.log('Storage rules passed: owner operations, public gets, denied cross-user/anonymous writes, MIME/size boundaries, metadata changes, listing, closed review/private paths.');
} finally {
  await Promise.all([owner, outsider, guest].map(value => deleteApp(value.app)));
}
