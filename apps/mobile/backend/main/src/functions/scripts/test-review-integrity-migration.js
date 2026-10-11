const assert = require('node:assert/strict');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { migrateReviewIntegrity } = require('./migrate-review-integrity');

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error('Refusing to run migration test outside the Firestore emulator.');
}

const runId = Date.now().toString();
const app = initializeApp({ projectId: 'demo-rules' }, `review-migration-${runId}`);
const db = getFirestore(app);
const bookingId = `legacy-booking-${runId}`;
const reviewId = `legacy-review-${runId}`;
const reviewerId = `reviewer-${runId}`;
const providerId = `provider-${runId}`;
const voterId = `voter-${runId}`;
const reviewRef = db.collection('reviews').doc(reviewId);
const claimRef = db.collection('reviewBookingClaims').doc(bookingId);
const voteRef = reviewRef.collection('helpfulVotes').doc(voterId);

async function main() {
  await reviewRef.set({
    bookingId,
    requesterId: reviewerId,
    providerId,
    serviceId: 'legacy-service',
    rating: 5,
    comment: 'Legacy review',
    images: ['https://legacy.example/image.jpg'],
    responses: [
      { text: 'Older valid response', date: Timestamp.now() },
      { text: '', date: Timestamp.now() },
      { text: 'Latest valid response', date: Timestamp.now() },
    ],
    isHelpful: 4,
    helpfulBy: [voterId, voterId, reviewerId, providerId, null],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  const dryRun = await migrateReviewIntegrity(db);
  assert.equal(dryRun.reviews, 1);
  assert.equal((await claimRef.get()).exists, false, 'dry-run must not write claims');

  const applied = await migrateReviewIntegrity(db, { apply: true });
  assert.equal(applied.privateVotesToCreate, 1);
  assert.equal(applied.duplicateVoterIdsRemoved, 1);
  assert.equal(applied.invalidVoterIdsRemoved, 3);
  assert.equal(applied.legacyImageUrlsRemoved, 1);
  assert.equal(applied.invalidResponsesRemoved, 1);
  assert.equal(applied.extraResponsesRemoved, 1);

  const [review, claim, vote] = await Promise.all([
    reviewRef.get(),
    claimRef.get(),
    voteRef.get(),
  ]);
  assert.equal(review.data().isHelpful, 1);
  assert.equal(Object.hasOwn(review.data(), 'helpfulBy'), false);
  assert.deepEqual(review.data().images, []);
  assert.equal(review.data().responses.length, 1);
  assert.equal(review.data().responses[0].text, 'Latest valid response');
  assert.equal(Object.hasOwn(review.data().responses[0], 'date'), false);
  assert.equal(typeof review.data().responseUpdatedAt.toDate, 'function');
  assert.equal(claim.data().reviewId, reviewId);
  assert.equal(vote.data().voterId, voterId);

  await Promise.all([voteRef.delete(), reviewRef.delete(), claimRef.delete()]);
  console.log('Review-integrity migration dry-run and apply checks passed.');
}

main()
  .finally(() => deleteApp(app))
  .catch(error => { console.error(error); process.exitCode = 1; });
