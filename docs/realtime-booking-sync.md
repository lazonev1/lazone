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
- `testFirestoreRules.mjs` checks that the provider's acceptance reaches active requester-list, provider-list, and detail listeners without reopening them.

## Deployment

No database schema, Firestore rule, native dependency, or migration changed. No Firebase deployment or EAS rebuild is needed.

## Verification and remaining gate

- TypeScript and focused ESLint checks pass.
- Full Auth/Firestore emulator and migration suite passes, including cross-account live acceptance and existing lifecycle/authorization tests.
- Production JavaScript bundle exports pass for iOS and Android; these are compilation checks, not native UI test sign-off.
- Native verification is **not signed off**: Metro served the iOS bundle, but simulator UI automation repeatedly timed out. Do not treat this as a passed two-device smoke test.
- Before marking B03 complete, keep requester and provider screens open simultaneously and exercise accept → start → submit → request changes → resubmit → confirm, plus cancellation, retry, logout/account switching, and edit-draft preservation. Confirm both iOS and Android UI behavior.
