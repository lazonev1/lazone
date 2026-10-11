# Marketplace payload validation

## Why this change is needed

The booking and provider forms previously rejected some invalid input, but Firestore accepted writes that bypassed the UI. A modified client could create a self-booking, use a nonexistent service, submit a negative price, add unknown fields, or store malformed checklist data. Provider rules also inspected only the first embedded service.

Client validation improves the experience; it is not a security boundary. Firestore must independently reject invalid data.

## Before

```text
Provider form ──writes──> providers/{providerId}.services[]
                              │
                              └─ rules inspect only services[0].name

Booking form ──writes──> bookings/{bookingId}
                              │
                              └─ rules verify requester + provider exists
                                 but do not bind the selected service,
                                 price, date, schema, or checklist contents
```

## After

```text
Provider form
   │ validates 1–5 complete, uniquely identified services
   ▼
Atomic Firestore batch
   ├─ providers/{providerId}.services[]        fast public discovery projection
   └─ providers/{providerId}/services/{id}     validated authoritative service
                         │
                         └──────────────┐
                                        ▼
Booking form ── client validation ──> bookings/{bookingId}
                                        │
                                        └─ Firestore independently requires:
                                           • requester is the signed-in caller
                                           • requester and provider differ
                                           • exact allowed document fields
                                           • selected service ID/name match
                                           • date 5 minutes–1 year ahead
                                           • positive integer CFA price
                                           • 1–5 bounded checklist outcomes
                                           • server timestamps and safe notes
```

The embedded service list remains the discovery projection, so browsing providers does not add a service query for every card. The nested service document is the authoritative bookable record and is kept in the same atomic batch as the projection. A service is readable and bookable only while its public parent provider exists and still publishes the exact same service in that projection, so an orphaned subcollection cannot remain bookable.

## Compatibility and rollout

A read-only production inventory on October 11, 2026 found 11 public providers: 6 have 9 valid services in total, and 5 have no service list and are already unbookable. No production data was changed.

The migration command is dry-run by default:

```bash
cd apps/mobile/backend/main/src/functions
node scripts/migrate-provider-services.js --project=lazonev1-5da5a
node scripts/migrate-provider-services.js --project=lazonev1-5da5a --apply
```

Rollout order is deliberate:

1. Create and review a Firestore backup/recovery point.
2. Run the migration dry-run and confirm the expected provider/service counts.
3. Apply the migration. It aborts if a provider changes during the transaction.
4. Deploy the matching Firestore rules.
5. Release/test the updated client, then verify provider editing and a requester booking with disposable data.

Do not deploy the rules before the backfill. Existing services would otherwise lack their authoritative nested documents. Older clients can still create bookings after the backfill, but provider catalogue writes require the updated atomic client; this is acceptable during development and must become an explicit minimum-version decision before public launch.

## Verification

- The Auth/Firestore emulator suite covers valid creation/editing and direct-SDK denial of self-bookings, nonexistent or renamed services, negative/fractional prices, past/over-horizon dates, unknown fields, malformed checklist data, unauthorized service writes, and deleting a still-published service.
- The migration test proves dry-run safety, apply behavior, and idempotency.
- TypeScript and focused lint pass. Full lint retains the repository's pre-existing warning baseline.

Production migration, rules deployment, and two-account native verification remain required before S05 can be marked complete.
