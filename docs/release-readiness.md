# LaZone release readiness

Last audited: **2026-09-17**

S01 completed: **2026-09-19** (implementation, live migration, rules deployment, regression coverage, and two-account production-safe native smoke test). Other findings retain their audit-baseline status.

S02 completed: **2026-09-20** (account allowlists, atomic provider promotion, live rules deployment, regression coverage, and disposable-account native verification). Ratings and referrals were explicitly separated into S10 and C03 rather than treated as completed.

Baseline: **`develop` at `e2fb0aa`**, including merged French/English localization PR #79. `origin/develop` was fetched and matched this baseline.

Decision: **Not ready for a public release.** The core marketplace journey exists, but security, data persistence, recovery, and visible product promises still have launch-blocking gaps.

This is the working backlog for functionality, security/maintainability, and professional, frictionless UI/UX. It replaces the earlier checklist: some earlier “completed and verified” claims were broader than the implementation or tests support.

**Next implementation slice:** S03 review-vote integrity. Trusted rating aggregation is deliberately deferred to S10 until backend functions are adopted, but remains required before public launch. Referrals remain a separate C03 product decision. S01 and S02 are complete. Read the [brief before/after guide](public-private-profile-changes.md) and [deployment evidence](public-private-profile-rollout.md).

Jump to: [implemented foundation](#implemented-foundation--keep-do-not-rebuild-blindly), [audit evidence](#audit-coverage-and-evidence), [delivery order](#recommended-delivery-order), [security](#remaining-work--security-and-data-integrity), [booking UX](#remaining-work--booking-journey-and-customer-experience), [providers/discovery](#remaining-work--provider-management-and-discovery), [accounts](#remaining-work--identity-account-and-trust), [messaging/notifications](#remaining-work--messaging-and-notifications), [UI/accessibility](#remaining-work--professional-ui-accessibility-and-localization), [engineering/release](#remaining-work--maintainability-performance-and-release-operations), [scope decisions](#conditional-scope--decide-explicitly-then-finish-or-defer), [acceptance matrix](#release-candidate-acceptance-matrix).

## How to use this document

- **Implemented foundation** means the capability exists in source. It does not mean the entire feature is production-verified.
- **P0 — security/data integrity:** address first; no public launch with an unresolved exploitable authorization or integrity gap.
- **P1 — core product and UX:** required for a trustworthy, usable launch journey.
- **P2 — release quality and operations:** still required for the selected launch scope, after the foundations are stable. P2 does not mean optional.
- **Conditional:** a product decision is needed. Either finish the feature end to end or explicitly defer it and remove its promises/entry points from the release UI. Hiding a feature is a scope decision, not implementation completion.
- Check off an item only after its acceptance criteria pass. Record owner, PR/commit, test evidence, applicable migration, and deployed environment. “Code merged,” “emulator passed,” and “production deployed” are separate facts.
- Security findings describe the **2026-09-17 audit baseline**, unless a progress record says otherwise. The audit itself did not deploy or change live data. The subsequent authorized S01 rollout inspected and migrated `lazonev1-5da5a`, deployed its Firestore rules, and completed a two-account production-safe native smoke test. Broader release-candidate device automation remains E04.

## Product contract to preserve

LaZone connects a requester with a provider, helps them agree on work, tracks delivery, supports communication, and collects feedback about a completed booking.

- A provider is also a requester. Becoming a provider must not require logging out or remove booking capabilities.
- Keep **one tap on Book Now to open the booking form**. The form submission is the commitment; do not add another confirmation just to enter it.
- A request is not an accepted appointment. Show who must act next and whether the time/price is proposed or agreed.
- The provider submits work for review; **only the requester confirms completion**. Checklist progress is supporting information, not a second approval workflow that traps either person.
- Use **Accepted** in the UI. The existing stored value `confirmed` can remain for compatibility; renaming it is not necessary to improve the wording.
- Pending and In Progress must remain visually distinct. Preserve orange as the In Progress accent, with accessible foreground/background combinations.
- Booking completion is not proof of payment. Do not label proposed or completed booking value as paid earnings without an actual payment record.
- Neither party should need to leave and reopen a screen to see the other party's action.

Current intended lifecycle:

```text
Request sent → Accepted → In Progress → Awaiting requester confirmation → Completed → Review
                                 ↑                   │
                                 └── Request changes ┘

Cancellation/decline and support paths must be defined alongside this happy path.
```

## Implemented foundation — keep, do not rebuild blindly

- [x] Email/password signup and login, persisted authentication, guest browsing, and requester/provider role handling exist.
- [x] Discovery, categories, search/filter UI, provider profiles, and saved providers use Firestore-backed data.
- [x] Provider registration/editing saves business information and embedded services; service presence is checked in the form, repository, and rules. Validation is not yet complete (S05/P02).
- [x] Provider promotion refreshes the same account without requiring a new login. S01 now commits provider creation and role `both` atomically; draft/retry/auth recovery work remains (A01/P03).
- [x] Booking creation, pending-booking editing, acceptance, start, submission for review, requester confirmation, changes requested, cancellation, and timeline rendering exist.
- [x] Rules reject direct provider completion and prevent non-participants reading bookings. Existing events cannot be edited/deleted. **New-event linkage is bypassable** (S04).
- [x] First-contact conversation creation uses a canonical participant ID and a transaction in the client. Message creation and summary writes are batched. **Rules do not enforce all equivalent invariants** (S06).
- [x] Completed-booking reviews, requester editing/deletion, provider responses, and helpful-vote UI exist. Aggregate/vote security and several UI paths remain incomplete (S10/S03/B09).
- [x] Centralized booking status labels/colors and a booking-request success screen exist. The full interaction still needs refinement (B05/B08/U01).
- [x] English/French resources, language switching, and persisted language preference exist. Key parity passed; full localization and native runtime verification remain open (U04/E03).
- [x] Push registration, message notification code, and some booking-status notification code exist. Delivery, preferences, coverage, and deployed versions are not signed off (N01/N02).
- [x] CI installs dependencies, type-checks, lints, checks Functions syntax, and runs authenticated Firestore regression tests. Passing these checks is not sufficient release coverage (E04).

## Audit coverage and evidence

Source review covered the maintained routes, components, shared UI package, hooks, contexts, models/types, repositories, Firebase client services, notification Functions, rules, scripts, translations, and build/CI documentation: **181 tracked code/config/documentation files, approximately 23,500 lines** at the baseline. The legacy search reference and ignore files were also inspected. Assets and generated lock/export artifacts were inventoried/configuration-checked, not treated as hand-written application code. Third-party/generated native code was not line-audited.

Static review cannot establish that every device interaction is flawless. No iOS/Android end-to-end run, screen-reader session, load test, production deployment comparison, or restore drill was performed in this audit; these remain explicit release gates.

| Check | Result at this baseline | What it establishes |
| --- | --- | --- |
| `pnpm --filter ./apps/mobile typecheck` | Pass | TypeScript compiles; not runtime/schema correctness. |
| `pnpm --filter ./apps/mobile lint` | Pass, **61 warnings / 0 errors** | Existing lint gate passes, with unresolved warnings. |
| `node --check apps/mobile/backend/main/src/functions/index.js` | Pass | JavaScript syntax only, not notification behavior. |
| Firebase CLI 15.5.1, Auth + Firestore emulators, `pnpm test:rules` | Pass | Existing happy-path and permission-denial assertions pass. |
| Additional isolated emulator security probes | **11 unsafe behaviors reproduced** | Concrete gaps listed below; synthetic users/data only. |
| EN/FR resource comparison | **580 leaf keys; no key/interpolation mismatches** | Resource structure matches; does not prove all visible copy is translated. |
| `pnpm audit --prod --json` | Nonzero; **4 critical, 89 high, 48 moderate, 8 low** reported | Advisory counts across the resolved workspace graph; reachability/exploitability still need triage. |
| Offline Expo dependency compatibility check | Reported up to date, with an offline-reliability warning | Limited check; not a clean native build or online dependency/security sign-off. |

The additional probes were temporary audit diagnostics, **not added to the repository's regression suite**. E04 requires converting them into permanent tests expecting denial after fixes:

| Probe | Observed unsafe behavior | Work item |
| --- | --- | --- |
| 1 | An unrelated authenticated user can read another user's phone, DOB, bookmarks, and notification tokens. | S01 |
| 2 | A user can assign their own `verified` and subscription fields. This proves trust-field forgery, not a demonstrated admin-role takeover. | S02 |
| 3 | An unauthenticated reader can read private fields placed in a public provider document; normal provider creation copies such fields. | S01 |
| 4 | An unrelated authenticated user can set another provider's rating/count without a review. | S10 |
| 5 | An unrelated authenticated user can replace helpful voters with other identities and duplicate entries. | S03 |
| 6 | A conversation participant can change the other participant's typing/read metadata. | S06 |
| 7 | A message with empty text, a non-timestamp date, and a mismatched conversation ID is accepted. | S06 |
| 8 | A conversation with duplicate participants and fabricated participant details is accepted. | S06 |
| 9 | A requester can reuse an older acceptance event when requesting changes, changing status without creating a new timeline event. | S04 |
| 10 | A self-booking with a nonexistent service, negative price, invalid date, and `[null]` checklist is accepted. | S05 |
| 11 | A user can create an already-rewarded referral with an arbitrary reward amount. | C03 |

## Recommended delivery order

1. **Close the remaining active trust boundary:** S03–S07 and S09, with schema/migration work from E01 and regression tests from E04. S01/S02 public-profile and account-trust work is complete; preserve those boundaries while addressing later security work. Complete deferred rating item S10 before public launch or before rating-based ranking becomes consequential.
2. **Finish the main requester/provider journey:** B01–B09, P01–P06, A01–A02, and M01–M02. Apply U01–U05 while changing each screen, not as a cosmetic cleanup at the end.
3. **Finish trust and communication:** A03, S08, N01–N02; establish the support path before relying on reminders or escalation.
4. **Resolve launch scope:** C01–C04. No fake wallet, reward, verification, or voice-message promises may survive into a release candidate.
5. **Prove release readiness:** E02–E06 and the final acceptance matrix, including both native platforms in the selected launch scope.

These are delivery slices, not a requirement to move every Firestore write to Functions. Well-constrained user-owned writes can remain client-driven. Privileged, cross-user, financial, and abuse-sensitive operations need a trusted authority and independent authorization.

## Completed implementation and deployment

### S01 · P0 · Public/private profiles — complete

- [x] Separate private `users/{uid}`, minimal `publicProfiles/{uid}`, and public `providers/{uid}`; update chat/review identity readers and owner-scoped earnings reads.
- [x] Preserve the same account/UID and requester capabilities during provider enrollment; create the provider and update role to `both` atomically. Keep business editing and approximate-distance discovery.
- [x] Back up and migrate the live project `lazonev1-5da5a`: 22 private accounts unchanged, 11 provider documents sanitized, 22 public identities created. Deploy the matching Firestore rules.
- [x] Pass TypeScript, lint (0 errors / 61 existing warnings), Auth/Firestore regression tests, and migration tests including stale-backup rejection. Live client queries return all 11 migrated providers, allow public details/identities, and deny private-account reads.
- [x] Allow direct lookup of a known minimal identity for public review attribution while denying requester-directory listing; preserve the existing avatar during name synchronization; test owner-only earnings access.
- [x] Complete a two-account native smoke test on iPhone 15 / iOS 17.5 covering both requester and provider perspectives, edit prefill, reload persistence, booking/chat access, and public review identity without changing live records.
- [x] Document the [before/after flows and code changes](public-private-profile-changes.md) and [rollout/recovery evidence](public-private-profile-rollout.md).

S01's implementation, migration, deployment, regression coverage, and production-safe native smoke test are complete. Disposable record-creating release-candidate journeys and general PR/build governance are tracked under E04 rather than leaving this implementation ticket open.

### S02 · P0 · Account trust fields — complete

- [x] Restrict new private accounts to the reviewed schema and safe defaults: requester role, unverified, and free subscription.
- [x] Allow only ordinary owner-managed profile, bookmark, location, preference, and notification-token fields to change. Deny self-verification, paid-entitlement assignment, unknown top-level fields, and document-only account deletion.
- [x] Permit requester-to-provider role promotion only in the same atomic commit as a valid, service-bearing public provider profile; deny unlinked role changes and later role rewrites.
- [x] Preserve account edits, bookmarks, notification registration, and provider enrollment; require server-authored `updatedAt` on those account mutations.
- [x] Pass TypeScript, lint (0 errors / 61 pre-existing warnings), and the full Auth/Firestore emulator suite. Deploy only Firestore rules to `lazonev1-5da5a`.
- [x] Complete a disposable-account iPhone 15 / iOS 17.5 smoke test covering live signup, profile editing, bookmark add/remove, notification-token registration, provider registration with a required service, immediate Business-tab refresh, and stored trust values. Remove the disposable Auth account and all three test documents afterward.

## Remaining work — security and data integrity

### S03 · P0 · Enforce helpful votes and review integrity

- [ ] **Problem:** Helpful-vote rules check the resulting list/count, not that only the caller's single vote changed. Other voters can be impersonated or removed. Review URLs and response metadata also need bounded validation; delete/recreate semantics can erase response/vote context.

  **Sources:** [rules][rules], [review service][review-service], [review models][review-model].

  **Required:** Use unique per-user vote records or equivalent strict delta validation, with protected counts and appropriate voter privacy. Enforce author/provider response permissions, immutable booking associations, text/date/URL constraints, and a documented deletion/history policy. Keep review uploads disabled until C02/S07 is complete.

  **Done when:** Double votes, duplicate IDs, forged voters, mass reset, unauthorized responses, invalid payloads, and concurrent retries are rejected or handled deterministically. Legacy review IDs cannot produce a second review for one booking.

### S04 · P0 · Make every status transition create a matching new audit event

- [ ] **Problem:** `hasNewLinkedBookingStatusEvent` checks that the ID differs from the current latest ID and exists after the write. It does not prove that the event is newly created or matches this transition. Reusing an older event bypasses the intended audit guarantee. The current regression test only attempts reuse of the latest ID.

  **Sources:** [rules][rules], [booking service][booking-service], [current rule tests][rules-tests].

  **Required:** Require nonexistence before the write, existence afterward, matching before/after statuses, actor/role, and server timestamp; alternatively make the entire command authoritative in trusted code. Keep booking/event changes atomic and events immutable. Avoid making obsolete clients silently lose transitions during rollout.

  **Done when:** Reusing any older event, cross-booking references, mismatched actor/status, standalone events, and status writes without an event all fail. Concurrent actions produce one valid outcome and one complete ordered history.

### S05 · P0 · Validate marketplace payloads at the trust boundary

- [ ] **Problem:** Booking rules allow malformed dates/checklists, negative prices, self-bookings, and services not belonging to the provider. Provider rules only establish that the first service has a nonempty name. UI-only validation is bypassable.

  **Sources:** [rules][rules], [booking model][booking-model], [provider mapping][provider-repo], [validation][validation].

  **Required:** Define bounded schemas for user-editable fields, service IDs, price/currency units, timestamps, notes, checklist IDs/descriptions/progress, and location. Reject requester = provider, unpublished/nonexistent services, extra privileged fields, invalid dates, nonfinite numbers, and incompatible edits after acceptance. Validate all service/checklist entries with a data model/rules strategy that actually supports those invariants; do not assume rules can generically validate arbitrary lists.

  **Done when:** Valid edge cases work and hostile/malformed payloads fail in direct SDK tests, independent of UI. Data migrations handle legacy missing IDs/checklists without rendering crashes or fabricated history.

### S06 · P0 · Enforce conversation/message invariants in rules or trusted commands

- [ ] **Problem:** The client enforces canonical conversations and text limits, but rules allow duplicate participants, fabricated participant details, arbitrary conversation IDs, malformed messages, peer read/typing edits, and unverified summary metadata.

  **Sources:** [rules][rules], [conversation service][conversation-service], [message mapping][message-repo].

  **Required:** Authorize creation with two distinct valid participants and an enforced identity scheme; prevent canonical-ID squatting. Protect participant identity and membership. Permit only the caller's read/typing fields, with valid bounded values/times. Validate message body, sender, parent ID, timestamps, and immutable fields; bind the last-message summary to the actual message mutation.

  **Done when:** First contact and legacy conversations work, while malformed messages, forged sender identity, peer metadata edits, spoofed previews, and unauthorized membership/ID creation fail. Include two simultaneous first-contact attempts and deleted/deactivated participant cases.

### S07 · P0 · Secure the media pipeline before enabling uploads

- [ ] **Problem:** Storage checks UID ownership but does not limit content type/size; user/provider paths are publicly readable. That is unsuitable for private certification/identity evidence. Upload helpers lack resumable progress, cleanup, and a complete persisted media flow. Firebase configurations name different Storage buckets.

  **Sources:** [Storage rules][storage-rules], [upload service][storage-service], [active Firebase config][firebase-config], [legacy config][legacy-firebase].

  **Required:** Separate public media from private evidence, validate path/owner/size/type, set quotas and lifecycle cleanup, strip unnecessary image metadata, and define document scanning/review where applicable. Verify the actual bucket rather than guessing its suffix. Complete upload → durable record → display → replace/delete, including rollback/orphan cleanup and retry.

  **Done when:** Storage emulator tests deny cross-user, oversized, wrong-type, and private reads; real-device uploads persist across restart and another account sees only intended public assets. Deployment targets the verified bucket and source rules.

### S08 · P1 · Add abuse prevention, reporting, and operational enforcement

- [ ] **Problem:** There is no complete block/report/moderation/dispute path or server-side booking/message abuse control. Account creation alone should not permit unlimited spam, uploads, or review abuse.

  **Sources:** [chat screen][chat-ui], [reviews UI][reviews-ui], [Functions][functions], [account routes][account-menu].

  **Required:** Provide block/report from profiles, conversations, and reviews; define effects on existing bookings and notifications. Add trusted throttling/quotas, appropriate verification gates, App Check as defense in depth, and least-privilege staff tooling with audit logs. Define handling of abusive content, impersonation, no-shows, disputes, and appeals; avoid exposing reports to the reported user.

  **Done when:** Reports reach a real queue, staff can act, blocked users cannot bypass enforcement, rate limits have clear recoverable UX, and support has a documented response path. App Check must not substitute for authorization.

### S09 · P0 · Triage and remediate dependency advisories

- [ ] **Problem:** The production dependency graph audit reports 149 findings: 4 critical, 89 high, 48 moderate, 8 low. The graph includes build tooling and unused package branches, so this is **not 149 demonstrated app exploits**. Critical reported modules include `protobufjs`, `shell-quote`, `websocket-driver`, and `tar`; server dependency chains also have advisories.

  **Sources:** [pnpm lockfile][lockfile], [mobile package][mobile-package], [Functions package][functions-package].

  **Required:** Record advisory IDs, installed versions, actual runtime/build reachability, remediation, and retest evidence. Update supported Expo/Firebase/React Native and Functions dependencies coherently; avoid blind forced upgrades/overrides. Include CI/build-machine exposure, not only code shipped to phones.

  **Done when:** Reachable critical/high issues are fixed; remaining non-applicable reports have evidence, owner, and review expiry. Clean install, native builds, rule tests, and journey tests pass after the dependency changes. Add continuous advisory monitoring.

### S10 · P0 before public launch · Make rating aggregates authoritative

- [ ] **Problem:** The temporary provider-rule exception lets any signed-in client write `averageRating` and `reviewCount`. Review create/edit/delete then recalculates aggregates on the reviewer's device, so the displayed aggregate can be forged, race, or fail after the review itself succeeds.

  **Sources:** [rules][rules], [review service][review-service], [Functions][functions].

  **Decision:** Deferred during the current development phase because the project has not adopted trusted backend functions. This is an explicit deferral, not an accepted production design. Do not build further ranking, verification, or commercial decisions on these client-written values.

  **Required before launch:** Use a trusted, idempotent backend operation to rebuild aggregates from eligible reviews after create/edit/delete; make aggregate fields client read-only; reconcile existing provider totals; and separate review-write success from asynchronous aggregate processing.

  **Done when:** Direct client aggregate writes fail; duplicate/reordered retries converge on the same totals; a reconciliation job matches eligible reviews; rating-based discovery uses only trusted values; and review submission remains successful when later aggregation is retried.

## Remaining work — booking journey and customer experience

### B01 · P1 · Make request creation validated, durable, and retry-safe

- [ ] **Problem:** The booking form checks price presence but not a finite valid amount; the selected date can become past; service data can become stale. `addDoc` followed by another read can succeed in storage but look failed to the user, allowing duplicate retries.

  **Sources:** [booking form][booking-form], [new booking][booking-new], [booking service][booking-service], [booking mapping][booking-repo].

  **Required:** Share domain validation with S05, normalize price/currency, bound checklist/notes, revalidate provider/service availability on submission, and use an idempotent request identity. Keep an entered draft on recoverable failure; distinguish waiting for server acknowledgement from a completed request.

  **Done when:** Double tap, slow response, app backgrounding, network loss before/after commit, stale service, invalid amount, and retry produce at most one booking with accurate feedback. Valid users can enter and submit all required information without extra entrance friction.

### B02 · P1 · Load editable bookings from the authoritative record

- [ ] **Problem:** The edit route consumes serialized booking fields from route parameters and parses checklist JSON without a recovery boundary. Malformed links can crash; stale form values can conflict with a booking already accepted by the provider.

  **Sources:** [edit booking][booking-edit], [booking hooks][booking-hooks].

  **Required:** Route using the booking ID, load the current authorized record, validate route values, and gate editing by current role/status. Preserve a draft on conflict and explain that acceptance changed what can be edited. Do not put full personal/request data into navigation parameters.

  **Done when:** Invalid/deleted/unauthorized IDs have safe recovery screens, edits open prefilled, and an acceptance/edit race never overwrites accepted terms or silently loses input.

### B03 · P1 · Keep both participants synchronized without navigation tricks

- [ ] **Problem:** Booking hooks use fetch-on-load/focus rather than live record/list subscriptions. Participants can keep seeing obsolete statuses/actions; several screens treat fetch errors as empty/not found. Concurrent optimistic actions can restore an outdated whole list.

  **Sources:** [booking hooks][booking-hooks], [booking details][booking-ui], [requester list][booked-ui], [business dashboard][business-ui].

  **Required:** Use scoped realtime subscriptions or an equally reliable invalidation strategy, cancel stale work on identity/ID changes, distinguish initial load from refresh, and reconcile mutations per booking. Keep previously loaded data visible with an explicit stale/retry state when appropriate.

  **Done when:** Two active accounts see accept/start/submit/changes/confirm/cancel reflected without reopening screens; logout/account switching cannot flash another user's records; racing mutations do not roll back unrelated actions.

### B04 · P1 · Make checklist interaction stable and explain its role once

- [ ] **Problem:** Checklist taps submit an entire progress map and refetch the whole booking, triggering full-page loading and risking lost concurrent changes. The provider/requester distinction is not consistently communicated.

  **Sources:** [booking details][booking-ui], [booking hooks][booking-hooks], [booking service][booking-service].

  **Required:** Update the intended item atomically with current-state checks, keep focus/scroll stable, and show local pending/error feedback. Provider controls are editable only during work; after submission they are clearly read-only. Requesters review outcomes and use the overall Confirm/Request changes actions, not pretend-editable provider progress boxes.

  **Done when:** Rapid toggles and two-device changes do not lose progress; errors restore only the affected item; no full-screen flash occurs; visual and screen-reader states correctly identify editable vs read-only. Submitting work does not require a second requester checklist ceremony.

### B05 · P1 · Establish one clear, role-aware action area

- [ ] **Problem:** On requester review, instructions appear above the checklist and again near bottom actions. Primary actions can be buried below timeline content; the change-request input occupies space before it is needed.

  **Sources:** [booking details][booking-ui], [booking translations][booking-copy].

  **Required:** Use one concise status/next-step message paired with the relevant controls. Place the primary action in a safe-area-aware, reachable region and retain access to details. Reveal the changes form on request; explain the irreversible completion action before committing. Remove redundant banners and unnecessary confirmation dialogs for low-risk actions.

  **Done when:** Each role/status has one obvious next action, no duplicated instructions, no hidden button behind the keyboard, and no action the role cannot perform. A requester can understand and complete confirmation without assistance.

### B06 · P1 · Preserve a complete, useful booking history

- [ ] **Problem:** Status events exist, but change-request text lives on the booking and is cleared on resubmission; edits lack corresponding history. Cancellation can leave the loaded timeline stale. Legacy data does not necessarily have earlier events.

  **Sources:** [booking service][booking-service], [booking model][booking-model], [booking details][booking-ui].

  **Required:** Fix S04 first; persist relevant reasons and agreed changes in immutable events, display actor/time clearly, refresh cancellation history, and explain genuinely unavailable legacy history without inventing events. Define retention/privacy for notes and evidence.

  **Done when:** Multiple submit/change/resubmit cycles preserve their individual reasons and timestamps; both parties see the same ordered timeline immediately; errors do not misrepresent partial history as complete.

### B07 · P1 · Define scheduling, cancellation, and stalled-job escape paths

- [ ] **Problem:** The data captures a preferred date/time but not a complete availability/service-area/duration contract. Late, abandoned, disputed, or indefinitely awaiting-confirmation work lacks a complete operational path. Declined/cancelled history is not equally discoverable for providers.

  **Sources:** [booking model][booking-model], [booking service][booking-service], [business dashboard][business-ui], [provider registration][registration-ui].

  **Required:** Decide whether launch is request-and-agree scheduling or actual bookable slots. Define timezone, address/remote delivery, agreed price, rescheduling, overlaps, cancellations after acceptance/start, expiry, no-shows, and requester nonresponse. Provide support escalation and any reminder policy. Do not silently auto-complete a disputed job or imply slot availability that is not enforced.

  **Done when:** Every nonterminal state has a documented next action or support path; both roles can find past/declined/cancelled jobs; timezone and schedule changes are unambiguous and audited. Paid cancellation behavior depends on C01.

### B08 · P1 · Finish navigation and authenticated-action continuity

- [ ] **Problem:** Guest booking/message/save actions lose their destination after login; registration/owner preview need consistent route guards. Success/profile/details navigation needs a tested stack rather than accumulating form/profile screens.

  **Sources:** [root navigation][root-layout], [login prompt][login-prompt], [booking success][booking-success], [provider profile][provider-ui].

  **Required:** Carry a validated intended action through authentication, preserving an appropriate draft. Define back destinations from request success, booking details, provider profile, reviews, and notification deep links. Guard owner-only pages using current auth, not route IDs alone. Prevent self-booking in UI as well as S05.

  **Done when:** One Book Now tap opens the form; after submission the user can reach details or the provider directly and return to Booked without revisiting the submitted form. Guest and cold-start links resume safely after login, including unavailable targets.

### B09 · P1 · Finish the complete review/response experience

- [ ] **Problem:** Review sort/filter tabs do not actually sort without a supplied callback; existing-review bookings still advertise Leave a Review. Provider dashboard Reviews omits the provider ID. Preview reviews depend on provider reference arrays that review creation does not maintain. Some wrappers catch errors and resolve, causing editors to close as if saving succeeded.

  **Sources:** [review UI][reviews-ui], [provider reviews route][reviews-route], [booking review][booking-review], [provider preview][preview-ui], [review mapping][review-repo].

  **Required:** Use one canonical review source, real sorting/pagination, View/Edit your review after submission, a working owner review entry point, accurate service/author display, and truthful submit/error propagation. Define provider-response editing and deletion policy. Preserve drafts and prevent duplicate submission.

  **Done when:** Create/edit/delete/vote/respond work across requester/provider views and update aggregates reliably; failed operations leave the draft visible; sorting visibly changes order; reviewers are eligible completed-booking requesters and legacy records do not duplicate reviews.

## Remaining work — provider management and discovery

### P01 · P1 · Persist every field the provider is asked to enter

- [ ] **Problem:** Registration collects portfolio and certifications, but its save mapping drops them. Certification selection reports an upload success without uploading. Preview avatar/cover changes are local state. Language fields are modeled but not wired end to end. City/country changes are skipped when coordinates are absent.

  **Sources:** [provider mapping][provider-repo], [service details form][services-form], [certification picker][cert-picker], [provider preview][preview-ui], [location picker][location-picker].

  **Required:** Complete the model/save/read/edit/upload round trip for launch fields, with accurate upload progress and failure states; distinguish local selection from upload and verification. Persist text location independently of GPS. Remove unused fields from the visible form if explicitly deferred; never collect and silently discard them.

  **Done when:** Save, restart, edit, and view from a second account preserve every supported field/media item. Private evidence remains private under S07. Selecting a country that is visually defaulted does not fail because the stored value is blank.

### P02 · P1 · Stabilize service identities and validate the entire catalogue

- [ ] **Problem:** Service IDs come from a process-local counter (`SRV_1`, etc.), which resets across launches and can collide with existing services on edit. Rules check only the first service's name; whitespace and inconsistent price/location data remain possible.

  **Sources:** [ID generator][service-ids], [service form][services-form], [provider mapping][provider-repo], [validation][validation].

  **Required:** Use durable unique service IDs, bound and normalize all service fields, define price/currency semantics, and preserve historical booking snapshots when a service changes or is removed. Migrate existing duplicate/missing IDs and providers with no publishable services; give owners a repair path.

  **Done when:** Editing a provider after an app restart can add/remove services without modifying the wrong row or breaking bookings. Every published provider has at least one valid bookable service; legacy incomplete providers are not presented as immediately bookable.

### P03 · P1 · Make provider onboarding/editing recoverable

- [ ] **Problem remaining:** S01 made provider creation and user-role promotion atomic. Retry/idempotency still needs review to avoid overwriting initialized fields. Second-step drafts can be lost when going Back, and failed edit hydration can look like a blank new form.

  **Sources:** [registration route][registration-ui], [business form][business-form], [service form][services-form], [provider mapping][provider-repo], [auth context][auth-context].

  **Required:** Make enrollment idempotent/atomic where possible, resume partial progress, and protect existing trust/history data. Lift draft state across steps, warn before discarding work, authorize the owner, and distinguish loading/error/edit/new states. Refresh capability without unmounting the whole navigation tree.

  **Done when:** Back/forward, reload, a failed role update, interrupted save, and failed profile fetch do not erase work or downgrade a provider. Provider and requester capabilities work immediately on successful enrollment.

### P04 · P1 · Make business visibility a real privacy/product control

- [ ] **Problem:** Business Visibility currently changes local state while stating that the business is hidden. It does not persist or affect discovery/bookability.

  **Sources:** [account tab][account-ui], [provider service][provider-service], [rules][rules].

  **Required:** Define visible, paused, unpublished, and suspended behavior; persist authoritative publication state and apply it consistently to search, deep links, and new booking authorization. Preserve existing participants' booking access and explain what hiding does. If privacy requires removing public access, enforce it in rules/data layout rather than only query filters.

  **Done when:** The setting survives restart, another user cannot discover/book a paused provider, and existing bookings remain manageable. The displayed promise matches actual access behavior.

### P05 · P1 · Unify provider profile and dashboard truth

- [ ] **Problem:** Public/owner profile implementations drift; Follow and owner-preview Message are no-ops, preview image-source handling differs, and owner review data is stale. Dashboard placeholders coexist with real data; completed booking sums are called Earnings without a payment ledger. Portfolio/Services shortcuts do not target the intended editor section.

  **Sources:** [public profile][provider-ui], [owner preview][preview-ui], [business dashboard][business-ui], [provider mapping][provider-repo].

  **Required:** Share profile presentation with explicit owner/visitor actions; wire or deliberately remove dead controls, normalize image sources, use real ratings, and label financial metrics honestly. Group requests, active work, awaiting confirmation, and history by actionable state/date, with per-item mutation state. Let providers clarify pending requests through a valid conversation.

  **Done when:** Own profile matches what customers see, edits are discoverable and prefilled, shortcuts work, all visible metrics have a defined source, and every actionable card navigates correctly. No claim of paid earnings without C01.

### P06 · P1 · Make search filters and location trustworthy

- [ ] **Problem:** Search price filtering relies on `provider.pricing`, which registration does not populate, rather than real service prices. Unknown distances can pass a radius filter; maximum-radius behavior and slider defaults differ. Full provider scans/population occur on frequent search changes. Denied location and remote services are not handled as a coherent browse experience.

  **Sources:** [search screen][search-ui], [provider hooks][provider-hooks], [provider mapping][provider-repo], [provider service][provider-service], [location hook][location-hook].

  **Required:** Define “from”/maximum price semantics using service data, implement each displayed filter, distinguish unknown distance, decouple remote work from local radius, and offer manual location browsing. Debounce/cancel stale searches, use localized category synonyms with stable IDs, and keep results while refreshing. Apply E02 for scalable queries.

  **Done when:** Known fixtures test price/radius/rating/category combinations in EN/FR, permissions denied, no coordinates, remote-only, and empty results. Stale requests cannot overwrite newer filters; result counts and price/location labels are truthful.

## Remaining work — identity, account, and trust

### A01 · P1 · Make authentication/profile state resilient

- [ ] **Problem:** Auth creation precedes Firestore profile creation; listeners/token registration can race it. Fetch failures can leave loading unresolved, refresh can blank the navigation tree, and stale async work can outlive an account switch. Logout clears local state even if sign-out fails, with some navigation not awaiting completion. Signup writes the current timestamp as DOB without collecting a birth date.

  **Sources:** [auth service][auth-service], [auth context][auth-context], [root layout][root-layout], [account information][account-info], [push setup][push-client].

  **Required:** Define explicit startup/auth/profile states, repair incomplete profiles, make token registration safe, use finally/error boundaries and stale-request cancellation, and clear private caches/subscriptions on logout. Handle sign-out failure truthfully. Store unknown DOB as absent/null; migrate synthetic values appropriately rather than treating them as real birthdays.

  **Done when:** Signup interruption, missing profile, denied read, network loss, background/foreground, role refresh, and rapid account switching have bounded, recoverable UI with no cross-account flash or blank app.

### A02 · P1 · Finish credential and profile-edit promises

- [ ] **Problem:** Login advertises phone or email but uses email/password only; Remember me does not control persistence; password reset is an alert. Account email is editable but ignored on save. Password change and avatar/account controls are incomplete; identity copies can diverge across users/providers/conversations.

  **Sources:** [login screen][login-ui], [account editor][account-editor], [account information][account-info], [auth service][auth-service].

  **Required:** Align copy with supported login methods, implement reset and sensitive-account changes with reauthentication/verification, validate and normalize names/contact data, and remove cosmetic persistence options. Make email read-only until a real change flow exists. Complete avatar persistence if offered and propagate appropriate public identity changes safely.

  **Done when:** Reset links work; email changes affect the actual authenticated identity only after the proper verification flow; failed edits preserve drafts; the displayed profile and public identity remain consistent without misleading success alerts.

### A03 · P1 · Ship real account deletion, policies, and support

- [ ] **Problem:** Deactivation/deletion and password controls show TODO alerts; Help/Terms routes are placeholders. Signup agreement text is not a complete policy/consent flow. There is no complete user-facing data lifecycle.

  **Sources:** [account information][account-info], [account menu][account-menu], [placeholder route][placeholder-ui], [login screen][login-ui].

  **Required:** Provide accessible Terms/Privacy/support contacts, explain data use and moderation, record consent where needed, and implement in-app deletion with reauthentication and a clear retained-data policy. Remove/revoke auth, tokens, private profile/media, and public visibility while preserving/anonymizing necessary shared records appropriately. Define provider verification criteria, review/appeal ownership, and restrictions on regulated service categories before exposing trust claims.

  **Done when:** Deletion is tested with active/completed bookings, conversations, reviews, uploads, multiple devices, and partial failures; support is reachable without a placeholder. Store/privacy submissions match actual behavior. See [Apple account deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app/) and [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) for account and user-generated-content requirements; obtain jurisdiction-specific review where applicable.

## Remaining work — messaging and notifications

### M01 · P1 · Deliver reliable message history and sending

- [ ] **Problem:** The live query exposes only the latest 50 messages; the screen has no older-history flow. Scroll/read effects depend on array length, which stops changing at the cap. A failed send can restore an old message over newer typing, and a post-write transformation failure can be presented as a failed send.

  **Sources:** [chat screen][chat-ui], [message hooks][message-hooks], [message mapping][message-repo], [conversation service][conversation-service].

  **Required:** Implement cursor-based older history with a virtualized list and stable anchoring; use message identity rather than count for updates. Add pending/sent/failed state with idempotent retry and draft protection; do not force-scroll someone reading older messages. Show a new-message affordance and preserve position when loading history.

  **Done when:** A conversation exceeding 100 messages remains fully readable; reconnect/duplicate delivery/order changes reconcile; failed retry does not duplicate messages or lose a newer draft; reading older history is not interrupted.

### M02 · P1 · Correct realtime chat metadata and error recovery

- [ ] **Problem:** Read updates are not scoped to screen focus/app foreground. Typing writes occur on every keystroke. Async subscription transformations can race or reject without reaching the UI; list failures can look like empty history. Headers trust route-provided identity rather than loaded participants.

  **Sources:** [chat screen][chat-ui], [message mapping][message-repo], [message hooks][message-hooks], [message list][messages-ui].

  **Required:** Mark read only through visible messages while focused, debounce/expire typing state, handle unsubscribe/account changes, sequence async mapping, and surface subscription errors with Retry. Derive counterpart identity from authorized data; handle deleted users gracefully. Wire profile/header menu destinations or remove nonfunctional affordances.

  **Done when:** Backgrounded screens do not mark unseen messages read; typing clears after disconnect; rapid switching never shows another conversation's data; denied reads, malformed legacy data, and reconnects produce useful recovery rather than silence/spinners.

### N01 · P1 · Complete and verify lifecycle notification delivery

- [ ] **Problem:** Server code covers new messages and selected completion-related status changes, not the entire booking journey. There is no proven fresh deployment/device delivery matrix. The UI promises notifications/reminders that may have no producer.

  **Sources:** [Functions][functions], [notification routing][notification-handlers], [push client][push-client], [notification copy][account-copy].

  **Required:** Cover request received, accepted/declined/cancelled, work submitted, changes requested, and completion, with a deliberate policy for other events/reminders. Deep-link to authorized current records; resume after authentication. Localize by recipient preference and avoid duplicate foreground banner/system notifications. Make the in-app state sufficient when push is disabled or delayed.

  **Done when:** Real devices verify foreground/background/terminated delivery, tap routing, wrong-account and missing-record handling, both languages, and opted-out users. Record deployed function versions and environment. Source code existing is not delivery proof.

### N02 · P1 · Enforce preferences and retry-safe notification infrastructure

- [ ] **Problem:** Direct-token sends bypass locally managed topic preferences; server copy is English. Trigger retries lack a deduplication strategy, partial send failures are not fully retried, token batches are unbounded, and token refresh/logout/ownership need consistent handling. Rapid settings toggles can race and restoration can also fail.

  **Sources:** [Functions][functions], [push setup][push-client], [topics][notification-topics], [notification settings][notification-ui].

  **Required:** Persist notification categories/locale in protected server-readable settings; enforce them in every producer. Explain OS permission vs app preference. Use idempotent event processing, safe token batch limits, classified retry/backoff and dead-letter/monitoring; do not delete a valid token merely because the payload was invalid. Serialize/reconcile settings updates and remove stale account-device associations.

  **Done when:** Opting out stops the corresponding sends, duplicate events do not spam, transient failures recover, multiple devices and account switches are safe, and a settings save failure is visible without leaving a false enabled/disabled state.

## Remaining work — professional UI, accessibility, and localization

### U01 · P1 · Establish a coherent, accessible design system

- [ ] **Problem:** Hardcoded colors/spacing/type and multiple button/input implementations drift. Appearance preference is saved but not applied; app configuration forces light while components sometimes read system appearance. White on the shared orange button is approximately **2.14:1** contrast; white on the green success button is approximately **2.70:1**, below normal-text AA contrast.

  **Sources:** [shared button][shared-button], [shared input][shared-input], [color tokens][colors], [theme hook][theme-hook], [preferences][preferences-ui], [booking status][booking-status].

  **Required:** Define semantic tokens for surfaces, typography, spacing, borders, focus, disabled/loading states, and status colors; create shared accessible controls with explicit hierarchy. Apply System/Light/Dark consistently and reactively. Keep In Progress orange as requested, but use a darker text/accent treatment or suitable foreground rather than unreadable orange/white text.

  **Done when:** Requester/provider status treatments match, all supported themes are readable, controls share consistent states, and audited text/control combinations pass the chosen accessibility thresholds. Use [WCAG 2.2](https://www.w3.org/TR/WCAG22/) as the contrast/focus baseline, not color alone to communicate state.

### U02 · P1 · Make critical journeys accessible beyond visual appearance

- [ ] **Problem:** Many icon-only actions, custom checklist/segmented controls, stars, banners, and modal controls lack explicit accessible roles/names/states. Chat buttons are 40×40; several remove/close targets are smaller. Toast-only errors and fixed type/layout can exclude users.

  **Sources:** [shared button][shared-button], [chat screen][chat-ui], [reviews UI][reviews-ui], [select control][select-ui], [bottom sheet][bottom-popup], [toast][toast-ui].

  **Required:** Adopt a comfortable touch-target standard (44 pt iOS / 48 dp Android design targets), accessible names/roles/selected/disabled states, logical reading/focus order, labeled fields/errors, modal focus management, and announcements for significant state changes. Support large text, reduced motion, and alternatives to color-only meaning. Keep long errors persistent and actionable instead of truncating them in a disappearing toast.

  **Done when:** VoiceOver/TalkBack users can sign in, register, book, message, confirm, and review independently; large text does not hide actions. Validate on actual devices using [Apple accessibility guidance](https://developer.apple.com/design/human-interface-guidelines/accessibility) and platform accessibility tooling.

### U03 · P1 · Prove keyboard, scrolling, and responsive layouts

- [ ] **Problem:** Checklist focus scrolls to the end rather than reliably to the focused row; fixed keyboard offsets exist. Registration and bottom sheets lack a proven long-form keyboard/scroll contract. SelectList maps options without a scrolling container despite a maximum-height modal; long lists can become unreachable. Sticky profile sections and nested touch targets need device verification.

  **Sources:** [booking form][booking-form], [service form][services-form], [chat screen][chat-ui], [select control][select-ui], [bottom sheet][bottom-popup], [provider profile][provider-ui].

  **Required:** Use safe-area/header-aware keyboard handling and focus measurement, suitable return/Done actions, scrollable bounded sheets, and stable form layout. Remove overlapping invisible touch layers and redundant nested controls. Test long checklists, service lists, translated labels, and display-size changes; define tablet/web support explicitly.

  **Done when:** On small iPhone and Android screens, users can edit the second/last checklist item, dismiss numeric keyboards, select the last category, and reach primary actions without erratic scroll, clipped text, or accidental navigation. Add recorded regression cases for these previously reported problems.

### U04 · P1 · Complete localization, not just translation resources

- [ ] **Problem:** EN/FR keys match, but hardcoded strings remain in shared controls, service errors, fallback labels, dates/typing/read previews, and server notifications. Resource copy still describes provider completion in places that now require requester confirmation. Saved language loads asynchronously, and some formatting follows device locale or forced French rather than the selected language.

  **Sources:** [localization setup][localization], [locale resources][locales], [select control][select-ui], [provider mapping][provider-repo], [date helpers][date-utils], [Functions][functions].

  **Required:** Inventory every visible string, permission prompt, error, email/push message, date/time/currency/plural and search category. Use stable stored IDs, localized presentation, correct currency units, and locale-aware formatting. Initialize persisted language without a misleading startup flash and review terminology with a fluent speaker; do not translate user-entered content silently.

  **Done when:** Fresh install, restart, runtime switch, notification entry, form errors, and all core flows remain consistently EN or FR. Add key/interpolation checks to CI and native runtime tests for `ExpoLocalization`; key parity alone is not sufficient.

### U05 · P1 · Use honest loading, empty, error, and success states everywhere

- [ ] **Problem:** Several fetch failures render “no results,” unavailable profiles, or empty conversations. Saved-provider failures can be silently filtered out. Some visible actions are no-ops, and edits/selection can claim success before persistence.

  **Sources:** [provider hooks][provider-hooks], [booking hooks][booking-hooks], [message mapping][message-repo], [bookmark mapping][bookmark-repo], [account editor][account-editor], [certification picker][cert-picker].

  **Required:** Distinguish initial loading, refresh, true empty, offline/stale, permission denied, not found, and server failure. Provide a useful next step/retry without erasing data or drafts. Apply consistent inline validation and screen-level recovery; success must correspond to the promised durable result. Audit every visible button/row/link and remove mock/sample claims from release surfaces.

  **Done when:** Forced network/permission/server failures on each main screen produce truthful, recoverable states. No endless spinner, blank screen, false empty result, fake upload, or silent no-op remains. Empty states help users continue rather than end their journey.

## Remaining work — maintainability, performance, and release operations

### E01 · P1 · Clarify architecture and enforce domain contracts

- [ ] **Problem:** Files under `backend/main/src/services` are imported into the mobile app and use the client Firebase SDK; they are **not a trusted backend**. Repositories both access Firestore and map views; parallel domain/UI types, `any`, casts, duplicate Firebase configuration, and duplicated profile/chat UI obscure boundaries.

  **Sources:** [client services][client-services], [repositories][repositories], [models][models], [UI types][ui-types], [Functions][functions], [Firebase config][firebase-config].

  **Required:** Document/organize presentation → application commands/hooks → domain contracts → persistence adapters, with a separate privileged server boundary. Centralize booking state transitions and shared validation; use typed converters/runtime schema validation at I/O boundaries and explicit errors. Extract shared profile/formatting/control code where it removes real duplication; remove unused mocks/reference implementations safely.

  **Done when:** Business rules can be unit-tested without React/Firebase UI, malformed stored data is handled at boundaries, screens do not invent permission/state logic, and no client path is mistaken for an authorization boundary. Refactor in tested slices rather than an unbounded rewrite.

### E02 · P2 · Bound reads and make indexes reproducible

- [ ] **Problem:** Discovery scans and populates all providers; apparent pagination often slices an already-loaded array. Review/profile hydration and per-message sender/unread lookups add N+1 reads. Conversation unread counts can reread full histories. Composite-index configuration is not checked in; summary/list limits can hide older data.

  **Sources:** [provider service][provider-service], [provider mapping][provider-repo], [message mapping][message-repo], [review service][review-service], [referral mapping][referral-repo], [Firebase config file][firebase-json].

  **Required:** Use indexed queries/cursors, list-specific projections, caching/deduplication, bounded subscriptions, and appropriate trusted aggregates. Add versioned Firestore indexes and validate queries against a clean staging project; emulator success does not establish production index availability. Virtualize growing lists and optimize media payloads.

  **Done when:** Measured representative datasets have bounded page sizes/read costs and stable scroll performance; older bookings/messages/reviews are reachable; fresh deployments contain required indexes. Record latency/read-count budgets and measurements, not an unmeasured “fast” claim.

### E03 · P1 · Make environments and native builds reproducible

- [ ] **Problem:** The app defaults to the production Firebase project; the emulator toggle connects Firestore but not Auth/Storage. Duplicate config names different buckets and auth initialization can swallow failure into `undefined`. EAS profiles/config files need a repeatable native credential strategy. Android explicitly targets API 34.

  **Sources:** [active Firebase config][firebase-config], [legacy Firebase config][legacy-firebase], [app config][app-json], [EAS profiles][eas-json], [root README][root-readme].

  **Required:** Separate dev/staging/production configuration and identities; wire the whole emulator environment and fail closed when it is incomplete. Keep Admin credentials out of the mobile bundle and avoid logging tokens/personal data. Use supported EAS file variables or a carefully scoped `.easignore` inclusion for required native configuration, not temporary secret commits. Inspect build inputs and test clean-checkout remote builds, native module availability, URL schemes/deep links, permissions, and correct Firebase targets.

  **Done when:** A documented clean checkout builds remotely for each launch platform and cannot accidentally test against production; login, localization, messaging, and push work in installed release-mode builds. Upgrade/verify the Android SDK/toolchain: current [Google Play requirements](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en) require API 36 for ordinary new apps/updates from August 31, 2026. Recheck requirements when submitting. Follow [Expo build-ignore guidance](https://docs.expo.dev/build-reference/easignore/) and [EAS file variables](https://docs.expo.dev/eas/environment-variables/manage/). A successful simulator build is not device/store sign-off.

### E04 · P1 · Expand automated tests to enforce the release contract

- [ ] **Problem:** Current CI can pass while the reproduced authorization gaps and broken UI controls remain. There are no complete unit/component/end-to-end/Storage/notification behavior gates; lint warnings are accepted.

  **Sources:** [CI workflow][ci], [existing rules tests][rules-tests], [package scripts][mobile-package].

  **Required:** Convert all 11 audit probes into permanent deny tests; add legitimate counterparts so security fixes do not break chat/discovery. Add state-machine/schema/idempotency/mapping tests, Storage and Functions tests, component tests for error/draft/action states, and two-account E2E journeys. In a dedicated non-production environment, automate disposable signup → provider with immediate role refresh, bookmark add/remove, and a brand-new first-contact conversation. Cover migration/legacy records, concurrency, offline retries, account switching, and localization. Resolve warnings, then establish an enforced lint baseline. Require a linked commit/PR, supported-client validation, and reviewer sign-off for completed release slices.

  **Done when:** CI fails on the actual defects listed here, executes repeatably from frozen dependencies, and records useful artifacts without secrets. Native smoke/E2E tests cover both role perspectives, not just SDK operations. Every completed backlog item links its regression evidence.

### E05 · P2 · Establish production rollout, observability, and recovery

- [ ] **Problem:** The repository does not establish a complete crash/error monitoring, migration, backup/restore, deployment-verification, or support-operations process. Functions retries and failed side effects can go unnoticed.

  **Sources:** [Functions][functions], [Firebase deployment config][firebase-json], [CI][ci], [EAS profiles][eas-json].

  **Required:** Add privacy-conscious crash/error reporting and meaningful health metrics: signup/profile failures, booking mutation failures, notification failures, message delivery latency, permissions errors, read cost, and abandoned critical steps. Define budgets/alerts, staff access, migration dry runs/backups, restore drills, retention/deletion, and rollback/incident runbooks. Verify rules/indexes/Storage/Functions versions against the release commit and correct project. Plan mixed old/new client compatibility and a minimum-supported-version policy where necessary.

  **Done when:** A staged rollout can detect a broken journey, stop safely, restore supported data, and explain the incident without exposing private content. Record the production deployment evidence separately from passing local tests; do not assume historical rule deployment matches current source.

### E06 · P2 · Clean developer documentation and repository hygiene

- [ ] **Problem:** Documentation mixes npm and pnpm and suggests workflows incompatible with required native modules; permissive test-mode instructions are unsafe if applied to production. The mobile npm lockfile still describes an older Expo stack than the active pnpm project. `apps/.DS_Store` is tracked; sample hooks, template reset script, reference search code, and export metadata remain.

  **Sources:** [root README][root-readme], [mobile README][mobile-readme], [development runbook](development.md), [pnpm lock][lockfile]. The obsolete npm lockfile and template reset script were removed in the E06 implementation.

  **Required:** Document one supported package-manager/runtime setup, remote EAS workflow, fully isolated emulators, account fixtures, permission/deep-link testing, rules/index/Functions deployment, and rollback. Remove stale lock/OS artifacts and unused templates after checking references; retain only intentionally sanitized fixtures, with safe seeder project guards. Do not describe Firebase client configuration keys as a replacement for security rules or mistake them for Admin credentials.

  **Done when:** A new contributor can follow the README from a clean checkout without changing ignore rules or touching production accidentally; CI and local commands agree; the reset/seeding tools cannot be mistaken for routine release operations.

  **Progress — 2026-10-02:** Implemented on `fix/developer-setup-safety`, independently from open security PRs. Replaced contradictory setup instructions with pnpm/remote EAS development-client guidance and explicit environment/deployment/rollback documentation. Added one pinned demo Auth/Firestore test command shared by CI and local development; removed implicit live Functions commands, unused Admin referral seeder, destructive template reset, stale npm lockfile, OS file, search reference, and emulator metadata. Root `.easignore` includes native Firebase client configs while excluding local state/backups/credentials; both configs remain Git-ignored. TypeScript, lint (0 errors / 61 existing warnings), Auth/Firestore suite, Functions syntax, and local EAS archive inspection pass. No native build or live deployment was performed. Full mobile Auth/Storage/messaging emulator isolation remains E04, not a capability claimed by the Firestore-only switch. Keep E06 open until clean-contributor/native setup acceptance is recorded.

  **Additional verification:** A fresh `pnpm install --frozen-lockfile` in the inspected archive passed, followed by TypeScript without the working checkout's generated state. Guide links resolve. Native Firebase client files are present in the archive and still excluded from Git. No dependency versions or live rules changed.

## Conditional scope — decide explicitly, then finish or defer

### C01 · Payment model and financial truth

- [ ] **Decision needed:** Offline/direct payment marketplace or in-app payments at launch? The current wallet is sample data, not a processor integration; setting a default is local state, add/manage actions are incomplete, and encryption/payment assurances are unsupported by a real transaction flow.

  **Sources:** [wallet][wallet-ui], [payment card][payment-card], [business dashboard][business-ui], [account translations][account-copy].

  **If offline:** Explain when/how payment is agreed, remove fake wallet/payment-confirmation/paid-earnings promises, and label booking values as proposed/agreed service value. Support must still handle service disputes.

  **If in-app:** Specify supported countries/currencies/payment methods, fees/taxes, authorization/capture/payout/refund policy, provider eligibility, receipts, and disputes. Use a processor, verified/idempotent webhooks, an authoritative ledger, and explicit payment state separate from booking status. Never store raw card credentials or let clients mark themselves paid.

  **Done when:** The selected flow passes payment failure/retry/cancel/refund tests, or the explicitly offline release has no misleading payment controls. This audit does not authorize choosing a processor or deploying financial infrastructure.

### C02 · Voice, attachments, review images, and optional public media

- [ ] **Decision needed:** Which media features must launch? Current voice recording sends only a text duration marker and discards the recording; attachment controls say Coming soon. Review image uploads remain disabled.

  **Sources:** [chat screen][chat-ui], [upload service][storage-service], [Storage rules][storage-rules].

  **If included:** Deliver secure upload/storage, retry/progress/cancel, playback/viewing, ownership/access controls, content/size limits, cleanup, moderation, and accessible alternatives. Use supported audio APIs and validate recording interruption/background behavior.

  **If deferred:** Remove misleading recording/attachment/upload actions and related permission requests from the release surface; do not present discarded audio as a delivered voice note.

  **Done when:** Another authorized account can actually receive/play/view persistent content, with all failure cases handled, or the feature is explicitly absent. Provider portfolio/certification collection must still follow P01: no silent data loss.

### C03 · Referrals, subscriptions, and Follow

- [ ] **Decision needed:** These are not completed marketplace capabilities. Referral codes derive from truncated user IDs without a uniqueness guarantee; signup does not implement the advertised attribution/reward journey, rewards are client-forgeable, and displayed summaries can be limited. Follow has no behavior. Subscription fields lack an entitlement system.

  **Planning status:** Deferred from the current engineering slice until the referral qualification/reward model is defined. This feature is not approved for release merely because its current UI exists. S02 protects subscription trust fields now; any future paid entitlement must use a trusted processor/backend.

  **Sources:** [referral service][referral-service], [referral UI][referral-ui], [referral hooks][referral-hooks], [provider profile][provider-ui], [rules][rules].

  **If included:** Implement collision-safe codes/links, verified attribution and qualification, fraud-resistant rewards, consistent currency units, reconciliation, and transparent eligibility. Define Follow separately from existing bookmarks and implement its notifications/privacy; protect subscription entitlements with trusted processing.

  **If deferred:** Remove reward promises, inactive Follow, and unsupported entitlement/payment surfaces. Close their unsafe write permissions regardless of UI scope.

  **Done when:** The complete advertised outcome is reproducible across two real test accounts, or the feature is explicitly removed from the launch contract.

### C04 · Geography, regulated categories, verification, and supported platforms

- [ ] **Decision needed:** Confirm launch countries/currency/timezone rules, service-area expectations, provider eligibility, age policy, and whether healthcare/legal/other regulated categories are actually supported. Confirm iPhone/Android/tablet/web scope; app configuration currently advertises tablet support.

  **Sources:** [categories][categories], [provider model][provider-model], [app config][app-json], [booking form][booking-form].

  **Required:** State the real operational promise and validation requirements. Public verification badges require a trustworthy review/revocation process, not user assertions. Obtain the appropriate market-specific policy review; hide unsupported categories/platform promises rather than implying approval or coverage.

  **Done when:** Scope decisions are recorded, reflected in UI/validation/support/policies, and have explicit test devices/markets. No unresolved product decision is silently recorded as completed engineering work.

## Release-candidate acceptance matrix

All applicable rows must have evidence from the release candidate, not just this source audit. Record build IDs, commit, environment, devices/OS versions, locale, test accounts, and result. Use sanitized screenshots/logs.

| Journey / condition | Required evidence before release |
| --- | --- |
| Fresh guest → signup/login → intended action | No lost destination, profile-repair loop, blank app, or forced GPS prerequisite for browsing. Reset and logout work. |
| Requester → provider enrollment → edit/restart | Requester rights remain; valid services and every supported entered field/media persist; edit is prefilled; no logout needed. |
| Discovery → provider → request | Correct filters/pricing/location, visible availability, one-tap entry, usable keyboard/checklist, one durable booking after retry. |
| Provider accepts/starts/submits | Only authorized actions appear; requester sees changes live; status wording/colors match; provider cannot finalize their own work. |
| Requester asks for changes → resubmission → confirmation | One clear action region; reasons retained; no duplicate instructions/approval trap; both timelines complete and consistent. |
| Cancel/decline/reschedule/overdue/no-response | Defined policy, correct permissions, visible history, useful notification and support route; no dead-end state. |
| Completed booking → review/edit/delete → provider response/helpful vote | Eligibility and one-review invariant enforced; sort/author/service data correct; protected aggregates/votes; drafts survive failure. |
| First contact + existing conversation + >100 messages | No permissions error; full history, retry/draft safety, correct read/typing behavior, no fake voice/attachment delivery. |
| Public/owner/account privacy | Direct hostile SDK access fails; published fields intentional; hidden business behavior and private media correct. |
| Notification preferences + multi-device/account switching | Preferences enforced, correct recipient/language, no stale token leakage, duplicate spam, or unauthorized deep link. |
| Network/offline/permission/missing-record faults | Truthful error vs empty states, bounded loading, preserved drafts, retry, and no duplicate successful mutations. |
| EN/FR + light/dark/system + large text + screen readers | No untranslated functional copy, clipped actions, contrast failures, inaccessible controls, or keyboard traps. |
| Financial/referral/media scope | Fully verified selected implementation or intentionally removed UI/promises; never sample values passed off as real. |
| Account deletion + reporting/support | Actual deletion/revocation/anonymization policy tested; reports reach staff; support and policy links are live. |
| Deployment/build/operations | Clean remote EAS release builds, current store requirements, deployed policy/index parity, monitoring, migration/rollback and restore evidence. |

## Completion record

For each closed item, add an entry here (or link a durable issue/PR containing these fields):

```text
Item ID:
Owner:
Implemented in PR/commit:
Tests and device/build evidence:
Migration/backfill and compatibility notes:
Deployed environment/version (if applicable):
Remaining caveats / approved scope decision:
Reviewed by / date:
```

### S01 progress record — updated 2026-09-19

- **Implementation/deployment:** complete. S01 is closed; broader release-candidate automation and governance remain under E04.
- **Owner:** repository owner with Codex implementation assistance.
- **PR/commit:** implementation branch `fix/public-private-profiles`; core commits `090a2d4`, `c74bdcc`, and `5f7709a`, with the September 19 identity-listing/avatar/test follow-up included in the same branch and PR.
- **Evidence:** TypeScript and emulator/migration suites passed; lint has 61 pre-existing warnings and no errors. Live client checks confirm provider discovery, direct public review-identity lookup, private-account denial, and requester identity-list denial. A French two-account smoke test passed on iPhone 15 / iOS 17.5: requester private-account display, discovery, sanitized provider detail, enrollment validation, booking entry, chat, completed history, review form, and reviewer identity; plus provider dashboard, requester capabilities, incoming/active booking access, requester chat, owner profile, business/service edit prefill, and provider-role persistence after reload. No live record was changed during S01 verification. The disposable live requester-to-provider submission was subsequently completed and cleaned up under S02.
- **Migration/environment:** authorized backup, atomic migration, and Firestore-rules-only deployments to `lazonev1-5da5a`; no Functions or Storage deployment. Historical-copy inventory found no managed Firestore backup/schedule, no enabled PITR, and no document data in the tracked emulator export; [details](public-private-profile-rollout.md).
- **Caveats:** five pre-existing providers need services (P02); new media uploads remain P01/S07; the temporary rating exception remains S10. Disposable record-creating native automation remains E04 release work, not an S01 defect.
- **Reviewer/sign-off:** pending.

### S02 progress record — updated 2026-09-20

- **Implementation/deployment:** complete. S02 account trust-field hardening is closed; rating aggregation and referrals remain separately tracked under S10 and C03.
- **Owner:** repository owner with Codex implementation assistance.
- **PR/commit:** branch `fix/account-field-security`; implementation commit `5189b69`.
- **Evidence:** TypeScript passed; lint passed with 0 errors and 61 pre-existing warnings; the complete authenticated Auth/Firestore emulator suite passed. Direct attempts to self-verify, claim paid subscriptions, add unknown privileged fields, change role without enrollment, downgrade role, or delete only the account document are denied. Normal signup, profile/name synchronization, bookmarks, notification tokens, and atomic provider enrollment remain allowed.
- **Native/live verification:** on iPhone 15 / iOS 17.5, a disposable requester signed up, edited their name, added and removed a bookmark, enrolled as a provider with one required service, and immediately received the Business tab without logging out. Admin readback showed `role: both`, `verified: false`, `subscriptionType: free`, zero bookmarks, one notification token, `publicSchemaVersion: 1`, and one service.
- **Migration/environment:** deployed only `firestore:rules` to `lazonev1-5da5a`; no Functions, Storage, index, or document migration was deployed. The disposable Auth account plus `users`, `providers`, and `publicProfiles` documents were deleted after verification; readback confirmed zero test documents remained.
- **Caveats:** ratings remain intentionally client-aggregated during development and are a pre-launch S10 requirement. Referral/reward scope remains C03. Coordinated real account deletion remains A03.
- **Reviewer/sign-off:** pending.

No backlog item beyond S01 and S02 is marked complete. Public release is not approved.

## Source references

[rules]: ../apps/mobile/firestore.rules
[storage-rules]: ../apps/mobile/storage.rules
[rules-tests]: ../apps/mobile/scripts/testFirestoreRules.mjs
[functions]: ../apps/mobile/backend/main/src/functions/index.js
[functions-package]: ../apps/mobile/backend/main/src/functions/package.json
[firebase-config]: ../apps/mobile/backend/main/src/config/firebase.ts
[legacy-firebase]: ../apps/mobile/firebaseConfig.js
[firebase-json]: ../apps/mobile/firebase.json
[client-services]: ../apps/mobile/backend/main/src/services
[repositories]: ../apps/mobile/repositories
[models]: ../apps/mobile/backend/main/src/models
[ui-types]: ../apps/mobile/types
[booking-model]: ../apps/mobile/backend/main/src/models/Booking.ts
[provider-model]: ../apps/mobile/backend/main/src/models/Provider.ts
[review-model]: ../apps/mobile/backend/main/src/models/Review.ts
[auth-service]: ../apps/mobile/backend/main/src/services/authService.ts
[booking-service]: ../apps/mobile/backend/main/src/services/bookingService.ts
[provider-service]: ../apps/mobile/backend/main/src/services/providerService.ts
[conversation-service]: ../apps/mobile/backend/main/src/services/conversationService.ts
[review-service]: ../apps/mobile/backend/main/src/services/reviewService.ts
[referral-service]: ../apps/mobile/backend/main/src/services/referralService.ts
[storage-service]: ../apps/mobile/backend/main/src/services/storageService.ts
[booking-repo]: ../apps/mobile/repositories/bookingRepository.ts
[provider-repo]: ../apps/mobile/repositories/providerRepository.ts
[message-repo]: ../apps/mobile/repositories/messageRepository.ts
[review-repo]: ../apps/mobile/repositories/reviewRepository.ts
[bookmark-repo]: ../apps/mobile/repositories/bookmarkRepository.ts
[referral-repo]: ../apps/mobile/repositories/referralRepository.ts
[auth-context]: ../apps/mobile/contexts/auth.tsx
[booking-hooks]: ../apps/mobile/hooks/useBookings.ts
[provider-hooks]: ../apps/mobile/hooks/useProvider.ts
[message-hooks]: ../apps/mobile/hooks/useMessages.ts
[location-hook]: ../apps/mobile/hooks/useLocation.ts
[referral-hooks]: ../apps/mobile/hooks/useReferrals.ts
[validation]: ../apps/mobile/utils/validation.ts
[service-ids]: ../apps/mobile/utils/generateId.ts
[date-utils]: ../apps/mobile/backend/main/src/utils/utils.ts
[root-layout]: ../apps/mobile/app/_layout.tsx
[login-ui]: ../apps/mobile/app/(auth)/login.tsx
[login-prompt]: ../apps/mobile/components/auth/LoginPrompt.tsx
[account-ui]: ../apps/mobile/app/(tabs)/account.tsx
[booked-ui]: ../apps/mobile/app/(tabs)/booked.tsx
[business-ui]: ../apps/mobile/app/(tabs)/business.tsx
[messages-ui]: ../apps/mobile/app/(tabs)/messages.tsx
[account-info]: ../apps/mobile/app/account/info.tsx
[account-editor]: ../apps/mobile/components/account/EditInfoPopup.tsx
[account-menu]: ../apps/mobile/constants/account.ts
[placeholder-ui]: ../apps/mobile/app/account/subscreens/placeholder.tsx
[preferences-ui]: ../apps/mobile/app/account/subscreens/preferences.tsx
[notification-ui]: ../apps/mobile/app/account/subscreens/notifications.tsx
[wallet-ui]: ../apps/mobile/app/account/subscreens/wallet.tsx
[payment-card]: ../apps/mobile/components/account/PaymentCard.tsx
[referral-ui]: ../apps/mobile/components/account/ReferralComponent.tsx
[registration-ui]: ../apps/mobile/app/provider/registration.tsx
[provider-ui]: ../apps/mobile/app/provider/[id].tsx
[preview-ui]: ../apps/mobile/app/provider/preview.tsx
[reviews-route]: ../apps/mobile/app/provider/reviews.tsx
[business-form]: ../apps/mobile/components/provider/BusinessInfoStep.tsx
[services-form]: ../apps/mobile/components/provider/ServiceDetailsStep.tsx
[cert-picker]: ../apps/mobile/components/provider/CertificationUploader.tsx
[location-picker]: ../apps/mobile/components/ui/LocationPicker.tsx
[search-ui]: ../apps/mobile/app/explore/search-results.tsx
[categories]: ../apps/mobile/constants/categories.ts
[booking-ui]: ../apps/mobile/app/booking/[id].tsx
[booking-new]: ../apps/mobile/app/booking/new.tsx
[booking-edit]: ../apps/mobile/app/booking/edit.tsx
[booking-success]: ../apps/mobile/app/booking/success.tsx
[booking-review]: ../apps/mobile/app/booking/review.tsx
[booking-form]: ../apps/mobile/components/booking/BookingRequestForm.tsx
[booking-status]: ../apps/mobile/components/booking/BookingStatus.tsx
[reviews-ui]: ../apps/mobile/components/reviews/ReviewsComponent.tsx
[chat-ui]: ../apps/mobile/app/messages/[id].tsx
[push-client]: ../apps/mobile/services/notifications/pushNotifications.ts
[notification-handlers]: ../apps/mobile/services/notifications/messageHandlers.ts
[notification-topics]: ../apps/mobile/services/notifications/topics.ts
[shared-button]: ../packages/ui/src/Button.tsx
[shared-input]: ../packages/ui/src/TextInput.tsx
[colors]: ../apps/mobile/constants/Colors.ts
[theme-hook]: ../apps/mobile/hooks/useThemeColor.ts
[select-ui]: ../apps/mobile/components/ui/SelectList.tsx
[bottom-popup]: ../apps/mobile/components/account/BottomPopup.tsx
[toast-ui]: ../apps/mobile/components/ui/Toast.tsx
[localization]: ../apps/mobile/localization/index.ts
[locales]: ../apps/mobile/localization/locales
[booking-copy]: ../apps/mobile/localization/locales/en/booking.json
[account-copy]: ../apps/mobile/localization/locales/en/account.json
[app-json]: ../apps/mobile/app.json
[eas-json]: ../apps/mobile/eas.json
[mobile-package]: ../apps/mobile/package.json
[lockfile]: ../pnpm-lock.yaml
[ci]: ../.github/workflows/mobile-checks.yml
[root-readme]: ../README.md
[mobile-readme]: ../apps/mobile/README.md
