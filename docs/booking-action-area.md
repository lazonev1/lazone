# Booking action area

## Why this changed

The booking detail screen placed its actions after the full timeline. During requester review, it also repeated the same instruction above the checklist and beside the actions, while showing the change-request field before the requester chose that path.

## Before

```text
Status → details → duplicated review guidance → checklist → timeline
                                                        ↓
                              actions and always-open change form
```

The next step could be below the fold, the requester had to interpret duplicate guidance, and the keyboard could separate the change reason from its send button.

## After

```text
Scrollable details → checklist → timeline
                         +
          safe-area-aware role/status action panel
                         ↓
       valid next action(s) for this participant

Requester review:
Confirm completed work ──or── Request changes
                                  ↓
                     reveal reason → send/back
```

- `app/booking/[id].tsx` now keeps the role-aware panel reachable below the scrollable details, hides actions that do not apply, expands the change form only when requested, preserves its draft on failure, and reports the action actually in progress.
- `localization/locales/{en,fr}/booking.json` provides matching English and French next-step, loading, and accessibility copy.
- The checklist remains provider-editable only while work is in progress. During requester review it remains a read-only record; the overall Confirm or Request changes action is the decision.

No Firestore schema, rule, index, Function, or deployment change is required. Existing booking status transitions and permissions are unchanged.

## Verification

- Mobile TypeScript check passes.
- Focused ESLint passes.
- English/French booking resources have matching keys.
- The native development client launches on iPhone 15 against the configured project without a runtime error.
- The current simulator account has no bookings, so final requester/provider interaction across pending, accepted, in-progress, and awaiting-confirmation records remains the release acceptance step. Do not create production bookings solely to satisfy that test.
