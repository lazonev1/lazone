# LaZone release-readiness checklist

Last reviewed: 2026-08-15

## Release status

LaZone has a working prototype for discovery, bookings, provider onboarding,
reviews, notifications, and requester/provider messaging. It is not ready for a
public release yet. The main blockers are trusted backend writes, payments,
provider verification, abuse handling, and production release validation.

Use this document as follows:

- **Completed and verified** records work that is already implemented and tested.
- **Remaining release work** contains only unfinished items, grouped by priority.
- A release candidate must satisfy every remaining priority item that applies to
  the launch scope.

## Completed and verified

### Core product flows

- [x] Authentication, provider discovery, bookmarks, booking requests, reviews,
  and push-message prototype flows are implemented.
- [x] Provider registration saves the provider profile and supports editing with
  saved business, location, services, and portfolio data.
- [x] A user who becomes a provider is refreshed into the provider role without
  requiring a logout/login cycle.

### Booking lifecycle

- [x] Provider actions support `pending → confirmed → in_progress → completed`.
- [x] Booking requests capture acceptance criteria; providers submit delivery for
  requester review, requesters can confirm or request changes, and only requester
  confirmation transitions the booking to `completed`.
- [x] Booking participants and allowed status transitions are enforced by
  deployed Firestore rules.
- [x] Status transitions write immutable audit events and the booking timeline
  displays the complete history.
- [x] Review eligibility requires the requester to open a completed booking;
  each booking can receive one review, with optional 500-character feedback.
- [x] Review submission has a dedicated booking-scoped screen, requester-only
  editing, provider response, one-user helpful voting, and deep-linked status
  notifications.

### Requester/provider messaging

- [x] A requester can open the provider conversation directly from a newly-created
  booking, even when no conversation exists yet.
- [x] Conversation creation is transaction-safe and uses a canonical participant ID.
- [x] Message creation and the conversation summary update are atomic.
- [x] Empty and overlong messages are rejected, route parameters are normalized,
  and subscription/read/typing errors are handled without unhandled promise errors.
- [x] Authenticated emulator tests cover first-contact creation, conversation-list
  access, requester/provider two-way messaging, and outsider read denial.

### Security, CI, and verification completed so far

- [x] Collection-specific Firestore rules are deployed to `lazonev1-5da5a`.
- [x] Firestore rules cover user ownership, booking access, booking transitions,
  immutable events, conversations, and nested messages.
- [x] Local Storage rules restrict user/provider media paths; review uploads remain
  disabled pending a verified upload flow.
- [x] TypeScript errors were resolved and the mobile lint command was repaired.
- [x] CI runs install, type-check, lint, function syntax, and authenticated
  Firestore security regression checks.
- [x] The explicit Firebase project ID is used for rules deployment.

## Remaining release work

### Priority 1 — trusted backend security

- [ ] Move cross-user writes from the mobile client to trusted Firebase Functions.
  - Review creation currently recalculates and writes another provider's rating
    from the client.
  - Booking status changes and provider verification should be validated in trusted
    code before production.
- [ ] Replace the temporary authenticated-write exceptions for `providers` and
  `reviews` with ownership-aware rules after aggregation, responses, and helpful
  votes move to trusted backend code.
- [ ] Initialize Firebase Storage and deploy the tightened Storage rules.
- [ ] Add server-side rate limiting and abuse controls for messaging and booking
  mutations.

### Priority 2 — complete the marketplace transaction

- [ ] Decide and implement the payment model: offline confirmation, mobile money,
  card processor, refunds, and payment records tied to bookings.
- [ ] Replace the mock payment-method wallet with persistent, processor-backed data.
- [ ] Define failure, cancellation, refund, and dispute states for paid bookings.

### Priority 3 — production-backed provider management

- [ ] Persist languages and certifications if they are part of the provider profile.
- [ ] Persist business visibility and show real profile-view and rating metrics.
- [ ] Complete portfolio/certification uploads and define the provider verification
  workflow.

### Priority 4 — trust, account, and notifications

- [ ] Implement password reset and account deletion/deactivation.
- [ ] Publish real Help, Terms, Privacy, and support/contact routes.
- [ ] Add review image upload, abuse reporting, moderation, and dispute handling.
- [ ] Make notification preferences server-enforced. Current direct-token message
  notifications bypass topic preferences.
- [ ] Deploy and verify booking status, payment, and reminder notification
  producers in the production Firebase project (booking-status code is ready;
  Functions deployment is intentionally still pending).

### Priority 5 — release operations and quality

- [ ] Add unit tests for services and repositories.
- [ ] Add end-to-end tests for signup, booking, provider acceptance/completion,
  messaging, review, and logout.
- [ ] Validate iOS and Android release builds with real Firebase credentials.
- [ ] Add crash reporting, analytics, monitoring, backups, and privacy/data-retention
  procedures.

## Release-candidate acceptance criteria

A release candidate must support a secure end-to-end journey: a user signs up,
discovers a provider, creates and pays for a booking, the provider accepts and
completes it, the user reviews the completed service, both parties can message each
other, and support/dispute paths are available.

Before public launch, all remaining Priority 1 security items and the launch-scope
items in Priorities 2–5 must be explicitly accepted or completed.
