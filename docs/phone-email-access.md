# Phone and email access — A04

Branch: `feature/phone-email-access`, based on `develop` after PRs #95 and #96.

## What was wrong

Signup required an email and password. The signup "phone number" was free text stored
on the private profile, not a Firebase Authentication credential, so people without email
could not join and a phone number could never be used to sign in.

## Product contract

- "Continue with phone" and "Continue with email" are equal first choices. Neither
  method requires the other, and both grant the same requester/provider capabilities.
- A phone number is proven by an SMS code. An email is confirmed by a link that is
  sent and shown, but not required to use the app (same immediate access as phone).
- A signed-in person may add the other method. Linking keeps the same Firebase UID, so
  role, bookings, messages, bookmarks, reviews, and provider data are unchanged.
- Each phone number and email belongs to at most one account (enforced by Firebase
  Authentication). Linking one that already signs in elsewhere fails with a recovery
  message; accounts are never merged, and never matched by profile contact fields.
- Changing the account's email address remains A02.

## Before and after

```text
Before: email + password (+ unverified phone text) → Auth account → profile

After:  ┌ Continue with phone → SMS code ─┐
        │                                  ├→ Auth account ─┬→ profile exists → app
        └ Continue with email ─────────────┘                └→ no profile → Complete profile → app
                 (signup also creates the profile and sends a confirmation link)

Account → Sign-in methods: add phone · change phone · add email · remove (never the last)
          └ older than 5 minutes since sign-in → confirm with password or SMS first
```

## Architecture: who verifies, who holds the session

```text
@react-native-firebase/auth            Firebase JS SDK (firebase/auth)
  verifyPhoneNumber()                    PhoneAuthProvider.credential(id, code)
  app verification + SMS   ──id──▶       signInWithCredential / linkWithCredential /
  (never signs in)                       updatePhoneNumber / reauthenticateWithCredential
                                                │
                                                ▼  the only session; Firestore rules see it
```

The JS SDK cannot send SMS codes in React Native (it needs a browser reCAPTCHA). The
native SDK performs app verification (APNs/Play Integrity, reCAPTCHA fallback) and
returns a verification ID; the JS SDK redeems it. Step-0 proof on Android confirmed that
a native verification ID signs in through the JS SDK, links to an email account, and
leaves the native SDK signed out. The temporary proof screen has been removed; iOS is
verified through the real sign-in flow on its development build.

Android "instant verification" can complete without an SMS, leaving nothing the JS
session can redeem. The form then asks for a new code instead of failing silently.

## Code and data changes

- `services/auth/phoneVerification.ts`, `hooks/usePhoneVerification.ts`: native code
  request, resend cooldown (60 s), Android auto-retrieval, instant-verification fallback.
- `components/auth/PhoneVerificationForm.tsx`: country picker (default Burkina Faso),
  E.164 normalization (`utils/phone.ts`, `libphonenumber-js`), SMS consent copy, one-time
  code autofill, resend, change number, persistent mapped errors, 48–52 pt targets.
- `app/(auth)/login.tsx`: method choice; email form without the phone field; Firebase
  error text replaced by localized messages (`accountAccessErrors.ts`).
- `app/(auth)/complete-profile.tsx` and `app/_layout.tsx`: any signed-in account with no
  profile (new phone number or interrupted signup) must complete it. The profile and
  public identity are created in one create-if-absent transaction, so two devices
  verifying the same new number produce one profile.
- `contexts/auth.tsx`: `profileMissing`, login `identities` read from Firebase Auth,
  identity refresh after link/unlink (they do not fire `onAuthStateChanged`), and a guard
  so email signup's early profile read is not mistaken for a missing profile. Push
  registration now also starts after a profile is completed or loaded on refresh.
- `app/account/login-methods.tsx`, `app/account/info.tsx`, Account tab, edit popup:
  identities come from Auth; the profile `phoneNumber` is no longer edited or shown as a
  login. New profiles store it as an empty string to keep the deployed rules schema. A
  legacy value is only a prefill for "Add phone", which still requires an SMS code.
- `authService.ts`: phone sign-in, profile completion, link/unlink/change, re-auth, and
  email confirmation requests; `updateUserProfile` no longer accepts `phoneNumber`.
- `functions/scripts/audit-legacy-phones.js`: read-only, masked report of legacy profile
  numbers (empty, needs country, available, already verified, verified by another
  account, shared by several profiles). It cannot write.
- Native: `@react-native-firebase/auth` (same 26.4.0 as the other RNFB modules) and its
  config plugin, which registers the iOS reCAPTCHA URL schemes. Requires new EAS builds.

No Firestore rules, indexes, Functions, or data migrations change: every rule keys on
`request.auth.uid`, which phone and email accounts share equally.

## Firebase configuration (owner actions, not in source)

| Setting | Required for |
| --- | --- |
| Phone provider enabled | Phone sign-in |
| Blaze plan (billing account) | Real SMS. Test numbers work without it |
| SMS region policy: allow only test + launch countries | SMS-pumping fraud protection |
| Budget alert | Cost visibility (alerts do not cap spend) |
| Android SHA-1 and SHA-256 in Project settings; Play Integrity API enabled | Android app verification |
| APNs auth key | iOS silent-push app verification (reCAPTCHA otherwise) |
| Phone numbers for testing | Native QA without SMS cost |
| One account per email address (default) | Email uniqueness |
| App Check enforcement **off** until the App Check SDK ships (S08) | Avoid rejecting all requests |

Record the values actually configured, with dates, in the release evidence.

## Verification

From `apps/mobile`:

```sh
pnpm test:access:emulator
```

The suite compiles the real services and runs them against local Auth + Firestore with
the repository rules. It covers phone-number normalization and error mapping; phone-only
and email-only signup; same-UID sign-in after linking in both directions; wrong and reused
codes; conflicts for phones and emails owned by another account (both left intact);
second-phone refusal; number change (old number becomes a separate, profile-less account);
removal with the last method protected; failed re-authentication; concurrent profile
creation from two devices; and refusal to create or replace another account's profile. A
second script checks the legacy audit's classification, masking, and read-only behavior.
CI runs both. TypeScript, lint (0 errors; 96 existing warnings), EN/FR key parity, the
rules suite, and the password-recovery suite also pass.

Emulator results are not evidence of SMS delivery, app verification, or native UI.

## Native acceptance before release

On iOS and Android development builds, in EN and FR, with test numbers and at least one
real number per platform:

1. Phone-only signup → Complete profile → book/message; restart; sign in again (same
   account, no second profile). Email-only signup and sign-in; confirmation email arrives.
2. Add phone to an email account and email to a phone account; sign out; sign in with each
   method and confirm the same profile, role, bookings, and business.
3. Conflicts: add a phone or email that belongs to another account; confirm the message
   and that neither account changed.
4. Change number; remove each method; confirm the last method cannot be removed; let the
   5-minute window lapse and confirm re-authentication by password and by SMS.
5. Wrong code, resend cooldown, change number, backgrounding during code entry, network
   loss, SMS autofill (iOS) and auto-retrieval (Android), instant verification fallback.
6. Large text, VoiceOver/TalkBack, keyboard on small screens.

Run `audit-legacy-phones.js` against the live project only with owner authorization, and
record the counts. Delete disposable test accounts afterwards. Phone users who lose their
number and have no email need a support path (A03).

## Rollback

The change is client-side. Once phone-only accounts exist, disabling the Phone provider
would lock them out; roll back by shipping a client fix instead. Removing email/phone
methods from accounts is never part of rollback.

References: [Firebase account linking](https://firebase.google.com/docs/auth/web/account-linking),
[Firebase phone authentication](https://firebase.google.com/docs/auth/ios/phone-auth),
[React Native Firebase phone auth](https://rnfirebase.io/auth/phone-auth).
