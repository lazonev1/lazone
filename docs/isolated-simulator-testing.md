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

The existing iPhone 15 Plus build rendered the local banner and empty demo catalogue
without showing the shared providers. Signing in via the native screen and the
two-account requester/provider journey remain to be verified; Android routing is
covered by the host checks but not by an Android device run here.
