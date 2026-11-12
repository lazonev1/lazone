import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const mobileDirectory = fileURLToPath(new URL('../apps/mobile/', import.meta.url));
const result = spawnSync(
  'pnpm',
  ['dlx', 'eas-cli@25.1.1', ...process.argv.slice(2)],
  {
    cwd: mobileDirectory,
    stdio: 'inherit',
  },
);

if (result.error) {
  console.error(`Unable to start EAS CLI: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
