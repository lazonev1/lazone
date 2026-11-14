# Provider reviews and booking review recovery (B09)

Business → Reviews previously opened without a provider ID. The sort buttons changed
selection without changing order, and the owner preview relied on a legacy reference list
that is not maintained by review writes.

```text
Before: Business shortcut without ID → empty review page
        Owner preview → legacy references; public profile → review documents
        Saved review → follow-up read or summary failure → misleading save error

After:  Business shortcut / profile → provider ID → public review documents
                                    → shared list, rating summary and sorting
        Completed booking → verify requester and review claim → save once
                          → acknowledge the write → refresh derived data separately
```

- Public and owner profiles calculate their displayed rating and count from the same
  review documents as the full list. This avoids claiming reviews exist based on a stale
  provider aggregate when the canonical list is empty.
- Sort order is most recent, highest rated, or lowest rated; equal ratings use date and
  then ID. A failed read has a retry, not a false empty list.
- Only the reviewed provider can create or edit their one public reply. Requesters can
  still edit/delete their own review. Failed edits retain the draft. No rules, live data,
  or review eligibility changed.
- The booking form waits for the one-review-per-booking check, makes failures retryable,
  and links already-reviewed bookings to the provider's review list rather than letting
  the requester submit again. A follow-up read or the temporary rating update is not
  required to acknowledge a committed review.

## Verification

Run `pnpm --filter ./apps/mobile test:review-experience`. This exercises the actual
presentation and handlers with simulated data/feedback, not a substitute for native tests.
The iPhone 15 Plus development client loaded the current app and verified guest profile →
View All → Reviews → Back with existing Firestore data. No live review was created or modified.

Before marking B09 complete, run a disposable two-account journey: submit a review from
a completed booking; verify the Business shortcut, sort with at least two different ratings,
edit/delete the review, submit/edit the provider reply, and check guest visibility. Dedicated
single-review navigation and scalable review pagination remain follow-ups. S10 still owns
trusted aggregate ratings used in discovery; this PR does not change that policy.
