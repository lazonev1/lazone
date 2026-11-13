const assert = require('node:assert/strict');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { auditLegacyPhones, candidateE164, mask } = require('./audit-legacy-phones');

async function run() {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'FIRESTORE_EMULATOR_HOST is required');
  assert.ok(process.env.FIREBASE_AUTH_EMULATOR_HOST, 'FIREBASE_AUTH_EMULATOR_HOST is required');
  const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-access' }, `phone-audit-${Date.now()}`);
  const db = getFirestore(app);
  const auth = getAuth(app);
  const suffix = String(Date.now() % 1_000_000).padStart(6, '0');
  const owned = `+2267${suffix}1`;
  const free = `+2267${suffix}2`;
  const ids = ['audit-owner', 'audit-other', 'audit-free', 'audit-free-twin', 'audit-national', 'audit-empty'].map(id => `${id}-${suffix}`);

  assert.equal(candidateE164(' +226 70 12-34.56 '), '+22670123456');
  assert.equal(candidateE164('0022670123456'), '+22670123456');
  assert.equal(candidateE164('70123456'), null);
  assert.equal(mask('+22670123456'), '+22670****56');

  try {
    await auth.createUser({ uid: ids[0], phoneNumber: owned });
    const profiles = [owned, owned, free, free, '70 12 34 56', ''];
    await Promise.all(ids.map((id, index) => db.doc(`users/${id}`).set({ phoneNumber: profiles[index] })));
    const before = await Promise.all(ids.map(id => db.doc(`users/${id}`).get()));

    const report = await auditLegacyPhones(db, auth);
    assert.ok(report.alreadyVerifiedOnSameAccount >= 1);
    assert.ok(report.availableToVerify >= 2);
    assert.ok(report.needsCountry >= 1);
    assert.ok(report.empty >= 1);
    assert.deepEqual(
      report.verifiedByAnotherAccount.filter(entry => entry.profile === ids[1]),
      [{ profile: ids[1], owner: ids[0], number: mask(owned) }],
    );
    assert.ok(report.sharedByProfiles.some(entry => entry.profiles.includes(ids[2]) && entry.profiles.includes(ids[3])));
    assert.ok(!JSON.stringify(report).includes(owned), 'report must not print full numbers');

    const after = await Promise.all(ids.map(id => db.doc(`users/${id}`).get()));
    after.forEach((snapshot, index) => assert.ok(snapshot.updateTime.isEqual(before[index].updateTime), 'audit is read-only'));
    assert.equal((await auth.getUser(ids[0])).phoneNumber, owned);
    console.log('Legacy phone audit checks passed: classification, conflicts, shared numbers, masking, and read-only behavior.');
  } finally {
    await Promise.all(ids.map(id => db.doc(`users/${id}`).delete()));
    await auth.deleteUser(ids[0]).catch(() => undefined);
    await deleteApp(app);
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
