# LaZone notification Functions

`index.js` contains `sendNewMessageNotification` and `sendBookingStatusNotification`.
They read participants and user notification tokens, send FCM notifications, and remove
invalid tokens. Source code is not deployment/delivery evidence; see N01/N02 in the backlog.

Install workspace dependencies from the root with `pnpm install --frozen-lockfile`.
For setup, testing, deployments, and rollback, use the
[development runbook](../../../../../../docs/development.md).

The standard `serve` and `test:rules:emulator` commands start only demo Auth/Firestore.
They do not test notification delivery. A Functions emulator can still call external FCM
APIs; redirecting Firestore alone does not isolate native Auth or messaging. Use disposable
accounts/tokens in an explicitly selected test environment for notification testing.

Before an authorized Functions deployment, verify the project, dependency/runtime
compatibility, recipient preferences, retry behavior, and real-device delivery matrix.
Firestore rule deployments do not deploy these functions.
