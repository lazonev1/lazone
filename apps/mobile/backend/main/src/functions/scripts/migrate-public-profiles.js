/**
 * One-time privacy migration. Dry-run by default; --apply is required to write.
 * Uses Application Default Credentials, or FIRESTORE_EMULATOR_HOST locally.
 * Example: node scripts/migrate-public-profiles.js --project=lazonev1-5da5a
 *          node scripts/migrate-public-profiles.js --project=lazonev1-5da5a --apply
 */
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const publicProviderFields = [
  'firstName', 'lastName', 'avatar', 'businessName', 'profession', 'categoryName',
  'bio', 'remoteService', 'services', 'reviews', 'averageRating', 'reviewCount',
  'coverImage', 'portfolio', 'pricing', 'createdAt', 'updatedAt',
];
const publicServiceFields = ['id', 'name', 'description', 'price', 'availability'];

function publicLocation(location) {
  if (!location || typeof location.country !== 'string' || typeof location.city !== 'string') return undefined;
  const result = { country: location.country, city: location.city };
  const coords = location.coordinates;
  // Existing provider coordinates were already public. Keep an approximate
  // service area so nearby search continues to work, never the exact position.
  if (Number.isFinite(coords?.latitude) && Number.isFinite(coords?.longitude)
    && Math.abs(coords.latitude) <= 90 && Math.abs(coords.longitude) <= 180) {
    result.coordinates = {
      latitude: Math.round(coords.latitude * 100) / 100,
      longitude: Math.round(coords.longitude * 100) / 100,
    };
  }
  return result;
}

async function eachPage(db, collectionName, processPage) {
  let after;
  while (true) {
    let query = db.collection(collectionName).orderBy('__name__').limit(200);
    if (after) query = query.startAfter(after);
    const snapshot = await query.get();
    if (snapshot.empty) return;
    await processPage(snapshot.docs);
    after = snapshot.docs[snapshot.docs.length - 1];
  }
}

/**
 * Accepts an initialized Admin client so an operator can use an existing CLI
 * session without creating or storing a service-account key. expectedVersions
 * ties writes to a reviewed backup (Map<document path, Timestamp | null>).
 */
async function migrateProfiles(db, { apply = false, expectedVersions } = {}) {
  const removed = new Map();
  const counts = { users: 0, providers: 0, providersWithoutServices: 0 };
  const writes = [];
  const sources = new Map();
  await eachPage(db, 'users', async docs => {
    for (const snapshot of docs) {
      const user = snapshot.data();
      sources.set(snapshot.ref.path, snapshot);
      counts.users++;
      const identity = {
        firstName: typeof user.firstName === 'string' ? user.firstName : '',
        lastName: typeof user.lastName === 'string' ? user.lastName : '',
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (typeof user.avatar === 'string') identity.avatar = user.avatar;
      writes.push({ ref: db.collection('publicProfiles').doc(snapshot.id), data: identity });
    }
  });

  await eachPage(db, 'providers', async docs => {
    for (const snapshot of docs) {
      const provider = snapshot.data();
      sources.set(snapshot.ref.path, snapshot);
      if (!Array.isArray(provider.services) || !provider.services.some(service => typeof service?.name === 'string' && service.name.trim())) {
        counts.providersWithoutServices++;
      }
      counts.providers++;
      const clean = { publicSchemaVersion: 1 };
      for (const key of publicProviderFields) {
        if (provider[key] !== undefined) clean[key] = provider[key];
      }
      if (Array.isArray(provider.services)) {
        clean.services = provider.services.map(service => {
          if (!service || typeof service !== 'object') return {};
          return Object.fromEntries(publicServiceFields
            .filter(key => service[key] !== undefined)
            .map(key => [key, service[key]]));
        });
      }
      const location = publicLocation(provider.location);
      if (location) clean.location = location;
      for (const key of Object.keys(provider)) {
        if (!publicProviderFields.includes(key) && key !== 'location' && key !== 'publicSchemaVersion') {
          removed.set(key, (removed.get(key) || 0) + 1);
        }
      }
      // Replace the document, not merge: merging would retain exposed private fields.
      writes.push({ ref: snapshot.ref, data: clean });
    }
  });

  // This rollout is deliberately atomic. Larger databases need a separate,
  // checkpointed migration rather than silently committing a partial cleanup.
  if (writes.length > 400) throw new Error('More than 400 writes: use a reviewed, checkpointed migration.');
  if (apply && writes.length) {
    await db.runTransaction(async transaction => {
      const refs = new Map([...sources].map(([path, snapshot]) => [path, snapshot.ref]));
      for (const write of writes) refs.set(write.ref.path, write.ref);
      const current = await transaction.getAll(...refs.values());
      for (const snapshot of current) {
        const source = sources.get(snapshot.ref.path);
        if (source && (!snapshot.exists || !snapshot.updateTime.isEqual(source.updateTime))) {
          throw new Error('Profile changed during migration; rerun the dry-run and backup.');
        }
        if (expectedVersions) {
          if (!expectedVersions.has(snapshot.ref.path)) throw new Error('Unbacked profile detected; create a fresh backup.');
          const expected = expectedVersions.get(snapshot.ref.path);
          if (expected ? !snapshot.exists || !snapshot.updateTime.isEqual(expected) : snapshot.exists) {
            throw new Error('Profile changed since backup; create and review a fresh backup.');
          }
        }
      }
      for (const write of writes) transaction.set(write.ref, write.data);
    });
  }
  const report = { counts, removedFieldNames: Object.fromEntries(removed) };
  console.log(JSON.stringify(report, null, 2));
  if (!apply) console.log('No writes made. Review removedFieldNames before running --apply.');
  if (counts.providersWithoutServices) console.warn('Providers without a valid service remain visible but cannot accept bookings until repaired.');
  return report;
}

module.exports = { migrateProfiles };

if (require.main === module) {
  const args = process.argv.slice(2);
  const project = args.find(arg => arg.startsWith('--project='))?.slice('--project='.length);
  const apply = args.includes('--apply');
  if (!project || args.some(arg => arg !== '--apply' && !arg.startsWith('--project='))) {
    throw new Error('Usage: node scripts/migrate-public-profiles.js --project=PROJECT_ID [--apply]');
  }
  initializeApp({ projectId: project, ...(process.env.FIRESTORE_EMULATOR_HOST ? {} : { credential: applicationDefault() }) });
  console.log(`${apply ? 'APPLY' : 'DRY RUN'} public-profile migration: ${project}`);
  migrateProfiles(getFirestore(), { apply }).catch(error => { console.error(error); process.exitCode = 1; });
}
