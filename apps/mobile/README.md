# LaZone mobile

Follow the [root setup guide](../../README.md) from the repository root. It is the
canonical guide for pnpm 10.11.0, remote EAS builds, native configuration, and CI checks.

```sh
pnpm install --frozen-lockfile
pnpm dev:mobile
```

Use an installed EAS development client, not Expo Go. After adding a native module,
run `pnpm build:simulator:ios` and install that build before reconnecting to Metro.

For isolated Auth/Firestore checks:

```sh
pnpm --filter ./apps/mobile test:rules:emulator
```

This uses synthetic data in `demo-rules`. The normal app targets the shared Firebase
project. Read the [runbook](../../docs/development.md) before device testing or deployment.
