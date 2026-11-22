# Storage rules foundation — S07 slice

## Policy

Existing `users/{uid}/…` and `providers/{uid}/…` paths are explicitly **public images**, never private evidence. Public gets remain supported; directory listing is denied. Only the path owner may create/update files, limited to nonempty JPEG/PNG/WebP objects at most **5 MiB**. MIME metadata validation is not file-content scanning. Owners may delete legacy/noncompliant files without having to satisfy upload validation. Other users/guests cannot mutate objects.

Review writes remain disabled; existing public review-image gets remain allowed. `private/…` and unknown paths remain closed to every client, including the owner. This does not enable private certificate uploads or claim to complete the secure media pipeline.

```text
Upload request → authenticated path owner?
               → public image path + approved MIME + 1 byte…5 MiB?
               → allow; otherwise deny
Delete request → path owner? → allow legacy cleanup
Private/review upload → deny until a separately reviewed workflow exists
```

## Verification

Run `pnpm --filter ./apps/mobile test:storage:emulator`. It pins Firebase CLI 15.5.1 and starts only local Auth + Storage for `demo-storage-rules`. The test fails closed without expected local emulator endpoints, initializes no production app, and uses disposable emulator accounts/objects. CI runs the same command. Tests cover ownership, forged metadata, public gets, cross-user/anonymous writes/deletes, unsupported MIME, empty/oversize/exact-boundary files, metadata updates, listing denial, legacy cleanup, preserved review reads, and private/unknown paths. TypeScript/focused lint and the actual Storage rules emulator suite pass.

The emulator uses port 9199 bound to localhost. This does not enable Storage emulation in the mobile app; the existing mobile Firestore-only switch still does not isolate Auth/Storage.

## Deployment gate — do not deploy yet

No live rules, files, or Firebase configuration values were changed. A read-only `gcloud storage buckets list --project lazonev1-5da5a --format='value(name)'` returned no bucket names with the current identity. The active `.appspot.com` and legacy `.firebasestorage.app` source values therefore remain unresolved; neither was guessed or rewritten.

Before a separately authorized deployment: verify the actual bucket in Firebase/Cloud Console, inventory existing public-path objects and download-token URLs, move/revoke any private evidence mistakenly stored publicly, confirm app clients do not depend on listing or unsupported formats, save the current deployed policy, and deploy only the reviewed Storage target. Existing tokenized download URLs may grant access independently of SDK rule reads; changing rules is not a token-revocation/migration strategy.

S07 stays open for verified bucket targeting, private-evidence design, content scanning/metadata cleanup, quotas, durable upload/record/display/replacement/deletion flows, device testing, and intentional rollout. See [Firebase rule conditions](https://firebase.google.com/docs/storage/security/rules-conditions) and [Storage emulator isolation](https://firebase.google.com/docs/emulator-suite/connect_storage).
