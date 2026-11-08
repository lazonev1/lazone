# Release preflight and recovery — E05 foundation

## What changes, and why

Previously, a developer could copy a deployment command without first checking the
project, checkout, or whether the change had merged. The new preflight prints a
read-only plan with the chosen target, merged commit, and source hashes. It has no
deployment, migration, export, import, or merge action. Existing development/app
commands and the live database are unchanged.

```text
Before: local files → copied deploy command → live Firebase

After: reviewed PR → human merges → refresh develop → clean approved commit
         → read-only preflight + target tests
         → review live versions / recovery evidence → separate owner approval
         → authorized operator deploys ONE target → allowed/denied smoke tests
         → save deployment evidence / stop or roll back if checks fail
```

This is a source-validation aid, not a deployment lock or proof of production
readiness. It cannot prevent someone from running the Firebase CLI directly.

## 1. Produce a plan (no live writes)

After the owner has merged the PR, from the repository root:

```sh
git fetch origin
git status --short
git rev-parse HEAD
pnpm test:release-preflight
pnpm release:preflight --project lazonev1-5da5a --target firestore:rules --commit FULL_APPROVED_COMMIT_SHA
```

Replace the last argument with the full approved 40-character SHA. Check out that
commit using your normal safe branch workflow first; do not discard local changes.
The preflight refuses dirty/untracked work, a different HEAD, or a commit not
reachable from the refreshed local `origin/develop`. Source bytes must match Git,
even if a file was marked assume-unchanged. Source paths must remain inside the
checkout and be tracked. The script never fetches or changes branches itself.

Choose exactly one target: `firestore:rules`, `storage`, or `functions`. The project
must match the active checked-in Firebase configuration. Storage also requires
`--bucket VERIFIED_BUCKET_NAME`, matching both checked-in bucket configurations.
The current active/legacy bucket names disagree, so Storage preflight intentionally
blocks; independently establish the live bucket and fix the configuration in a
reviewed change. Do not guess the bucket suffix or bypass the check.

The JSON includes SHA-256 hashes of configuration, manifests/lockfile, and the
selected rule file or tracked Functions sources; optional `.firebaserc` files must
also be tracked and are hashed. It prints a manual command as an array but never
runs it. Save the plan in the release evidence, outside Git/build archives.

## 2. Verify the actual deployment boundary

Before requesting deployment approval, the operator must record:

- Project ID, database ID/location, live bucket if applicable, operator, UTC time,
  approved commit, PR, plan, and target-specific test results.
- The current deployed rules/version or Functions revision, and the reviewed
  candidate. Source hashes do **not** establish what is currently deployed.
- The exact Firebase config/target mappings and all hooks. Inspect the final
  Functions upload inputs, ignored/local dependencies, environment and secrets
  separately: this tool hashes tracked source, not the deployment archive.
- Old/new client compatibility, validation steps, stop conditions, and a known
  safe previous revision. A previous revision that reopens a security issue is
  not an acceptable rollback merely because it is older.

Run the relevant demo-project rule tests and app regression checks. For Functions,
verify runtime/trigger behavior separately. There is currently no checked-in
Firestore index manifest; this preflight does not support index deployment.
Emulator checks do not prove live IAM, bucket selection, notification delivery, or
native UX. Never substitute a passing plan for these checks.

## 3. Migration backup and restore gate (separate approval)

A rules-only release does not automatically need a document migration. If data
will change, require a reviewed plan before any Admin write:

1. Name the project, database, affected collections **and subcollections**, script
   revision, expected counts, old/new schema, rollback owner, and maintenance plan.
2. Inspect that script's actual dry-run behavior. Capture a read-only report,
   affected IDs/counts, validation failures, and expected changes; review it before
   approving apply. Do not assume every script has a safe dry-run mode.
3. Arrange an approved recoverable backup in a restricted, verified bucket or
   managed backup service. Confirm billing, IAM/service-agent access, location,
   retention/deletion, costs, and successful completion. Never store exports or
   Admin credentials in Git, public media paths, or EAS archives.
4. Establish a consistent recovery boundary: pause relevant writes, or verify an
   appropriate supported point-in-time backup. An ordinary running export can
   include concurrent changes; its start time is not a guaranteed snapshot.
5. Restore into an isolated, empty non-production database/project with approved
   IAM and external side effects disabled. Compare expected IDs, subcollections,
   counts, schema/privacy invariants, and representative application reads.
   Record the operation IDs, timings, and results before trusting the backup.
6. Apply only after separate approval. Require idempotency, bounded batches,
   checkpoints and stale-data preconditions where needed. Stop on unexpected
   counts/conflicts; do not blindly retry destructive work. Verify invariants and
   record partial completion so recovery does not overwrite legitimate new data.

Firestore exports are documents, not a complete Firebase backup: separately
preserve/review rules, index definitions, Auth, Storage objects and Functions
configuration as appropriate. Import overwrites matching document IDs and leaves
other documents; it is **not** a database reset or a safe automatic rollback.
Imported changes do not trigger Firestore Functions, so plan any required derived
state reconciliation explicitly. Never bulk-import into the live database as a
casual recovery experiment. The managed export/import prerequisites and behavior
are documented by [Firebase](https://firebase.google.com/docs/firestore/manage-data/export-import).

## 4. Authorized deployment, verification, and rollback

After explicit owner approval, refresh evidence and rerun the preflight immediately
before the operator runs the plan's one-target manual command from `apps/mobile`.
It pins Firebase CLI 15.5.1, names `firebase.json`, and passes the project explicitly.
Do not concatenate targets or run a bare `firebase deploy`. Review config hooks
first. The CLI supports [partial deployments](https://firebase.google.com/docs/cli#partial_deploys).

Verify deployed policy/version against the intended project/commit, then exercise
both allowed and denied paths with recorded disposable accounts. Check provider
discovery, booking, messaging and reviews as relevant. Watch permission errors,
failed writes/side effects and unexpected read volume; stop rollout on regressions.
Store timestamps, versions, smoke-test results and the responsible operator, with
no private message content, tokens, or personal data in logs.

If checks fail, stop and communicate the impact. For a compatible rules/code
rollback, use a clean checkout of the separately approved safe previous revision,
rerun its tests/preflight, obtain rollback approval, deploy only that target and
repeat verification. Old source layouts may require a reviewed manual equivalent;
do not bypass a failed check silently. Rules rollback cannot undo document writes;
data recovery requires the reviewed restore/compensation plan above.

## Evidence and remaining work

Automated tests use disposable local Git fixtures and cover project/target/commit
checks, clean/merged requirements, source hashes, hidden source edits, path escapes,
bucket mismatches, and read-only behavior. CI runs these tests; it does not deploy.

No live export, restore, migration, rules deployment, or EAS build was performed for
this foundation. E05 stays open for an executed isolated restore drill, verified
live deployment evidence, approved retention/recovery objectives, privacy-conscious
monitoring/alerts and support ownership. No native module change is involved.
