# Saved Providers recovery (U05 / E04)

Previously, a failed provider lookup was discarded as though the provider did not exist.
A failed remove also hid the card even though Firestore still held the bookmark.

```text
Before: private bookmarks → skip unsuccessful reads → apparently empty list
        Remove → hide card → rejected write leaves the list out of sync

After:  private bookmarks → load each profile → available / unavailable / failed
                           → keep known cards on refresh failure and show retry
        Remove → show pending → acknowledge Firestore → remove card
                              → if rejected, keep card and explain failure
```

The same `users/{uid}.bookmarked` field and atomic array operations are used for
requesters and providers. The screen does not change Firestore rules or public data.
Only a server-confirmed bookmark list can report empty or decide how to toggle; the
account-specific cache remains a display aid. A failed provider lookup stays removable
but is not described as a deleted profile unless the read actually reports absence.
In-flight responses from a previous account or pre-removal refresh cannot repopulate
the current list.

## Verification

`pnpm --filter ./apps/mobile test:saved-providers` covers missing vs. failed reads,
stale data retention, duplicate removal, write rejection, refresh ordering, and
account switching. It also checks English/French copy. The existing demo Firestore
suite covers requester-to-provider bookmark access. The branch loaded the guest home
on the existing iPhone 15 Plus build. No signed-in bookmark writes were made;
complete the signed-in simulator checks before marking this slice ready.

1. With a disposable requester, save two providers and open Account → Saved Providers.
   Confirm open-profile and remove are separate actions.
2. Restart and verify the list. Interrupt network during a refresh; confirm the last
   loaded cards remain and Retry is available. Verify a rejected removal keeps its card.
3. Switch to a different disposable account and confirm the first account's saved
   providers never appear. Repeat save/remove as a provider.

### Native verification — November 21, 2026

Passed on iPhone 15 Plus (iOS 17.5, existing SDK 57 client), testing feature source
at `164c3ae` with only PR #114's local-Firebase configuration temporarily overlaid
in a separate checkout. All accounts and writes used `demo-lazone-mobile` locally.

- Requester saved a provider through its profile, opened the saved card, restarted
  the app and found the bookmark persisted.
- A rejected removal displayed an error and retained the card. Rejected provider
  reads retained the known card with last-loaded copy and Retry; restoring the
  local rules and retrying recovered normally. Successful removal showed empty.
- Switching to the provider showed its own empty list, not the requester's saved
  provider. The provider then saved and removed a second local provider.

The original emulator rules were restored after each fault injection. Shared
Firebase and EAS builds were not changed. Android was not run in this check.
