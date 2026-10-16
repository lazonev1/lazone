# Realtime chat recovery

## Why this change is needed

The chat screen previously treated navigation parameters as participant identity, marked a
conversation read whenever the message count changed, and wrote typing state on every
keystroke. Async Firestore mapping could finish out of order, and conversation-list mapping
failures were converted into an empty list. That could produce a forged/stale header,
background read receipts, excessive writes, cross-conversation flashes, or a false empty
state during an outage.

## Before

```text
Route name/avatar -------------------------------> chat header
message count change ----------------------------> write lastRead
every character ---------------------------------> write typing=true
subscription snapshot -> async mapping ----------> UI (any completion order)
mapping/listener failure ------------------------> [] / generic message
```

## After

```text
conversation ID
     |
     v
authorized conversation subscription
     |-- participantDetails ---------------------> chat header
     |-- missing/denied --------------------------> persistent Retry state
     `-- valid peer ------------------------------> message subscription

focused screen + foreground app + incoming ID ---> write lastRead once
first key in a typing burst ----------------------> typing=true
2 seconds idle / blur / background / unmount ----> typing=false
stale remote typing flag ------------------------> hidden after 5 seconds

snapshot N -> async mapping --+
snapshot N+1 -> async mapping +------------------> latest sequence only
listener/mapping failure ------------------------> keep prior data + Retry
```

The header no longer accepts `name` or `avatar` from a deep link. The stored conversation
record remains the authorized source, including a graceful fallback when a participant is
no longer available. Invalid conversations do not subscribe to messages or expose composer
actions that cannot succeed.

## Verification

- Mobile TypeScript passes.
- Full lint passes with zero errors and the existing repository warning baseline.
- EN/FR message-resource keys match.
- The Auth/Firestore emulator suite passes, including canonical first contact, participant
  read/typing permissions, message/summary integrity, and denied forged writes.
- iPhone 15 simulator smoke tests confirmed the production-backed conversation list loads,
  a valid conversation renders, forged route `name`/`avatar` parameters cannot change the
  stored participant header, and a nonexistent conversation shows the localized persistent
  Retry state without unusable composer controls.

No Firestore rules, schema, migration, Functions, indexes, or Firebase deployment are
required for this change. A final two-account device pass should still observe foreground /
background read receipts and typing appearance during real simultaneous use.
