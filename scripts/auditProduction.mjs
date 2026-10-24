import { spawnSync } from 'node:child_process';

const acceptedHighAdvisories = new Map([
  ['GHSA-86w9-cpqp-85rv', '2026-11-17'], // Expo CLI -> node-forge; no patched release.
  ['GHSA-vfj7-8cjw-p6xm', '2026-11-17'], // Metro -> micromatch -> braces; no patched release.
]);

const audit = spawnSync('pnpm', ['audit', '--prod', '--json'], {
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
});

if (audit.error) {
  console.error(`Unable to run the production dependency audit: ${audit.error.message}`);
  process.exit(1);
}

if (!audit.stdout.trim()) {
  console.error('The production dependency audit returned no report.');
  console.error(audit.stderr.trim());
  process.exit(1);
}

let report;
try {
  report = JSON.parse(audit.stdout);
} catch {
  console.error('The production dependency audit returned invalid JSON.');
  console.error(audit.stderr.trim());
  process.exit(1);
}

if (report.error || !report.metadata?.vulnerabilities || !report.advisories) {
  console.error('The production dependency audit returned an incomplete or failed report.');
  if (report.error) {
    console.error(report.error.summary ?? report.error.message ?? JSON.stringify(report.error));
  }
  if (audit.stderr.trim()) console.error(audit.stderr.trim());
  process.exit(1);
}

const advisories = Object.values(report.advisories ?? {});
const now = new Date();
const blocking = advisories.filter((advisory) => {
  if (advisory.severity === 'critical') return true;
  if (advisory.severity !== 'high') return false;

  const expiresOn = acceptedHighAdvisories.get(advisory.github_advisory_id);
  return !expiresOn || now > new Date(`${expiresOn}T23:59:59Z`);
});

const counts = report.metadata?.vulnerabilities ?? {};
console.log(
  `Production audit: ${counts.critical ?? 0} critical, ${counts.high ?? 0} high, ` +
    `${counts.moderate ?? 0} moderate, ${counts.low ?? 0} low.`,
);

for (const advisory of advisories.filter((item) => item.severity === 'high')) {
  const expiresOn = acceptedHighAdvisories.get(advisory.github_advisory_id);
  if (expiresOn) {
    console.warn(
      `Temporarily accepted ${advisory.github_advisory_id} in ${advisory.module_name}; ` +
        `review by ${expiresOn}.`,
    );
  }
}

if (blocking.length > 0) {
  console.error('Blocking production dependency advisories:');
  for (const advisory of blocking) {
    console.error(
      `- ${advisory.severity}: ${advisory.module_name} (${advisory.github_advisory_id ?? advisory.id})`,
    );
  }
  process.exit(1);
}
