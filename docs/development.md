# Development, testing, and release operations

## Environment boundaries

| Workflow | Data target | What it verifies |
| --- | --- | --- |
| `test:rules:emulator` | Local Auth + Firestore, `demo-rules` | Allowed and denied SDK writes |
| `serve` | Same local demo project, no persisted import | Manual emulator inspection |
| Mobile development client | Shared `lazonev1-5da5a` | Native flows against deployed services |
| EAS build | Remote build service | Native compilation and packaged app |

From the root, run `pnpm --filter ./apps/mobile test:rules:emulator`. Java 21 and free
ports 8080 (Firestore), 9099 (Auth), and 4000 (UI) are required. The script pins Firebase
CLI 15.5.1, starts both emulators, runs `testFirestoreRules.mjs`, and stops afterward.
Denial tests intentionally log permission errors; the final exit code determines success.
The first run needs network access to obtain the CLI/emulator binaries.

Fixtures are generated from source with a unique run identifier. No Admin key, production
export, real phone number, or referral seeder is needed. Keep the `demo-rules` project ID.
The `demo-` project has no live resources. `serve` excludes Functions because notification
handlers can call external FCM services; emulating Functions alone does not isolate those calls.

The mobile `EXPO_PUBLIC_USE_FIRESTORE_EMULATOR` switch redirects **only Firestore**, not
Auth, Storage, or native messaging. It is not a fully isolated device test mode. Do not
substitute it for the automated demo-project suite. Full device emulator configuration
needs separate implementation and verification under E04.

## Remote EAS archive and native runtime

Use root build scripts. The iOS simulator script builds only iOS remotely. Xcode supplies
the local simulator; EAS supplies compilation. Install a new development client after
native dependency changes.

The root `.easignore` controls the monorepo archive. It excludes local state, generated
native folders, credentials, and backups while including the two Firebase **client**
files. Never put an Admin key in those paths. Keep credentials outside the repository;
ignore patterns are not a secret scanner.

Inspect the archive before a build, using a fresh output directory outside the repository:

```sh
pnpm --filter ./apps/mobile exec eas build:inspect --platform ios --profile simulator --stage archive --output /tmp/lazone-ios-archive
```

Verify `apps/mobile/GoogleService-Info.plist` and `apps/mobile/google-services.json` are
included, while `.env` files, `.private-backups`, keys, and emulator exports are absent.
This does not submit a remote build. Do not commit the archive. Fix missing configuration
through local presence/archive inclusion, not by changing Git tracking.

References: [Expo archive exclusions](https://docs.expo.dev/build-reference/easignore/),
[Firebase environment safety](https://firebase.google.com/docs/projects/dev-workflows/general-security-guidelines).

## Native acceptance testing

Use the [release acceptance matrix](release-readiness.md#release-candidate-acceptance-matrix)
and record commit, EAS build ID, device/OS, locale, account roles, and results.

- Use distinct disposable requester/provider accounts. Verify provider conversion preserves
  requester capabilities, then book, message, submit, confirm, and review from both sides.
- Test notification/location permissions allowed and denied in OS settings. Simulator
  testing does not establish physical-device push delivery.
- Test notification taps foregrounded, backgrounded, and terminated; include signed-out,
  wrong-account, and missing-record cases. Inspect `app.json` and notification routing for
  supported destinations; do not invent a URL scheme.
- Repeat relevant paths in EN/FR, with large text, keyboard open, network loss, and retries.
- Clean up only recorded disposable IDs. Never bulk-delete collections to reset testing.

## Explicit deployments and rollback

Deployment is a separate owner-authorized action after review/tests. A merged PR or green
CI does not deploy Firebase. Capture the deployed policy/version and project before changing
it; keep migration backups outside Git and build archives.

From `apps/mobile`, select the explicit project and deploy only the reviewed target:

```sh
# Replace PROJECT_ID after verifying the intended environment.
pnpm dlx firebase-tools@15.5.1 deploy --project PROJECT_ID --only firestore:rules
pnpm dlx firebase-tools@15.5.1 deploy --project PROJECT_ID --only storage
pnpm dlx firebase-tools@15.5.1 deploy --project PROJECT_ID --only functions
```

These are alternatives, not a routine sequence. Verify the real Storage bucket before
Storage deployment (S07). Functions need separate runtime and delivery verification
(N01/N02). Avoid bare `firebase deploy` for an unrelated rules change.

No checked-in indexes manifest is currently configured in `firebase.json`. Do not claim
indexes deploy with rules. Review live indexes, add a reviewed manifest/config when needed,
then deploy `firestore:indexes` explicitly; inspect proposed deletions before accepting.

After deployment, verify allowed/denied flows and record the deployed commit/time. For
rollback, use a separate checkout of the approved previous policy, test it, and redeploy
only that target to the explicit project. Check old/new client compatibility first.
Rules rollback does not restore documents; data recovery needs the E05 backup/migration
procedure and applicable rollout document.

No automatic deployment or PR merge is part of the local commands in this guide.
