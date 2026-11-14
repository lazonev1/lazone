# Provider form session recovery — P03 slice

## What was wrong

Service/portfolio/certification drafts lived in the second-step component. Going Back unmounted that component, and saving also replaced the form with a spinner. Returning forward or recovering from a failed save could therefore lose those edits. Edit failures could fall through to a blank-looking new form, and owner-only editing was not clearly guarded at the route.

```text
Before: service edits → child state → Back / save spinner → unmount → draft lost
After:  service edits → publish to account-scoped route draft
                       → Back / failed save → remount from the same draft

Edit route → owner check → load + hydrate saved profile → show prefilled form
                         → unavailable → Retry / Back (never blank replacement)
```

The second step publishes its session draft upward without mirroring parent arrays back over current typing. Initial empty service rows reserve one stable ID lazily. The route retains the final submitted data before showing saving UI, blocks duplicate in-flight saves, and ignores late completion/error UX after unmount. Changing account remounts the form with a fresh draft. Signed-out and other-owner edit routes do not expose an editable form. Existing atomic provider publication, role promotion, repository validation, and Firestore authorization are unchanged.

## Verification

`test:provider-recovery` exercises the actual route/step with mocked hooks/native primitives: draft publication and remount, stable service IDs, Back/forward, failed saves, duplicate submission, stale sessions, account-key reset, signed-out access, owner guard, and failed-load Retry. It runs in CI. TypeScript and focused lint pass.

The full Auth/Firestore provider-capability, authorization, and migration regression suite passes, as do iOS/Android production JavaScript exports. Those checks do not replace native form/keyboard verification.

This is session recovery, not disk persistence: reload/restart recovery, discard confirmation, and enrollment idempotency remain P03 work. Media persistence remains P01/S07 and is not claimed fixed. Simulator UI control is unavailable, so native onboarding/edit/keyboard walkthroughs remain pending. No native dependency, schema/rules change, migration, Firebase deployment, or EAS rebuild is required.
