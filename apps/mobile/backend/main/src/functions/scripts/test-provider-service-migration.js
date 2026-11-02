const assert = require('node:assert/strict');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { migrateProviderServices, normalizeService } = require('./migrate-provider-services');

async function run() {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'FIRESTORE_EMULATOR_HOST is required');
  const app = initializeApp({ projectId: 'demo-rules' }, `service-migration-${Date.now()}`);
  const db = getFirestore(app);
  const suffix = Date.now();
  const providerRef = db.collection('providers').doc(`migration-provider-${suffix}`);
  const emptyRef = db.collection('providers').doc(`migration-empty-${suffix}`);
  const service = { id: 'migration-service', name: 'Safe service', description: '', price: '2500', availability: null };

  try {
    await providerRef.set({ publicSchemaVersion: 1, services: [service] });
    await emptyRef.set({ publicSchemaVersion: 1, services: [] });

    assert.equal(normalizeService({ ...service, price: '-1' }), null);
    const dryRun = await migrateProviderServices(db);
    assert.ok(dryRun.serviceDocuments >= 1);
    assert.equal((await providerRef.collection('services').doc(service.id).get()).exists, false);

    await migrateProviderServices(db, { apply: true });
    assert.deepEqual((await providerRef.collection('services').doc(service.id).get()).data(), service);
    assert.deepEqual((await providerRef.get()).data().serviceIds, { [service.id]: true });
    await migrateProviderServices(db, { apply: true });
    assert.deepEqual((await providerRef.collection('services').doc(service.id).get()).data(), service);
    console.log('Provider service migration checks passed.');
  } finally {
    await db.recursiveDelete(providerRef);
    await db.recursiveDelete(emptyRef);
    await deleteApp(app);
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
