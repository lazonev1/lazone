# Password recovery — A02 implementation slice

Branch: `fix/password-recovery`, based on `develop`, independent of open PRs #85–#88.

## What was wrong

Forgot password displayed a promise but never called Firebase. Login advertised phone
sign-in despite accepting only email/password, and Remember me changed local checkbox
state without changing authentication persistence.

## Before and after

```text
Before: Forgot password → informational alert → no email → user still locked out

After:  Forgot password → prefilled email → validate → Firebase Authentication
            ↑                   │                         │
            │                   └─ failure: keep draft ←─┤
            │                                             └─ reset email
            │                                                  │
            └─ return to sign-in ← choose password in Firebase's hosted reset page
```

Firebase validates the reset code and changes the Authentication credential. No password
is stored in Firestore; no user/provider/public-profile documents, rules, or schema change.
Requesting a reset does not sign the user in or change their password by itself.

The confirmation is conditional and identical for known/unknown accounts. The service
also normalizes legacy user-not-found/disabled responses. This avoids exposing those
errors in the UI; it does not replace project-level email enumeration protection or
Firebase's server throttling. Network/quota failures remain visible and retryable.

The form retains the email on error, prevents concurrent sends, waits 60 seconds before
resending after success, supports Android Back, and returns the corrected email to login.
Email stays in component memory, not route parameters or logs. Returning clears the old
password input. EN/FR copy, email keyboard/autofill, labels, live error announcements,
scrolling, keyboard avoidance, and minimum 48px actions are included.

Login now says Email address. Removing Remember me does not change existing persistent
authentication; signing out remains the way to end the session on the device.

## Verification

From `apps/mobile`:

```sh
pnpm dlx firebase-tools@15.5.1 emulators:exec --project demo-recovery --only auth "node scripts/testPasswordRecovery.mjs"
```

The test compiles the actual service without importing the live/native configuration.
It checks validation, normalization, locale selection, error classification, and account
existence privacy, then creates a synthetic account in local Auth, requests/consumes its
reset code, rejects code reuse and the old password, and signs in with the new password.
The test refuses to run outside the loopback Auth emulator. CI runs the same suite.

TypeScript, mobile lint, and EN/FR key/interpolation parity are also checked.
Emulator behavior is not evidence of inbox delivery or hosted-page rendering.

## Native/manual acceptance before release

1. Enter an email at login; open Forgot password and verify prefill. Test empty/invalid
   input, network failure, repeated taps, Back, and returning with a corrected email.
2. With an agreed test inbox, request a link in EN and FR. Verify delivery, template
   language, spam handling, and the configured Firebase-hosted page. Select a new password;
   confirm the old password fails and the new one works. Reusing the link must fail.
3. Check unknown-account confirmation, large text, screen reader, keyboard scrolling,
   Android Back, and the resend cooldown on native devices.

No live reset emails, Auth configuration changes, Firebase deployment, or native build
were performed for this PR. Native/inbox acceptance remains open. Broader A02 email-change,
profile validation/identity synchronization, and avatar work remain separate backlog items.

Firebase reference: [manage users and send reset emails](https://firebase.google.com/docs/auth/web/manage-users#send_a_password_reset_email).
