/**
 * One-time review-integrity migration. Dry-run by default; --apply is required.
 *
 * Creates an immutable booking claim for every review, moves legacy helpfulBy
 * identities into private per-user helpfulVotes documents, and leaves only the public
 * helpful count on the review. Run and review the dry-run before deploying the
 * matching rules/client release.
 *
 *   node scripts/migrate-review-integrity.js --project=lazonev1-5da5a
 *   node scripts/migrate-review-integrity.js --project=lazonev1-5da5a --apply
 */
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

async function migrateReviewIntegrity(db, { apply = false } = {}) {
  const snapshot = await db.collection('reviews').get();
  const reviewsByBooking = new Map();
  const writes = new Map();
  const sourceVersions = new Map();
  const report = {
    reviews: snapshot.size,
    claimsToCreate: 0,
    privateVotesToCreate: 0,
    invalidVoterIdsRemoved: 0,
    duplicateVoterIdsRemoved: 0,
    legacyImageUrlsRemoved: 0,
    invalidResponsesRemoved: 0,
    extraResponsesRemoved: 0,
  };

  for (const reviewSnapshot of snapshot.docs) {
    const review = reviewSnapshot.data();
    const { bookingId, requesterId, providerId } = review;
    if (typeof bookingId !== 'string' || !bookingId) {
      throw new Error(`Review ${reviewSnapshot.id} has no valid bookingId`);
    }
    if (typeof requesterId !== 'string' || typeof providerId !== 'string') {
      throw new Error(`Review ${reviewSnapshot.id} has invalid participant IDs`);
    }
    if (reviewsByBooking.has(bookingId)) {
      throw new Error(`Multiple reviews reference booking ${bookingId}: ${reviewsByBooking.get(bookingId)} and ${reviewSnapshot.id}`);
    }
    reviewsByBooking.set(bookingId, reviewSnapshot.id);
    sourceVersions.set(reviewSnapshot.ref.path, reviewSnapshot.updateTime);

    const claimRef = db.collection('reviewBookingClaims').doc(bookingId);
    writes.set(claimRef.path, {
      type: 'create-if-missing',
      ref: claimRef,
      data: {
        bookingId,
        reviewId: reviewSnapshot.id,
        requesterId,
        createdAt: review.createdAt || FieldValue.serverTimestamp(),
      },
    });

    const uniqueVoters = new Set();
    for (const voterId of Array.isArray(review.helpfulBy) ? review.helpfulBy : []) {
      if (typeof voterId !== 'string' || !voterId || voterId === requesterId || voterId === providerId) {
        report.invalidVoterIdsRemoved++;
        continue;
      }
      if (uniqueVoters.has(voterId)) {
        report.duplicateVoterIdsRemoved++;
        continue;
      }
      uniqueVoters.add(voterId);
      const voteRef = reviewSnapshot.ref.collection('helpfulVotes').doc(voterId);
      writes.set(voteRef.path, {
        type: 'create-if-missing',
        ref: voteRef,
        data: {
          reviewId: reviewSnapshot.id,
          voterId,
          createdAt: review.updatedAt || review.createdAt || FieldValue.serverTimestamp(),
        },
      });
    }

    const legacyImages = Array.isArray(review.images) ? review.images : [];
    report.legacyImageUrlsRemoved += legacyImages.length;
    const originalResponses = Array.isArray(review.responses) ? review.responses : [];
    const validResponses = originalResponses.filter(response => (
      response
      && typeof response.text === 'string'
      && response.text.length > 0
      && response.text.length <= 500
    ));
    report.invalidResponsesRemoved += originalResponses.length - validResponses.length;
    report.extraResponsesRemoved += Math.max(0, validResponses.length - 1);
    const latestResponse = validResponses.at(-1);
    const responseUpdatedAt = latestResponse
      ? (typeof latestResponse.date?.toDate === 'function'
          ? latestResponse.date
          : review.responseUpdatedAt || review.updatedAt || review.createdAt || FieldValue.serverTimestamp())
      : null;

    writes.set(reviewSnapshot.ref.path, {
      type: 'update',
      ref: reviewSnapshot.ref,
      data: {
        helpfulBy: FieldValue.delete(),
        isHelpful: uniqueVoters.size,
        images: [],
        responses: latestResponse ? [{ text: latestResponse.text }] : [],
        responseUpdatedAt,
        updatedAt: FieldValue.serverTimestamp(),
      },
    });
  }

  if (writes.size > 400) {
    throw new Error(`Migration requires ${writes.size} writes; use a reviewed checkpointed migration instead.`);
  }

  const createWrites = [...writes.values()].filter(write => write.type === 'create-if-missing');
  if (createWrites.length) {
    const existingIntegrityRecords = await db.getAll(...createWrites.map(write => write.ref));
    for (const document of existingIntegrityRecords) {
      const write = writes.get(document.ref.path);
      if (!document.exists) {
        if (document.ref.parent.id === 'reviewBookingClaims') report.claimsToCreate++;
        else report.privateVotesToCreate++;
        continue;
      }
      const currentData = document.data();
      if (currentData.reviewId !== write.data.reviewId
        || (write.data.voterId && currentData.voterId !== write.data.voterId)) {
        throw new Error(`Conflicting integrity record already exists: ${document.ref.path}`);
      }
    }
  }

  if (apply && writes.size) {
    await db.runTransaction(async transaction => {
      const current = await transaction.getAll(...[...writes.values()].map(write => write.ref));
      const currentByPath = new Map(current.map(document => [document.ref.path, document]));

      for (const [path, version] of sourceVersions) {
        const document = currentByPath.get(path);
        if (!document?.exists || !document.updateTime.isEqual(version)) {
          throw new Error(`Review changed after dry-run began: ${path}`);
        }
      }

      for (const write of writes.values()) {
        const currentDocument = currentByPath.get(write.ref.path);
        if (write.type === 'update') {
          transaction.update(write.ref, write.data);
          continue;
        }
        if (currentDocument.exists) {
          const currentData = currentDocument.data();
          if (currentData.reviewId !== write.data.reviewId
            || (write.data.voterId && currentData.voterId !== write.data.voterId)) {
            throw new Error(`Conflicting integrity record already exists: ${write.ref.path}`);
          }
          continue;
        }
        transaction.create(write.ref, write.data);
      }
    });
  }

  console.log(JSON.stringify({ ...report, totalWrites: writes.size }, null, 2));
  if (!apply) console.log('No writes made. Review the report before running with --apply.');
  return report;
}

module.exports = { migrateReviewIntegrity };

if (require.main === module) {
  const args = process.argv.slice(2);
  const project = args.find(arg => arg.startsWith('--project='))?.slice('--project='.length);
  const apply = args.includes('--apply');
  if (!project || args.some(arg => arg !== '--apply' && !arg.startsWith('--project='))) {
    throw new Error('Usage: node scripts/migrate-review-integrity.js --project=PROJECT_ID [--apply]');
  }
  initializeApp({
    projectId: project,
    ...(process.env.FIRESTORE_EMULATOR_HOST ? {} : { credential: applicationDefault() }),
  });
  console.log(`${apply ? 'APPLY' : 'DRY RUN'} review-integrity migration: ${project}`);
  migrateReviewIntegrity(getFirestore(), { apply })
    .catch(error => { console.error(error); process.exitCode = 1; });
}
