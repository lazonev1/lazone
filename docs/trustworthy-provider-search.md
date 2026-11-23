# Trustworthy provider search (P06)

## Problem

The price slider filtered `provider.pricing`, even though provider registration saves prices on services. Unknown prices passed the budget filter. Slider defaults also exceeded their configured range. Search reloaded and hydrated the entire provider catalogue on each filter change, allowing slow responses to overwrite newer results. Physical radius rules were unclear for remote services and unavailable GPS.

## Before → after

```text
Before
Every key/slider change → Firestore provider scan → populate details
                      → parse a legacy price summary → replace results

After
Open search / Refresh → load authorized public provider catalogue once
                      → retain same-account catalogue on refresh failure
Every filter change   → pure local filters → stable sorted results
Account changes       → hide old results → cancel old response → reload
```

## Product behavior

- **Budget:** a provider qualifies if at least one valid published service is at or below the limit. Cards show the same “From … CFA” price. This is not a promise that every service or the negotiated booking price is below that amount. Unknown prices do not pass an active budget filter.
- **Radius:** uses unrounded geographic distance for filtering; cards round only for display. Providers with unknown coordinates cannot pass a nearby filter. The maximum slider position explicitly means Any distance.
- **Remote:** Remote Services Only ignores physical radius. The disabled radius control and explanation make that behavior visible.
- **City:** optional text filters the provider's published city, case/accent-insensitively. It works without GPS and disables radius while active. It is city-name matching, not geocoding or an exact service-area guarantee.
- **Text:** searches identity, business, category, biography, and service text. Stable category IDs also match their English and French labels/descriptions.
- Filters and results share one scrollable list, with accessible filter labels, refresh/reset controls, error recovery, and explicit price/location metadata. Existing results remain visible during refresh.

## Files and boundaries

`utils/providerSearch.ts` contains shared, pure search semantics. `useProviderSearch.ts` manages one catalogue load per identity/explicit refresh, cancels stale responses, and filters locally. The search screen owns filter controls; shared provider cards opt into metadata only on this screen. The repository's existing search method uses the same filter function. CI runs `pnpm --filter ./apps/mobile test:search`.

No Firestore schema/rules, Auth flow, provider registration, native dependency, or existing EAS build changed. No migration or Firebase deployment is required.

## Verification

- Actual filter module tests: prices (including mixed/invalid/missing), combined filters, exact distance boundaries, unknown coordinates, remote-only behavior, accent-insensitive city matching, deterministic order, and English/French category matches.
- Actual hook with a mocked lifecycle: no refetch on filter changes, account-switch result masking, ignored delayed responses, same-account stale result retention, retry, and recovery.
- TypeScript and full lint pass on the resolved branch (zero errors; 95 warnings, including existing warnings and the new hook's effect warning).
- Full Firebase Auth/Firestore authorization and migration regression suite passes using emulator-only data.
- iOS and Android JavaScript bundle exports pass.
- On 2026-11-23, an installed iOS 17.5 development build loaded this branch against existing Firestore providers. Search found two `Abdoul` profiles and showed a real 50,000 CFA starting price versus an unavailable price. Published-city filtering narrowed the results to one, remote-only showed its explanation and disabled radius, Reset restored 12 results, Refresh retained the list, and a result opened the correct provider profile. The filter panel and cards were visually inspected on iPhone 15 Plus. No live data was written.
- Simulator coordinate drag/scroll control failed during this run, so the actual native price/radius slider interaction, denied-location state, and long-list scrolling remain unverified. Their filter semantics have automated coverage; that is not a substitute for those UI checks.

## Remaining release gates

Keep P06 unchecked until iOS/Android checks verify the remaining native slider, keyboard/long-list scrolling, and denied-location behavior. E02 still owns indexed/server-side pagination and bounded discovery reads: this change removes repeat scans per filter interaction but still loads the catalogue on initial entry/explicit refresh. Category-specific browse routes remain unchanged.
