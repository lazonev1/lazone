import admin from 'firebase-admin';
import fs from 'fs';

/**
 * Admin seeder for referrals. Uses Firebase Admin SDK (bypasses rules).
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/full/path/to/key.json \
 *     npx ts-node apps/mobile/backend/main/src/scripts/seedReferrals.ts <userId>
 */

async function run() {
  const args = process.argv.slice(2);
  const userId = args[0] || process.env.USER_ID;
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!userId) {
    console.error('Usage: seedReferrals <userId> or set USER_ID env var');
    process.exit(1);
  }

  if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
    console.error('Set GOOGLE_APPLICATION_CREDENTIALS to a valid service account JSON path');
    process.exit(1);
  }

  const serviceAccount = require(serviceAccountPath);

  try {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } catch {
    if (!admin.apps.length) process.exit(1);
  }

  const db = admin.firestore();
  const referralCode = `LAZONE-${userId.substring(0, 6).toUpperCase()}`;

  const sample = [
    {
      referrerId: userId,
      referralCode,
      refereeContact: '+226 70112233',
      refereeName: 'Aminata D.',
      refereeId: 'fake_user_001',
      status: 'rewarded',
      rewardAmount: 50000,   // 500.00 XOF
      currency: 'XOF',
    },
    {
      referrerId: userId,
      referralCode,
      refereeContact: '+226 70445566',
      refereeName: 'Moussa K.',
      refereeId: 'fake_user_002',
      status: 'completed',
      rewardAmount: 0,
      currency: 'XOF',
    },
    {
      referrerId: userId,
      referralCode,
      refereeContact: '+226 70778899',
      refereeName: 'Fatou S.',
      refereeId: 'fake_user_003',
      status: 'signed_up',
      rewardAmount: 0,
      currency: 'XOF',
    },

    {
      referrerId: userId,
      referralCode,
      refereeContact: 'issa.ouedraogo@example.com',
      refereeName: 'Issa O.',
      refereeId: 'fake_user_004',
      status: 'rewarded',
      rewardAmount: 50000,
      currency: 'XOF',
    },
  ];

  try {
    for (const item of sample) {
      const docRef = await db.collection('referrals').add({
        ...item,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`Created referral ${docRef.id} (${item.status}) for user ${userId}`);
    }
    console.log('Referral seeding complete');
    process.exit(0);
  } catch (err) {
    console.error('Referral seeding failed:', err);
    process.exit(1);
  }
}

run();
