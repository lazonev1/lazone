import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, sep, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

export function evaluateLintReport(report, baseline, root) {
  if (!Array.isArray(report)) throw new Error('ESLint did not return a report array');
  const counts = {};
  const failures = [];
  for (const [key, count] of Object.entries(baseline)) {
    if (!Number.isSafeInteger(count) || count < 1) throw new Error(`Invalid baseline count: ${key}`);
  }
  for (const file of report) {
    if (typeof file.filePath !== 'string' || !Array.isArray(file.messages)) throw new Error('Malformed ESLint file report');
    const path = relative(root, file.filePath).split(sep).join('/');
    if (path.startsWith('../') || path === '..') throw new Error('ESLint report is outside the lint root');
    for (const message of file.messages) {
      if (message.severity === 2 || message.fatal) {
        failures.push(`${path}:${message.line ?? 0}: ${message.ruleId ?? 'parse/config'}: ${message.message}`);
      } else if (message.severity === 1) {
        const key = `${path}|${message.ruleId ?? 'null'}`;
        counts[key] = (counts[key] ?? 0) + 1;
      } else if (message.severity !== 0) throw new Error('Unknown ESLint diagnostic severity');
    }
  }
  for (const [key, count] of Object.entries(counts)) {
    if (count > (baseline[key] ?? 0)) failures.push(`${key}: ${count} warnings exceed baseline ${baseline[key] ?? 0}`);
  }
  return { failures, warningCount: Object.values(counts).reduce((sum, count) => sum + count, 0) };
}

export function runLintBaseline() {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const require = createRequire(import.meta.url);
  const cli = join(dirname(require.resolve('eslint/package.json')), 'bin/eslint.js');
  const result = spawnSync(process.execPath, [cli, '.', '--format', 'json'], {
    cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error || result.signal || result.status === null || result.status > 1) {
    throw new Error(`ESLint could not complete: ${result.error?.message ?? result.signal ?? result.stderr}`);
  }
  const baseline = JSON.parse(readFileSync(new URL('./lint-baseline.json', import.meta.url), 'utf8'));
  const evaluated = evaluateLintReport(JSON.parse(result.stdout), baseline, root);
  if (evaluated.failures.length || result.status !== 0) {
    throw new Error(`Lint regression detected:\n${evaluated.failures.join('\n') || result.stderr}`);
  }
  console.log(`Lint baseline passed: ${evaluated.warningCount} existing warnings; no file/rule count increased. Errors remain forbidden.`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { runLintBaseline(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
