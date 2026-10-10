# LaZone

Expo / React Native marketplace in a pnpm monorepo. `apps/mobile` contains the app;
`packages/ui` contains shared controls. Run commands below from the repository root.

## Supported setup

Use Node **20.19.4 or newer within 20.x** (matching CI's major and React Native's minimum),
pnpm **10.11.0** (the root `packageManager`), and Java **21**
for Firestore emulator tests. Java runs the local test database; it is not an app dependency.
Runtime/toolchain upgrades remain tracked in E03.

```sh
corepack enable
corepack prepare pnpm@10.11.0 --activate
pnpm install --frozen-lockfile
```

`pnpm-lock.yaml` is the only workspace lockfile. Do not run `npm install` in subfolders.
The Firebase CLI is pinned by the test script; no global installation is needed.

## Run the mobile app

Use an EAS **development build**, because the app uses native Firebase messaging and
Expo Localization. Expo Go is not the supported runtime.

1. Obtain `google-services.json` and `GoogleService-Info.plist` from the project owner
   and place them in `apps/mobile/`. These are Firebase client configuration, not Admin
   credentials. They stay Git-ignored; the root `.easignore` includes them in EAS archives.
   Access control comes from deployed rules, not secrecy of client API keys.
2. Sign in and install a compatible iOS simulator build:

   ```sh
   pnpm eas:login
   pnpm --filter ./apps/mobile exec eas build:run --platform ios
   ```

3. Start Metro and open the installed app:

   ```sh
   pnpm dev:mobile
   ```

   Keep that terminal running. Press `i` to open iOS or use the development-client
   link on a configured physical device. Stop Metro with Ctrl+C.

The mobile client currently targets **lazonev1-5da5a** by default. Native testing can
create real accounts/data. Use agreed disposable accounts and clean up only their IDs.
The automated rule tests below never use this shared project.

## Remote builds

Build on EAS; a local native prebuild is not required for the normal workflow.

```sh
# Only iOS simulator — remote compilation
pnpm build:simulator:ios
pnpm --filter ./apps/mobile exec eas build:run --platform ios
```

| Command | Target |
| --- | --- |
| `pnpm build:simulator:ios` | iOS simulator development client |
| `pnpm build:simulator:android` | Android development APK |
| `pnpm build:ios` | Physical iOS development build; Apple provisioning required |
| `pnpm build:android` | Android development build |
| `pnpm build:mobile:prod` | Both store platforms; release-owner action |

Rebuild after adding/changing native dependencies or native app configuration. JS,
TypeScript, styling, and route changes normally reload through Metro. A missing native
module such as `ExpoLocalization` usually means the installed binary needs rebuilding;
restarting Metro cannot add a native module to an existing binary.

Do not remove Firebase files from `.gitignore` to fix uploads. See the
[development runbook](docs/development.md) for archive inspection, testing, permissions,
deep links, deployments, and rollback.

## Checks before a PR

```sh
pnpm --filter ./apps/mobile typecheck
pnpm --filter ./apps/mobile lint
pnpm --filter ./apps/mobile test:rules:emulator
node --check apps/mobile/backend/main/src/functions/index.js
git diff --check
```

CI uses the same commands. Emulator tests create synthetic requester/provider/outsider
accounts, assert allowed and denied writes, and stop afterward. They do not establish
native UI behavior or live deployment correctness.

## Code map

- `apps/mobile/app/`: Expo Router screens
- `apps/mobile/components/`, `hooks/`, `contexts/`: presentation and state
- `apps/mobile/repositories/`: Firestore-to-UI adapters
- `apps/mobile/backend/main/src/services/`: client data operations
- `apps/mobile/backend/main/src/config/firebase.ts`: active Firebase client configuration
- `apps/mobile/firestore.rules`, `storage.rules`: authorization boundaries
- `apps/mobile/backend/main/src/functions/`: notification functions; separate rollout
- `docs/release-readiness.md`: release backlog and verification evidence

For permission errors, inspect identity, payload, and deployed rules. Never enable
permissive Firestore test mode to make a failing app flow work.
