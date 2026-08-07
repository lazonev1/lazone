# LaZone release-readiness checklist

Last reviewed: 2026-07-18

## Current status

LaZone has working prototype flows for authentication, provider discovery, bookmarks,
booking requests, real-time messaging, provider onboarding, reviews, and push-message
notifications. It is not ready for a public release yet: security, transaction
completion, payments, and automated verification remain incomplete.

## Priority 1 — secure and stabilize

### Current implementation status

- Booking ownership and Storage access have been hardened locally and validated
  with TypeScript, ESLint, and the Firestore emulator.
- Provider rating aggregation, provider responses, and helpful votes deliberately
  remain client-side during development. Their required broad Firestore write
  exceptions are documented in `firestore.rules`; move them to trusted backend
  code before production.
- The Firestore policy was deployed to `lazonev1-5da5a` on 2026-07-18 without
  adding Cloud Functions. Firebase Storage has not yet been initialized, so its
  tightened local rules remain pending deployment.
- Do not tighten provider/review mutations beyond the documented temporary
  exceptions until rating aggregation, provider responses, and helpful votes are
  moved to trusted backend code.

- [x] Define and deploy collection-specific Firestore rules for the active app
  collections. User ownership, booking participants and transitions, and
  conversation message access are restricted in the deployed policy.
- [ ] Replace the temporary authenticated-write exceptions for `providers` and
  `reviews` with ownership-aware rules after rating aggregation, provider
  responses, and helpful votes move to trusted backend code.
- [ ] Move cross-user writes from the mobile client to trusted Firebase Functions.
  - Review creation currently recalculates and writes another provider's rating from
    the client. Secure rules should deny that; calculate ratings in a Function instead.
  - Booking status changes and provider verification should be validated in trusted code.
- [x] Tighten local Storage rules so users can only write their own user and
  provider media paths; review uploads are disabled pending a verified flow.
  Deployment remains pending Firebase Storage initialization.
- [x] Use the explicit Firebase project ID for the Firestore-rules deployment.
- [x] Resolve TypeScript compilation errors and repair the mobile lint command.
- [x] Add CI checks for install, type-check, lint, function syntax, and Firestore
  security regression tests.

## Priority 2 — complete the marketplace transaction

- [x] Implement provider actions for `confirmed → in_progress → completed`.
- [x] Enforce booking transitions and participant ownership in deployed Firestore rules.
- [x] Enable the completed-booking review eligibility check.
- [ ] Decide and implement the payment model: offline confirmation, mobile money,
  card processor, refunds, and payment records tied to bookings.
- [ ] Replace the mock payment-method wallet with persistent, processor-backed data.

## Priority 3 — make provider management production-backed

- [x] Replace the mock-data provider preview with the saved Firestore provider profile.
- [x] Prefill provider registration editing with saved business, location, services,
  and portfolio data.
- [ ] Decide whether languages and certifications need persistent provider-profile
  storage; they are not currently saved by the registration flow.
- [ ] Persist business visibility and show real profile-view/rating metrics.
- [ ] Complete portfolio/certification uploads and decide the provider verification flow.

## Priority 4 — complete trust, account, and notifications

- [ ] Implement password reset and account deletion/deactivation.
- [ ] Publish real Help, Terms, Privacy, and support/contact routes.
- [ ] Add review image upload, abuse reporting, moderation, and dispute handling.
- [ ] Make notification preferences server-enforced. Currently only message pushes have
  a backend trigger, and those direct-token notifications bypass topic preferences.
- [ ] Add booking, payment, and reminder notification producers if those settings remain.

## Priority 5 — release operations

- [ ] Add unit tests for services/repositories and integration tests against Firebase
  emulators.
  - [x] Add authenticated Firestore rules regression coverage for booking
    transitions and immutable status events.
- [ ] Add end-to-end tests for signup, booking, provider acceptance/completion,
  messaging, review, and logout.
- [ ] Validate iOS and Android release builds with real Firebase credentials.
- [ ] Add crash reporting, analytics, monitoring, backups, and privacy/data-retention
  procedures.

## Done criteria

A release candidate should support a secure end-to-end journey: a user signs up,
discovers a provider, creates and pays for a booking, the provider accepts and completes
it, the user reviews the completed service, and both parties can receive support.
