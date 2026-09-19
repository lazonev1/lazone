# Public/private profile rollout (S01)

Start with the [brief before/after change guide](public-private-profile-changes.md) for the app flow, database changes, and reviewer summary.

## Data boundary

- `users/{uid}` is the private account: personal phone, date of birth, bookmarks, push tokens, account preferences, and private location. Only its owner may read it in client rules. Firebase Admin code remains server-authorized.
- `publicProfiles/{uid}` currently holds only display name and optional avatar for chat and reviews. It is an interaction identity, not a browsable requester profile. The deployed rules allow any client to read it because guest-visible reviews currently hydrate their author identity from this collection; only the owner may edit it. Final S01 acceptance requires replacing that guest dependency with a limited review-author snapshot (or equivalent), restricting identity reads, and denying collection listing.
- `providers/{uid}` holds intentionally public business details, service list, ratings, photos, and approximate service area. New records carry `publicSchemaVersion: 1`. Exact device coordinates and personal account fields are never copied there. Existing public provider coordinates are rounded to an approximate area so distance search keeps working; street address is removed.
- `earnings/{id}` reads are limited to the provider identified in the record. There is no client earnings writer in this codebase.

Existing provider `portfolio` references remain on the public provider document and are still read for profile display. The registration form's photo picker was already not persisting newly selected portfolio photos. Firebase Storage is marked uninitialized in the release checklist, so this privacy change does not add a Storage dependency to provider registration. Completing new portfolio uploads requires a separate product/infrastructure decision.

Firestore rules authorize whole-document reads. They cannot redact fields inside a readable document. The marker gates legacy provider records until the cleanup has replaced them; provider list queries must filter `publicSchemaVersion == 1`.

**Do not point the updated app at an unmigrated database:** legacy providers without the marker will be absent from browse/search. Migration must precede the updated client rollout. `lazonev1-5da5a` has now been migrated, as recorded below. This is a deliberate fail-closed behavior, not a compatible development fallback.

## Verification completed locally

```sh
pnpm --filter ./apps/mobile typecheck
pnpm --filter ./apps/mobile lint
FIREBASE_TOOLS_DISABLE_UPDATE_CHECK=true pnpm --filter ./apps/mobile exec firebase emulators:exec --project demo-rules --only firestore,auth "pnpm test:rules && node backend/main/src/functions/scripts/test-public-profile-migration.js"
```

The rule suite covers owner/unrelated/anonymous account access, public identity, provider schema, provider listing, bookings, reviews, and chat. It also enrolls an existing requester as a provider and checks that bookmarks, preferences, contact data, subscription, and notification tokens survive; the same account can keep booking other providers, read prior bookings, continue chats, edit its requester review, and edit its business profile. Invalid enrollment leaves the account a requester. An account-name edit before provider enrollment is covered too: the owner must be allowed to check their own missing provider document.

The migration suite proves that dry-run writes nothing, apply removes copied private fields, business data plus approximate coordinates remain, and a stale backup aborts the whole migration without partial writes. The app still needs a two-account simulator smoke test after release.

## Live rollout — September 18, 2026 (America/New_York)

The account owner authorized migration and Firestore rules deployment to `lazonev1-5da5a`.

- Before rollout: 22 private accounts, 11 legacy providers, zero public identities, and zero providers matching the new discovery marker. Deployed rules still allowed public provider reads and authenticated cross-account user reads.
- Backed up all documents in `users`, `providers`, and `publicProfiles`, plus the previous deployed rules. The typed Firestore REST snapshots preserve references and timestamps for recovery. Local recovery files are in `.private-backups/public-profiles-NgPTIr/`, excluded from Git; directory permissions are owner-only and snapshot files are `0600`. They contain private data and must not be attached to a PR or shared publicly.
- Reviewed the dry-run: remove the copied `phoneNumber`, `dob`, `role`, `verified`, `subscriptionType`, and `bookmarked` fields from all 11 public provider documents. Retain these fields in private accounts. Preserve business fields and services; round service-area coordinates and remove formatted addresses.
- Applied the 33 public-document writes in one transaction, with backup-version checks to abort on concurrent profile edits. The migration uses an explicitly initialized Admin client with the operator's existing Firebase CLI credentials; no service-account key was created.
- Deployed **only** `firestore:rules`; no Functions, Storage, or other services were deployed.
- Verified live data against the backup: all 22 private user documents are unchanged; all 11 providers remain, with business fields/services preserved; all 22 public identities exist.
- Verified through the app's public Firestore SDK after deployment: the marker-filtered discovery query returns 11 providers, each provider detail and corresponding public identity is readable, and private-account reads plus legacy unfiltered provider queries are denied. This is a live backend smoke test, not a completed iOS UI walkthrough.
- Five existing providers have no named services. Migration leaves them visible but does not invent services or make them bookable. Their owners must complete their service lists.

Do not restore old public provider documents or old rules blindly: that would re-expose copied private fields. For recovery, inspect `before.json` (typed source documents and prior ruleset) and `applied.json` (migration result), compare current versions, and restore only the approved fields/documents under restrictive rules. The backup is local to the operator's machine, not part of this repository.

## Repeatable deployment sequence

1. Back up Firestore and confirm a recovery path. Run the migration **without** `--apply` using credentials authorized for the intended project; review the counts and `removedFieldNames`. Check any unexpected fields before proceeding.
2. Run the migration with `--apply`, then inspect the newly projected identities and sanitized provider records. Under the old rules, old clients can still create new private-field-bearing provider documents; this intermediate state is not the security finish line.
3. Release the updated client to testers and deploy the new `firestore.rules` as a closely coordinated change. Old clients will not be compatible with provider registration/chat after the new rules; plan an update requirement for them.
4. Rerun the migration to catch records written by old clients between steps 2 and 3. The rules fail closed for any unmarked provider until this pass is complete. The migration is idempotent, but account/profile edits should be paused during the final pass to avoid racing the snapshot.
5. Verify discovery and provider details with a signed-out user; booking, chat, and reviews with requester/provider accounts; and rejection of cross-account `users` reads. Investigate providers without valid services separately.

From `apps/mobile/backend/main/src/functions`:

```sh
node scripts/migrate-public-profiles.js --project=PROJECT_ID
node scripts/migrate-public-profiles.js --project=PROJECT_ID --apply
```

The standalone migration uses Application Default Credentials outside the emulator. Operators may also call exported `migrateProfiles(db, { apply, expectedVersions })` with an explicitly initialized Admin Firestore client and a map of backed-up document versions (including `null` for absent target identities). Credentials must never be stored in source or backup files.

The migration plans all writes first and applies them atomically; it aborts if source profiles change during the run or if supplied backup versions no longer match. It currently caps the rollout at 400 writes; larger databases require a separately reviewed, checkpointed migration. It replaces provider documents to remove private fields; this is a deliberate destructive data cleanup and must not be run against production without the backup and dry-run review. It does not remove historical copies from backups, analytics, logs, or exports; review those separately.
