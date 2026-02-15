import admin from 'firebase-admin';
import fs from 'fs';

/**
 * Admin seeder for earnings. This uses the Firebase Admin SDK and requires a
 * service account key JSON. It writes directly to Firestore and bypasses rules,
 * so use with care.
 *
 * Usage:
 * 1. Create a service account in Firebase console and download the JSON key.
 * 2. From lazone/apps/mobile, Run:
 *    GOOGLE_APPLICATION_CREDENTIALS=/full/path/to/key.json \
 *      pnpm dlx ts-node ./backend/main/src/scripts/seedEarningsAdmin.ts <providerId>
 *
 */

async function run() {
  const args = process.argv.slice(2);
  const providerId = args[0] || process.env.PROVIDER_ID;
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!providerId) {
    console.error('Usage: seedEarningsAdmin <providerId> or set PROVIDER_ID env var');
    process.exit(1);
  }

  if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
    console.error('Set GOOGLE_APPLICATION_CREDENTIALS to a valid service account JSON path');
    process.exit(1);
  }

  const serviceAccount = require(serviceAccountPath);

  try {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } catch (e) {
    // If already initialized in this process, ignore
    if (!admin.apps.length) {
      console.error('Failed to initialize admin SDK:', e);
      process.exit(1);
    }
  }

  const db = admin.firestore();

  const sample = [
    {
      providerId,
      amount: 250000,
      netAmount: 200000,
      platformFee: 50000,
      currency: 'XOF',
      type: 'service_payment',
      status: 'completed',
      description: 'Plumbing: Fix kitchen sink',
      serviceName: 'Kitchen sink repair',
      requesterName: 'Client A',
    },
    {
      providerId,
      amount: 50000,
      netAmount: 50000,
      platformFee: 0,
      currency: 'XOF',
      type: 'tip',
      status: 'completed',
      description: 'Tip from client A',
      requesterName: 'Client A',
    },
    {
      providerId,
      amount: 100000,
      netAmount: 80000,
      platformFee: 20000,
      currency: 'XOF',
      type: 'service_payment',
      status: 'pending',
      description: 'Electrical: Install ceiling fan',
      serviceName: 'Ceiling fan installation',
      requesterName: 'Client B',
    },
    {
      providerId,
      amount: 150000,
      netAmount: 150000,
      platformFee: 0,
      currency: 'XOF',
      type: 'bonus',
      status: 'paid',
      description: 'Performance bonus',
    },
  ];

  try {
    for (let i = 0; i < sample.length; i++) {
      const docRef = await db.collection('earnings').add({
        ...sample[i],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`Created earning ${docRef.id} for provider ${providerId}`);
    }
    console.log('Admin seeding complete');
    process.exit(0);
  } catch (err) {
    console.error('Admin seeding failed:', err);
    process.exit(1);
  }
}

run();
