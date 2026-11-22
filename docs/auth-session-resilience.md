# Authentication session resilience

## Why this changed

Authentication and the private Firestore profile are separate records. The app previously treated them as one unguarded asynchronous operation. A slow profile read could overwrite a newer account, a failed read could leave startup loading forever, manual refresh blanked the navigation tree, and local state was cleared even when Firebase sign-out failed.

## Before

```text
Firebase auth event -> set user -> fetch profile -> set profile -> stop loading
                                     |
                                     |- rejected read: loading may never stop
                                     `- late result: may replace a newer session

Refresh profile -> global app loading -> navigation disappears

Logout -> clear notification token -> try Firebase sign-out
                                     `- local user cleared even on failure
```

## After

```text
Firebase auth event
        |
        v
new session version + cancel old profile/token work
        |
        v
set authenticated user and clear the previous user's profile
        |
        v
load profile for {UID + session version}
        |- still current -> apply result and initialize notifications
        `- stale         -> discard result

Profile refresh -> keep current UI -> refresh profile only -> show retry on failure

Logout -> detach this device's token -> Firebase sign-out
        |- success -> auth listener clears the session
        `- failure -> keep the user signed in and restore notifications
```

## Code and data changes

- `contexts/auth.tsx` makes the Firebase auth listener the single session authority, separates initial-session loading from profile refresh, rejects stale profile results, and preserves the session when sign-out fails.
- `services/notifications/pushNotifications.ts` keys token initialization to the active account and waits for an in-flight token write before logout cleanup.
- `backend/main/src/services/authService.ts` rolls back a newly created Auth user if the required atomic private/public profile write fails.
- `backend/main/src/config/firebase.ts` now returns a typed Auth instance, reuses it only for the expected fast-refresh case, and fails visibly on unexpected initialization errors instead of exporting `undefined`.
- `app/_layout.tsx`, the Account tab, and Account Info distinguish initial loading, profile recovery, and sign-out progress without blanking or navigating early.
- New signup profiles no longer store the current date as a false date of birth. `User.dob` is optional, matching the deployed data contract and Firestore rules. Existing DOB values are left unchanged because their accuracy cannot be inferred safely.
- `reviewService.ts` captures the authenticated UID before its transaction, required by the now-correct Auth type and safer if auth changes during the operation.

No Firestore rule, index, Function, schema migration, or Firebase deployment is required.

## Verification

- Mobile TypeScript passes.
- Focused ESLint passes with no warnings; full mobile lint passes with 0 errors and 52 pre-existing warnings.
- English/French Auth and Account resources have matching keys.
- The full Auth + Firestore emulator rules suite passes, including creation of a valid requester profile without `dob`.
- The iPhone 15 development client restores the existing provider session/profile after a full JavaScript reload without a runtime error or profile-loss screen.
- No production record was changed.

Final release acceptance still requires a disposable-account native pass for signup rollback/retry, failed-profile recovery, failed sign-out, and rapid two-account switching. Those destructive and failure-injection cases were not performed against the live project.
