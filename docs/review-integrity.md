# Review integrity and rollout

This change keeps the existing product contract: a completed booking produces at most one requester review, the reviewed provider may publish one editable response, and other signed-in users may mark the review helpful. Reviews are not public discussion threads.

## Before

```text
Public review document
├── rating/comment
├── provider response
├── helpful count
└── helpfulBy: [public user IDs]
              └── any voter could replace/remove other voters

Delete review → recreate review → previous response/votes are forgotten
```

## After

```text
completed booking
      │
      └── atomic create
          ├── reviews/{bookingId}                  public review + protected count
          └── reviewBookingClaims/{bookingId}      immutable one-review claim
                    │
                    └── remains after review deletion

reviews/{reviewId}/helpfulVotes/{currentUserId}    private to that voter
      │
      └── atomic create/delete changes public count by exactly +1/-1
```

- Only the booking requester can create, edit, or delete the review.
- Only the provider identified by that review can create or edit its response.
- Provider response time is written by Firestore, not trusted from the device clock.
- The reviewer and reviewed provider cannot vote on that review.
- A voter can read and toggle only their own vote; voter identities cannot be listed.
- Review image URLs remain disabled until the media-security work is complete.
- Deleting a review removes it publicly, but its immutable booking claim remains. The booking cannot be reviewed again. Private orphan vote records become inaccessible and are reserved for trusted cleanup when backend aggregation is introduced.

## User experience

The Helpful control has a visible label, a minimum 44-point touch target, selected/busy accessibility state, synchronous duplicate-tap protection, and rollback/error feedback. The larger review presentation and navigation cleanup remains B09 in the release-readiness backlog.

## Development rollout

This changes the review schema and must not be deployed as rules alone while older clients are expected to keep writing reviews.

1. Back up the `reviews` collection and record document update times.
2. Run the migration without `--apply` and review counts/conflicts:

   ```bash
   cd apps/mobile/backend/main/src/functions
   node scripts/migrate-review-integrity.js --project=lazonev1-5da5a
   ```

3. Resolve any duplicate-review or invalid-record report before continuing.
4. Run the same command with `--apply`. It creates immutable claims, creates private votes from valid unique legacy voters, resets each public count to those valid votes, deletes `helpfulBy`, removes unsupported legacy image URLs, and keeps only the latest structurally valid provider response with normalized timestamp metadata.
5. Deploy the matching Firestore rules and install the matching development build as one coordinated development rollout. Older development clients must be upgraded before using review create/vote actions.
6. Verify requester create/edit/delete, provider response/edit, third-party vote/unvote, reload persistence, permissions, and EN/FR UI on a native build.

The migration is dry-run by default, aborts on duplicate booking reviews or malformed participant IDs, refuses more than 400 writes, checks source versions inside the transaction, and rejects conflicting existing claim/vote records.
