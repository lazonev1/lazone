/**
 * Backfill authoritative provider service documents from the existing public
 * provider projection. Dry-run by default; --apply is required to write.
 */
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const MAX_SERVICES = 5;
const PRICE_PATTERN = /^[1-9][0-9]{0,8}$/;
const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

function normalizeService(service) {
  if (!service || typeof service !== 'object') return null;
  const keys = Object.keys(service);
  if (
    !['id', 'name', 'description', 'price'].every(key => keys.includes(key))
    || keys.some(key => !['id', 'name', 'description', 'price', 'availability'].includes(key))
  ) return null;
  const normalized = {
    id: typeof service.id === 'string' ? service.id : '',
    name: typeof service.name === 'string' ? service.name : '',
    description: typeof service.description === 'string' ? service.description : '',
    price: typeof service.price === 'string' ? service.price : '',
  };
  if (Object.hasOwn(service, 'availability')) normalized.availability = service.availability;
  if (
    !ID_PATTERN.test(normalized.id) || normalized.id.length > 128
    || !normalized.name.trim() || normalized.name.length > 120
    || normalized.description.length > 1000
    || !PRICE_PATTERN.test(normalized.price)
    || (normalized.availability !== undefined
      && normalized.availability !== null
      && (typeof normalized.availability !== 'string' || normalized.availability.length > 200))
  ) return null;
  return normalized;
}

async function migrateProviderServices(db, { apply = false } = {}) {
  const providers = await db.collection('providers').where('publicSchemaVersion', '==', 1).get();
  const writes = [];
  const sourceVersions = new Map();
  const report = { providers: providers.size, bookableProviders: 0, skippedWithoutServices: 0, serviceDocuments: 0 };

  for (const provider of providers.docs) {
    const rawServices = provider.data().services;
    if (!Array.isArray(rawServices) || rawServices.length === 0) {
      report.skippedWithoutServices++;
      continue;
    }
    if (rawServices.length > MAX_SERVICES) throw new Error(`Provider ${provider.id} exceeds the ${MAX_SERVICES}-service limit.`);
    const services = rawServices.map(normalizeService);
    if (services.some(service => !service)) throw new Error(`Provider ${provider.id} has a malformed service; repair it before migration.`);
    const ids = new Set(services.map(service => service.id));
    if (ids.size !== services.length) throw new Error(`Provider ${provider.id} has duplicate service IDs.`);

    report.bookableProviders++;
    sourceVersions.set(provider.ref.path, provider.updateTime);
    for (const service of services) {
      writes.push({ ref: provider.ref.collection('services').doc(service.id), data: service });
      report.serviceDocuments++;
    }
  }

  if (writes.length > 400) throw new Error('More than 400 service writes require a reviewed checkpointed migration.');
  if (apply && writes.length) {
    await db.runTransaction(async transaction => {
      const currentProviders = await transaction.getAll(
        ...providers.docs.filter(provider => sourceVersions.has(provider.ref.path)).map(provider => provider.ref),
      );
      for (const provider of currentProviders) {
        if (!provider.exists || !provider.updateTime.isEqual(sourceVersions.get(provider.ref.path))) {
          throw new Error('A provider changed during migration; rerun the dry-run before applying.');
        }
      }
      writes.forEach(write => transaction.set(write.ref, write.data));
    });
  }

  console.log(JSON.stringify(report, null, 2));
  if (!apply) console.log('No writes made. Review the report before running --apply.');
  return report;
}

module.exports = { migrateProviderServices, normalizeService };

if (require.main === module) {
  const args = process.argv.slice(2);
  const project = args.find(arg => arg.startsWith('--project='))?.slice('--project='.length);
  const apply = args.includes('--apply');
  if (!project || args.some(arg => arg !== '--apply' && !arg.startsWith('--project='))) {
    throw new Error('Usage: node scripts/migrate-provider-services.js --project=PROJECT_ID [--apply]');
  }
  initializeApp({ projectId: project, ...(process.env.FIRESTORE_EMULATOR_HOST ? {} : { credential: applicationDefault() }) });
  console.log(`${apply ? 'APPLY' : 'DRY RUN'} provider-service migration: ${project}`);
  migrateProviderServices(getFirestore(), { apply }).catch(error => { console.error(error); process.exitCode = 1; });
}
