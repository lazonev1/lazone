/**
 * A04 read-only audit of legacy, unverified `users/{uid}.phoneNumber` values.
 * Before A04 the signup phone was free text, never a login credential. This
 * reports which values could be offered as an "Add phone" prefill and which
 * collide with a number another account already verified in Firebase Auth.
 * It never writes and never links or merges accounts. Numbers are masked.
 */
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const E164 = /^\+[1-9][0-9]{7,14}$/;

function candidateE164(value) {
  if (typeof value !== 'string') return null;
  const compact = value.trim().replace(/[\s().-]/g, '').replace(/^00/, '+');
  return E164.test(compact) ? compact : null;
}

function mask(e164) {
  return `${e164.slice(0, 6)}${'*'.repeat(Math.max(0, e164.length - 8))}${e164.slice(-2)}`;
}

async function auditLegacyPhones(db, auth) {
  const users = await db.collection('users').select('phoneNumber').get();
  const report = {
    profiles: users.size,
    empty: 0,
    needsCountry: 0,
    alreadyVerifiedOnSameAccount: 0,
    availableToVerify: 0,
    verifiedByAnotherAccount: [],
    sharedByProfiles: [],
  };
  const byNumber = new Map();

  for (const user of users.docs) {
    const raw = user.get('phoneNumber');
    if (typeof raw !== 'string' || !raw.trim()) {
      report.empty++;
      continue;
    }
    const e164 = candidateE164(raw);
    if (!e164) {
      // National format without a country cannot be normalized safely.
      report.needsCountry++;
      continue;
    }
    byNumber.set(e164, [...(byNumber.get(e164) ?? []), user.id]);
    let owner = null;
    try {
      owner = await auth.getUserByPhoneNumber(e164);
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error;
    }
    if (!owner) report.availableToVerify++;
    else if (owner.uid === user.id) report.alreadyVerifiedOnSameAccount++;
    else report.verifiedByAnotherAccount.push({ profile: user.id, owner: owner.uid, number: mask(e164) });
  }

  for (const [e164, profiles] of byNumber) {
    if (profiles.length > 1) report.sharedByProfiles.push({ number: mask(e164), profiles });
  }
  return report;
}

module.exports = { auditLegacyPhones, candidateE164, mask };

if (require.main === module) {
  const args = process.argv.slice(2);
  const project = args.find(arg => arg.startsWith('--project='))?.slice('--project='.length);
  if (!project || args.length !== 1) {
    throw new Error('Usage: node scripts/audit-legacy-phones.js --project=PROJECT_ID');
  }
  const emulated = process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST;
  initializeApp({ projectId: project, ...(emulated ? {} : { credential: applicationDefault() }) });
  console.log(`READ-ONLY legacy phone audit: ${project}`);
  auditLegacyPhones(getFirestore(), getAuth())
    .then(report => {
      console.log(JSON.stringify(report, null, 2));
      console.log('No writes made. Conflicting numbers stay with their verified owner; never merge accounts from profile fields.');
    })
    .catch(error => { console.error(error); process.exitCode = 1; });
}
