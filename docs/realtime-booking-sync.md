# Realtime booking synchronization (B03)

## What was wrong

Requester bookings, provider bookings, and booking details were fetched when a screen opened or regained focus. Someone could keep seeing old statuses and action buttons while the other participant changed the booking. Failed optimistic actions restored a captured whole list, potentially undoing newer updates to unrelated bookings.

## Before → after

```text
Before
Open screen → fetch once → display status
Other participant changes booking → screen stays stale until reopened
Failed action → restore an older copy of the entire list

After
Requester/provider action → authorized Firestore transaction
                         → booking snapshot
                         ├─ requester list updates
                         ├─ provider dashboard updates
                         └─ detail status/actions update
                            └─ refresh authoritative timeline, latest response only
```

## How the files connect

- `bookingService.ts` subscribes to participant-scoped booking queries and individual records. Existing Firestore rules remain the authorization boundary.
- `bookingRepository.ts` maps snapshots into screen data. Details refresh their optional timeline after each booking update; stale asynchronous responses are ignored, and timeline failure does not block current status/actions.
- `useBookings.ts` shares a subscription lifecycle across requester/provider/detail views. Account/booking changes hide old data immediately, cleanup cancels old callbacks, and Retry restarts the live subscription. Initial loading and refreshing are separate. Permission-denied errors clear previously loaded data.
- Booking screens retain same-account content on recoverable errors, show a localized Retry state, and avoid claiming an initial failed read means there are no bookings. Mutations no longer overwrite snapshots or roll back whole lists.
- `testFirestoreRules.mjs` keeps both participants' list and detail listeners alive across acceptance, start, checklist changes, submission, requested changes, resubmission, and completion.
- `testBookingSync.mjs` runs the real hooks/repository with deterministic callbacks to cover account isolation, listener retry/setup errors, permission revocation, failed-mutation preservation, retry-safe creation IDs, and timeline races. CI runs it before the emulator suite.

## Deployment

No database schema, Firestore rule, native dependency, or migration changed. No Firebase deployment or EAS rebuild is needed.

## Verification — November 22, 2026

The PR working tree was resolved against develop `c85a67a`, retaining its retry-safe booking creation and message-history changes. Under Node 22.22.0 / pnpm 10.11.0:

- TypeScript, hook/repository regression checks, full Auth/Firestore authorization tests, and both migration suites passed. Full lint had no errors (94 existing warnings).
- All four SDK listeners stayed attached through the full completion lifecycle and received every tested status/checklist change.
- Actual iOS testing used an iPhone 15 Plus requester and iPhone SE provider, both on iOS 17.5, with the matching SDK 57 development client. Only temporary Firebase/session/push-isolation configuration from the separate testing branch was overlaid; the booking source and rules were this PR's. That overlay was removed afterward and is not part of the PR.
- The requester created a booking through the app. With both detail screens left open, provider acceptance, start, checklist completion, submission, requester changes, resubmission, and requester confirmation propagated live. Both timelines retained the complete event sequence. The provider dashboard showed one completion and 2500 CFA earnings.
- Separate SDK-seeded local fixtures appeared on the open provider dashboard without refresh. Cancelling one through the requester UI updated the already-open provider detail, removed its actions, and moved the requester entry from Active to Cancelled.
- No shared Firebase deployment, migration, rule change, or live booking mutation was performed for this test.

## Resumed iOS verification — November 23, 2026

- Unsaved edit preservation passed: the open form retained its typed price and note while a second authorized local session updated the saved booking. Returning without saving showed the separate server update, not the abandoned draft.
- Permission-loss recovery passed on booking details, the requester list, and the provider dashboard. A local-emulator-only denied-read policy caused private records/actions to clear and displayed Retry rather than false empty/not-found content. Restoring the exact original local policy and tapping Retry reattached each listener and restored current data without reopening the screen.
- Logout/account switching passed in both directions on the same simulator. After requester logout, provider sign-in showed an empty requester Booked list and the correct business records; switching back restored only the requester's Active/Completed/Cancelled entries.
- No additional application defect was found in these resumed native checks. The temporary test configuration and injected local policy are not PR changes.

## Android handoff

The project owner accepted the completed iOS verification as sufficient for this PR; Android testing is owned by the coworker who normally runs it. B03's release checklist remains unchecked until that Android verification is recorded, but it is not a blocker to reviewing this PR.

The existing Pixel 5 / API 31 emulator booted, and the completed SDK 57 APK was available, but the desktop controller could not attach to its unbundled emulator process (`Invalid app` by both executable path and process name). No Android walkthrough is claimed. Earlier JavaScript bundle exports and successful EAS builds are compilation evidence only, not Android runtime sign-off.
