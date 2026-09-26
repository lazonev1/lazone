const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { migrateProfiles } = require('./migrate-public-profiles');

if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Run only against the Firestore emulator');
initializeApp({ projectId: 'demo-rules' });
const db = getFirestore();
const migrate = require.resolve('./migrate-public-profiles.js');

async function main() {
  await db.doc('users/migration-user').set({
    firstName: 'Legacy', lastName: 'User', phoneNumber: 'private',
    bookmarked: ['secret'], notificationTokens: ['token'],
  });
  await db.doc('providers/migration-user').set({
    firstName: 'Legacy', lastName: 'User', businessName: 'Business',
    categoryName: 'Service', services: [{ id: 'one', name: 'Job', price: '100', privateNote: 'secret' }],
    portfolio: db.doc('portfolios/migration-user'),
    phoneNumber: 'private', dob: new Date('1990-01-01'), bookmarked: ['secret'],
    verified: true, location: {
      country: 'BF', city: 'Ouagadougou', formattedAddress: 'private address',
      coordinates: { latitude: 12.345678, longitude: -1.234567 },
    },
  });

  execFileSync(process.execPath, [migrate, '--project=demo-rules'], { stdio: 'pipe' });
  assert.equal((await db.doc('publicProfiles/migration-user').get()).exists, false);
  assert.equal((await db.doc('providers/migration-user').get()).data().phoneNumber, 'private');

  execFileSync(process.execPath, [migrate, '--project=demo-rules', '--apply'], { stdio: 'pipe' });
  const identity = (await db.doc('publicProfiles/migration-user').get()).data();
  const provider = (await db.doc('providers/migration-user').get()).data();
  const account = (await db.doc('users/migration-user').get()).data();
  assert.equal(identity.firstName, 'Legacy');
  assert.equal(identity.phoneNumber, undefined);
  assert.equal(provider.publicSchemaVersion, 1);
  assert.equal(provider.businessName, 'Business');
  assert.equal(provider.portfolio.path, 'portfolios/migration-user');
  assert.equal(provider.phoneNumber, undefined);
  assert.equal(provider.dob, undefined);
  assert.equal(provider.bookmarked, undefined);
  assert.equal(provider.verified, undefined);
  assert.equal(provider.services[0].privateNote, undefined);
  assert.equal(provider.location.formattedAddress, undefined);
  assert.equal(provider.location.city, 'Ouagadougou');
  assert.deepEqual(provider.location.coordinates, { latitude: 12.35, longitude: -1.23 });
  assert.equal(account.phoneNumber, 'private');
  // A concurrent account edit must abort the entire migration, not publish a
  // stale name or commit some providers before discovering the changed record.
  const expectedVersions = new Map();
  for (const name of ['users', 'providers', 'publicProfiles']) {
    for (const snapshot of (await db.collection(name).get()).docs) {
      expectedVersions.set(snapshot.ref.path, snapshot.updateTime);
      if (name === 'users') expectedVersions.set(`publicProfiles/${snapshot.id}`, null);
    }
  }
  const providerBefore = await db.doc('providers/migration-user').get();
  await db.doc('users/migration-user').update({ firstName: 'Concurrent edit' });
  await assert.rejects(migrateProfiles(db, { apply: true, expectedVersions }), /changed since backup/);
  assert.ok((await db.doc('providers/migration-user').get()).updateTime.isEqual(providerBefore.updateTime));
  assert.equal((await db.doc('publicProfiles/migration-user').get()).data().firstName, 'Legacy');
  console.log('Public-profile migration dry-run and apply passed.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
