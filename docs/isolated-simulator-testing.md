# Isolated simulator testing (E03 / E04)

Previously, the Firestore switch could leave sign-in and uploads targeting the shared
Firebase project. A disposable test should never create accounts or files there.

```text
Normal development client → existing shared Firebase configuration (unchanged)
Local test bundle          → separate demo-lazone-mobile app/session
                           → 127.0.0.1 Auth, Firestore, Storage
                           → no app-driven push registration or Functions
```

## Run locally

Use Node 22+, Java 21 and the existing Expo SDK 57 development client. No new EAS build
or credentials are needed for this change. See the [Expo SDK requirements](https://docs.expo.dev/versions/v57.0.0/).
The ports 8080, 9099 and 9199 must be free. Stop another emulator suite first if it
owns those ports. From the repository root, open two terminals:

```sh
pnpm --filter ./apps/mobile serve:simulator
```

```sh
EXPO_PUBLIC_FIREBASE_EMULATORS=true EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=127.0.0.1 pnpm dev:mobile --localhost --port 8092
```

Use `127.0.0.1` on the iOS Simulator or `10.0.2.2` on the standard Android Emulator.
Physical-device LAN hosts are intentionally unsupported. Load that Metro session in
the installed development client. Verify the yellow **Local test mode** banner
before signing in. Create throwaway email/password accounts; do not enter live
credentials. Emulator records are disposable and are not imported from live Firebase.
Stop both owned sessions when done. Restart Metro without the two variables to return
to the normal shared environment. Do not put test variables on EAS build profiles.

For repeatable signed-in walkthroughs, run this while the local suite is running:

```sh
cd apps/mobile
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/seedSimulatorFixtures.mjs
```

It creates `requester@lazone-example.test` and `provider@lazone-example.test`, both
with the disposable local password `Local-test-only-123`. The latter owns a published
test service and retains requester capabilities. The script refuses other hosts and
always uses the demo project. Rerunning reuses the fixtures without resetting existing
profile edits. These credentials must never be used with live Firebase.

If you used the old `EXPO_PUBLIC_USE_FIRESTORE_EMULATOR` or
`EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST` variables, remove those settings rather than
mixing them with the new mode. A missing or invalid local host, a former Firestore-only
configuration, or an enabled test flag in a production bundle fails rather than
silently using live Firebase. The SDKs all point to a fixed demo project; an absent
emulator does not switch to shared Firebase.

The native binary still includes the normal client configuration and capabilities.
This mode disables app-driven FCM registration, subscriptions and handlers; it is
not an operating-system network sandbox. It does not test physical push delivery
or change deployed rules. See Firebase's
[Authentication](https://firebase.google.com/docs/emulator-suite/connect_auth),
[Firestore](https://firebase.google.com/docs/emulator-suite/connect_firestore), and
[Storage](https://firebase.google.com/docs/emulator-suite/connect_storage) emulator guides.

## Verification

`pnpm --filter ./apps/mobile test:simulator-firebase` starts only the local suite and
runs the actual application Firebase wiring and account service against it. The smoke
test checks fail-closed options, local signup/private+public profile creation,
Storage upload/read/delete, no native push calls, and login after sign-out.

On November 21, 2026, the existing iPhone 15 Plus build rendered the local banner
and disposable catalog without showing shared providers. The native login screen
successfully signed in the requester; its session survived app termination and
reopening. Logout returned to Login, and signing in the provider showed its own
identity, Business dashboard, and requester booking access. The Firestore/Auth/
Storage integration suite also passed, including repeatable fixture creation.
Android routing is covered by host checks but still needs an Android device run.

The [native test checklist](pr-native-test-status.md) records the remaining per-PR
cases and workstation blockers. Passing service tests does not clear native gates.
