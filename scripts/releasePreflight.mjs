import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function parseReleaseArgs(args) {
  const options = {};
  const allowed = new Set(['project', 'target', 'commit', 'bucket']);
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index]?.slice(2);
    const value = args[index + 1];
    if (!args[index]?.startsWith('--') || !allowed.has(key) || !value || value.startsWith('--') || key in options) {
      throw new Error('Use explicit --project ID --target TARGET --commit FULL_SHA (and --bucket NAME for Storage). No execute/apply flag exists.');
    }
    options[key] = value;
  }
  return options;
}

export function createReleasePlan(root, options) {
  root = realpathSync(root);
  const { project, target, commit, bucket } = options;
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project ?? '')) throw new Error('An explicit valid project ID is required');
  if (!['firestore:rules', 'storage', 'functions'].includes(target)) throw new Error('Select exactly one supported deployment target');
  if (!/^[a-f0-9]{40}$/.test(commit ?? '')) throw new Error('An explicit full commit SHA is required');
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  if (git('status', '--porcelain', '--untracked-files=normal')) throw new Error('Refusing a dirty checkout, including untracked files');
  if (git('rev-parse', 'HEAD') !== commit) throw new Error('HEAD does not match the explicitly approved commit');
  try { git('merge-base', '--is-ancestor', commit, 'origin/develop'); }
  catch { throw new Error('The commit must already be reachable from local origin/develop; fetch first. Unmerged work is not a deployment candidate.'); }
  function checkedPath(path) {
    if (typeof path !== 'string' || isAbsolute(path)) throw new Error('Deployment source paths must be repository-relative');
    const full = realpathSync(resolve(root, path));
    const local = relative(root, full);
    if (local.startsWith('..') || isAbsolute(local)) throw new Error('Deployment source escapes the checkout');
    git('ls-files', '--error-unmatch', path);
    return full;
  }
  const read = path => readFileSync(checkedPath(path), 'utf8');
  const configPath = 'apps/mobile/firebase.json';
  const config = JSON.parse(read(configPath));
  const activePath = 'apps/mobile/backend/main/src/config/firebase.ts';
  const active = read(activePath);
  const value = (text, field) => text.match(new RegExp(`${field}\\s*:\\s*["']([^"']+)["']`))?.[1];
  if (value(active, 'projectId') !== project) throw new Error('Requested project differs from the checked-in active Firebase configuration');
  const inputs = [configPath, activePath, 'package.json', 'apps/mobile/package.json', 'pnpm-lock.yaml'];
  // Firebase can read target mappings from these files, including ignored local ones.
  for (const path of ['.firebaserc', 'apps/mobile/.firebaserc']) {
    if (existsSync(resolve(root, path))) inputs.push(path);
  }
  if (target === 'firestore:rules') {
    if (typeof config.firestore?.rules !== 'string') throw new Error('No single Firestore rule source configured');
    inputs.push(`apps/mobile/${config.firestore.rules}`);
  } else if (target === 'storage') {
    const legacyPath = 'apps/mobile/firebaseConfig.js';
    const legacy = read(legacyPath);
    const configuredBucket = value(active, 'storageBucket');
    if (!bucket || configuredBucket !== bucket || value(legacy, 'storageBucket') !== bucket) {
      throw new Error('Storage requires an explicit independently verified bucket and matching active/legacy configuration; do not guess or bypass mismatches');
    }
    if (typeof config.storage?.rules !== 'string') throw new Error('No single Storage rule source configured');
    inputs.push(legacyPath, `apps/mobile/${config.storage.rules}`);
  } else {
    if (typeof config.functions?.source !== 'string') throw new Error('No single Functions source configured');
    const source = `apps/mobile/${config.functions.source}`;
    checkedPath(`${source}/index.js`);
    inputs.push(...git('ls-files', '--', source).split('\n').filter(Boolean));
  }
  const sourceHashes = [...new Set(inputs)].sort().map(path => {
    const bytes = readFileSync(checkedPath(path));
    const approved = execFileSync('git', ['show', `${commit}:${path}`], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    if (!bytes.equals(approved)) throw new Error(`Source differs from approved Git bytes: ${path}`);
    return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
  });
  return {
    mode: 'READ_ONLY_PLAN', generatedAt: new Date().toISOString(), project, target, commit,
    approvedRef: 'origin/develop', bucket: target === 'storage' ? bucket : undefined,
    sourceHashes, liveVerification: 'NOT_PERFORMED', separateDeploymentApprovalRequired: true,
    notes: [
      'This tool does not fetch origin/develop, contact Firebase, certify deployed versions, back up data, or deploy.',
      'Refresh remote refs, review live state/backup evidence, obtain approval, and rerun immediately before any manual deployment.',
      'Source hashes exclude ignored files; Functions deployment archive/secret inspection is a separate required gate.',
    ],
    manualCommandOnly: ['pnpm', 'dlx', 'firebase-tools@15.5.1', 'deploy', '--config', 'firebase.json', '--project', project, '--only', target],
    manualCommandDirectory: 'apps/mobile',
  };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    console.log(JSON.stringify(createReleasePlan(root, parseReleaseArgs(process.argv.slice(2))), null, 2));
  } catch (error) { console.error(`Release preflight blocked: ${error.message}`); process.exitCode = 1; }
}
