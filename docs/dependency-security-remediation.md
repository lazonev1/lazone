# Dependency security remediation

Date: **2026-10-22**
Work item: **S09**
Branch: **`fix/dependency-security`**

## Why this change was needed

The release-readiness baseline reported **149 production-graph advisories**: 4 critical, 89 high, 48 moderate, and 8 low. Most were inherited through Expo, Firebase, build tooling, and server packages rather than code imported directly by a screen, but they still affected shipped dependencies or the CI/build environment.

```text
Before

old Expo/Firebase/Functions graph
          │
          ├── vulnerable runtime dependencies
          └── vulnerable build dependencies
                         │
                         └── CI did not enforce a production audit

After

supported Expo 57 / React Native 0.86 / Firebase graph
          │
          ├── patched direct and transitive versions
          ├── remaining moderate tooling advisories, owned below
          └── PR + weekly CI production-audit gate
                         │
                         └── remote iOS + Android native builds
                                      └── guest simulator/emulator smoke tests
```

## What changed

| Area | Before | After |
| --- | --- | --- |
| Mobile platform | Expo 54, React Native 0.81, React 19.1 | Expo 57, React Native 0.86, React 19.2 |
| Firebase clients | Firebase JS 12 and RNFirebase 23 | Firebase JS 13 and RNFirebase 26 modular APIs |
| Cloud Functions | Node 20-era packages and namespaced Admin API | Node 22, Firebase Admin 14, Functions 7, modular APIs |
| Audio | Deprecated `expo-av` | Supported `expo-audio` recorder API |
| Navigation | Direct React Navigation packages alongside Expo Router | Expo Router's SDK-compatible navigation exports |
| EAS CLI | Large repository dependency | Pinned one-off CLI wrapper run from `apps/mobile` |
| Advisory checks | Manual audit only | `pnpm audit:prod` on PRs, protected branches, and every Monday |

Narrow pnpm overrides are limited to patched versions that remain within the affected packages' compatible release lines. The Expo config-plugin override from 57.0.10 to 57.0.11 removes the final moderate `uuid` advisory and is covered by Expo Doctor, prebuild, type checking, production bundling, and the native smoke test.

## Remaining advisories

After reconciling this branch with current `develop` and the 2026-11-06 registry advisories, the production audit reports **0 critical, 0 high, 4 moderate, and 0 low**. Newly patched transitive findings in `body-parser`, `decode-uri-component`, `node-forge`, `re2js`, and Zod are pinned through narrow workspace overrides and current SDK 57 patch releases.

| Advisory | Path and reachability | Decision | Owner / expiry |
| --- | --- | --- | --- |
| `GHSA-3g3m-2fjr-6pw4` / `GHSA-g3hv-75wg-m249` (`glob` / `minimatch`) | Expo fingerprinting and Google Firestore package-maintenance paths; app users do not supply these glob patterns. Available fixes require incompatible major versions. | Track upstream Expo/Google releases; do not pass user-controlled patterns to fingerprint or cleanup tooling. | Engineering / 2026-11-17 |

The allowlist mechanism lives in `scripts/auditProduction.mjs` and is currently empty. Critical findings always fail. High findings fail unless their exact advisory ID has a non-expired acceptance, so newly reported advisories cannot silently inherit an exception.

## Verification evidence

- `pnpm install --frozen-lockfile --offline`: pass; lockfile is reproducible from the local package cache.
- `pnpm audit:prod`: pass; 0 critical, 0 high, 4 moderate, 0 low. All reported paths and ownership are documented above.
- `pnpm --filter ./apps/mobile typecheck`: pass.
- `pnpm --filter ./apps/mobile lint`: pass with 0 errors and 105 warnings exposed by the newer React compiler rules after reconciling current `develop`.
- Auth + Firestore emulator rules suite: pass.
- Production iOS JavaScript export: pass.
- Production Android JavaScript export: pass.
- Expo Doctor: 20/21; package compatibility passes. The only failure is this Mac's Xcode 15.4, while SDK 57 requires a newer Xcode supplied by EAS.
- EAS iOS simulator build `f7c68a77-8422-41e4-87c3-22ab5bf8f272`: finished successfully.
- EAS Android simulator build `3e2d82b7-2003-4abf-a793-51bcc359aeff`: finished successfully with compile/target SDK 36 and Kotlin 2.1.20.
- iPhone 15 Plus simulator: development client installed; current bundle renders the guest home screen and existing Firestore provider records after correcting the RNFirebase background-message entry point.
- Android API 31 emulator: the EAS artifact installed and launched; the current bundle renders the guest home screen and existing Firestore provider records with no React Native or Android runtime error logged.
- iPhone 15 / iOS 17.5 authenticated two-account journey: pass. A requester discovered and booked a newly enrolled provider; the provider accepted, started, and submitted the work; the requester confirmed it; both roles saw the complete five-event timeline; first-contact messaging, completed history, provider revenue/completion metrics, and review-form eligibility worked against the live development project.
- The authenticated journey exposed an Expo Audio native-object cleanup crash when leaving chat. Cleanup now tracks recording state in React rather than reading an already-released native object; requester and provider both reopened and left the conversation without a crash.
- Discovery no longer applies a hidden distance restriction by default, and embedded service names/descriptions participate in provider text search. Known provider search was rechecked in the installed iOS client.

## Completion status

S09 is complete on this branch. The dependency graph, production-audit gate, native builds, guest platform smoke tests, and authenticated requester/provider journey all pass. The remaining moderate advisories are build/package-maintenance paths with explicit ownership and a 2026-11-17 review date. No high advisory is currently allowlisted; any new high finding fails CI.
