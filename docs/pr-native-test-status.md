# Open PR native test status

Updated November 21, 2026. Seventeen PRs are open (11 drafts, 6 non-drafts).
Twelve need feature-specific native verification. This run completed the core
iOS saved-provider recovery journey and parts of three other native gates;
it did not complete all twelve PRs or validate Android. No PR was merged or
changed from draft to ready.

## Verified in this run

All in-app writes used disposable `demo-lazone-mobile` data. PRs #111–#113 ran
their own feature source in a separate checkout with only PR #114's Firebase,
push-isolation, and local-banner configuration temporarily overlaid. Those
test-only changes were not committed into the feature PRs. The existing iPhone
15 Plus SDK 57 client and installed SDK 57 dependencies were reused.

- **#112:** requester save, restart/persistence, open-profile/removal separation,
  rejected removal retaining the card, rejected reads retaining last-loaded
  details with Retry, successful recovery/removal, account-switch isolation,
  and provider save/remove of another business passed in the app. Local fault-
  injection rules were restored after each test. Evidence is in
  `docs/saved-provider-recovery.md` (commit `2389608`). Android remains untested.
- **#113:** provider Account had no false visibility switch; Business navigation,
  public profile, and other menus worked. Requester Account retained its menus
  and enrollment card. Tapping enrollment after scrolling remains unverified.
- **#114:** guest local catalog/banner, requester and provider login, requester
  session recovery after termination/reopen, logout, account switching, provider
  Business access and retained requester booking access passed on iOS. The full
  local Auth/Firestore/Storage integration suite and repeatable fixtures passed.
- **#111:** Business → Reviews, canonical summary, eligible requester submission,
  rejected-save rating retention and retry, already-reviewed blocking, high/low
  sorting, helpful voting, and requester rating edits passed. The displayed mean
  changed from 3.5 to 3.0 after editing 5 stars to 4. Completed-booking setup was
  synthetic local fixture data, not a native booking-lifecycle test. A duplicate
  details-screen navigation issue was fixed with `dismissTo`; its regression
  test, typecheck and targeted lint passed, but native retesting was interrupted.

Supplementary component/service suites passed on #101, #102, #104, #105, #107,
#109, #111, #112 and #113. The tests on #107 and #109 needed explicit
`esModuleInterop: false` for their fixture loaders under installed TypeScript 6;
the fixes were pushed (`f5afccc`, `365dc47`) and both PR checks passed.
These runs used shared installed tooling, not an install of each older lockfile.

The complete integration scripts from #98 and #100 also passed against each
branch's exact Firestore rules loaded into the separate local `demo-rules`
project. The native flows below remain required; SDK assertions are not UI tests.

## Resume prerequisites

Keep the Mac unlocked. Native coordinate interactions and multiline entry began
failing with `noWindowsAvailable`, even while accessibility-button actions still
worked. After reconnecting controls and restarting the app, the tool explicitly
reported the Mac locked. Do not infer an app defect from those control failures.
Free at least 10 GB before installing another dependency tree or starting Android:
space fluctuated between about 100 MB and 3.7 GB; Metro and checkout previously
failed with `ENOSPC`. No shared Firebase rules or EAS builds were changed.

Eight branches (#98, #100–#102, #104–#105, #107, #109) still declare Expo 54 and
React Native 0.81. The currently installed dependencies and iPhone 15 Plus client
use Expo 57 and React Native 0.86. Install/use a matching dependency and client pair
for those branches, or separately agree how to update their base. Do not claim
native validation from mixing the old branch with the newer runtime.

## Remaining cases

These are remaining checks, not completed results. The eight SDK 54 branches
are additionally blocked on a matching dependency/client pair, as explained above.

| PR | Feature | In-app acceptance checks |
| --- | --- | --- |
| #114 | Isolated simulator Firebase | Android login/persistence/logout and host routing; explicit live/demo session separation. iOS local account journey passed. |
| #113 | Business visibility guard | Finish native requester enrollment navigation and Android check. Core provider/requester Account checks passed on iOS. |
| #112 | Saved providers | Android walkthrough. Core iOS save/remove, persistence, rejection/retry and two-account isolation passed. |
| #111 | Reviews | Provider reply/edit, multiline comment recovery, requester deletion and guest visibility; native retest of corrected return navigation; Android walkthrough. |
| #109 | Account email | Auth email is read-only; name/phone edits persist; failed saves retain the draft, in EN/FR. |
| #107 | Provider form recovery | Back/forward retains second-step draft; failed hydration offers Retry; failed save preserves input; duplicate taps and account changes are safe. |
| #105 | Shared buttons | Large text, all variants and sizes, disabled/busy controls, keyboard layouts, VoiceOver/TalkBack. |
| #104 | Conversation localization | Runtime EN/FR switch and restart; dates, yesterday, typing, and sender prefixes follow the app language. |
| #102 | Selectors | Scroll to the last service/category, long translated labels, selection/close/back, large text and accessibility focus. |
| #101 | Provider search | Service price/radius/remote/category combinations, denied GPS/manual city, refresh failure, retry, stale responses and EN/FR. |
| #100 | Realtime bookings | Both participants see accept/start/submit/changes/confirm/cancel without reopening; timeline, retry and account switching stay correct. |
| #98 | Retry-safe creation | Rapid taps and uncertain-write retry yield one booking; invalid/stale service rejection preserves the draft; both roles see the resulting booking. |

#99 already has earlier recorded in-app send/reload evidence. #103, #106, #108 and
#110 are rules/domain/tooling slices with their own automated acceptance gates;
they do not replace any of the native checks above. No draft was marked ready in
this attempt. GitHub additionally reported conflicts on #99, #100, #101, #106
and #110. Green historical checks do not make those PRs ready to merge; conflict
resolution and integration verification remain separate work.
