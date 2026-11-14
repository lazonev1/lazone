# Role-aware booking transition policy — E01 slice

## Why

The transaction service previously checked a general status sequence, then only some role restrictions. It could try requester acceptance/start or provider cancellation of accepted work even though Firestore correctly rejected those writes. Unknown stored statuses could also cause an incidental array-access error rather than a deliberate rejection.

`utils/bookingLifecycle.ts` now owns a pure role/status policy. `bookingService.ts` checks it inside the transaction against the current record, before staging the status and linked audit-event writes. The module is client-side validation, **not** a trusted backend or replacement for Firestore authorization.

```text
Screen command
  → transaction reads latest booking
  → resolve participant role + validate exact transition
  → status update + matching new audit event
  → Firestore independently authorizes the entire write
```

| Current status | Requester can move to | Provider can move to |
| --- | --- | --- |
| Pending | Cancelled | Accepted, Cancelled |
| Accepted (`confirmed` in storage) | Cancelled | In progress |
| In progress | — | Awaiting confirmation |
| Awaiting confirmation | Completed, In progress (changes requested) | — |
| Completed / Cancelled | — | — |

Outsiders, signed-out users, malformed/shared participant identities, and unknown statuses are rejected. No new status, cancellation right, automatic completion, or permission is introduced. The existing change-request details and timeline payload remain unchanged.

## Evidence

- `test:booking-lifecycle` checks the complete role/status matrix, malformed statuses/identities, and the actual service with transaction doubles. Valid writes include their actor and linked audit event; invalid writes stage nothing.
- The Auth/Firestore emulator suite seeds isolated booking fixtures and tests all **108** combinations of six current statuses × six target statuses × requester/provider/outsider. Each actual rules outcome must match the production client policy. The complete pre-existing authorization and migration suites also pass.
- TypeScript and focused ESLint pass. CI runs the domain test and rules matrix.

This completes the booking-transition contract slice only; E01's wider architectural/schema work remains open. No UI/native dependency, Firestore rules/schema, migration, Firebase deployment, or EAS rebuild changes are required.
