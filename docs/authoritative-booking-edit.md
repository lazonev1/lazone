# Authoritative booking editing

This change keeps booking editing tied to the current authorized Firestore record instead of trusting booking details copied into a navigation URL.

## Before

```text
Booking details screen
  └── route parameters
      ├── booking ID
      ├── provider ID
      ├── date and price
      ├── notes
      └── serialized checklist JSON
             │
             └── edit form trusts and parses these values

Provider accepts while requester edits
  └── client checks an older pending snapshot
      └── later update may fail without explaining the conflict
```

Malformed or stale navigation data could crash JSON parsing, show outdated terms, or place request details in navigation state where they were not needed.

## After

```text
Booking details screen
  └── route: /booking/edit?bookingId={id}
                         │
                         ▼
              authorized Firestore read
                         │
            ┌────────────┴────────────┐
            │                         │
    requester + pending        invalid / denied /
            │                  deleted / accepted
            ▼                         │
  prefilled edit form          safe recovery screen
            │
            ▼
  Firestore transaction
  ├── reread current booking
  ├── verify requester ownership
  ├── verify status is still pending
  └── update terms atomically
```

If provider acceptance wins the race, the transaction retries against the accepted record and rejects the edit. The form remains mounted with the requester's draft visible, explains what changed, disables another invalid submission, and links back to the current booking. If the edit commits first, the provider accepts those updated terms.

## Covered behavior

- Only the booking ID is carried through navigation.
- The form is prefilled from the latest authorized booking record.
- Current provider services are loaded separately; the booked service snapshot remains visible if that service was later removed.
- Invalid links, missing records, denied reads, malformed legacy data, missing provider data, and non-pending bookings have bounded recovery states.
- Only the original requester can edit, and only while the booking is pending.
- Firestore emulator coverage proves legitimate requester edits, provider/outsider denial, post-acceptance denial, and deterministic edit/accept race outcomes.

This ticket does not redefine booking field validation or service availability. Those remain S05/B01 in the release-readiness plan.
