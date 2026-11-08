import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createReleasePlan, parseReleaseArgs } from './releasePreflight.mjs';

const root = mkdtempSync(join(tmpdir(), 'lazone-release-test-'));
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const write = (path, content) => writeFileSync(join(root, path), content);
try {
  mkdirSync(join(root, 'apps/mobile/backend/main/src/config'), { recursive: true });
  mkdirSync(join(root, 'apps/mobile/backend/main/src/functions'), { recursive: true });
  git('init', '--quiet'); git('config', 'user.email', 'test@example.test'); git('config', 'user.name', 'Release Test');
  const config = {
    firestore: { rules: 'firestore.rules' }, storage: { rules: 'storage.rules' }, functions: { source: 'backend/main/src/functions' },
  };
  write('apps/mobile/firebase.json', JSON.stringify(config));
  write('apps/mobile/backend/main/src/config/firebase.ts', 'const config = { projectId: "demo-release", storageBucket: "demo-release.appspot.com" };');
  write('apps/mobile/firebaseConfig.js', 'const config = { storageBucket: "demo-release.appspot.com" };');
  write('apps/mobile/firestore.rules', 'rules_version = "2";');
  write('apps/mobile/storage.rules', 'rules_version = "2";');
  write('apps/mobile/backend/main/src/functions/index.js', '// fixture only');
  write('package.json', '{}'); write('apps/mobile/package.json', '{}'); write('pnpm-lock.yaml', 'fixture');
  write('apps/mobile/.firebaserc', '{"projects":{"default":"demo-release"}}');
  function commit(updateRef = true) {
    git('add', '.'); git('commit', '--quiet', '-m', 'fixture');
    const hash = git('rev-parse', 'HEAD');
    if (updateRef) git('update-ref', 'refs/remotes/origin/develop', hash);
    return hash;
  }
  let hash = commit();
  const options = target => ({ project: 'demo-release', target, commit: hash });
  const initial = createReleasePlan(root, options('firestore:rules'));
  assert.equal(initial.mode, 'READ_ONLY_PLAN');
  assert.equal(initial.liveVerification, 'NOT_PERFORMED');
  assert.equal(initial.separateDeploymentApprovalRequired, true);
  assert.ok(initial.sourceHashes.every(value => /^[a-f0-9]{64}$/.test(value.sha256)));
  assert.ok(initial.sourceHashes.some(value => value.path === 'apps/mobile/firestore.rules'));
  assert.ok(initial.sourceHashes.some(value => value.path === 'apps/mobile/.firebaserc'));
  assert.equal(createReleasePlan(root, options('functions')).manualCommandOnly.at(-1), 'functions');
  assert.throws(() => createReleasePlan(root, options('storage')), /bucket/i);
  assert.equal(createReleasePlan(root, { ...options('storage'), bucket: 'demo-release.appspot.com' }).bucket, 'demo-release.appspot.com');
  assert.throws(() => createReleasePlan(root, { ...options('firestore:rules'), project: 'other-project' }), /differs/);
  assert.throws(() => createReleasePlan(root, options('all')), /target/);
  assert.throws(() => createReleasePlan(root, { ...options('firestore:rules'), commit: hash.slice(0, 7) }), /SHA/);
  assert.throws(() => parseReleaseArgs(['--execute']), /No execute/);
  assert.throws(() => parseReleaseArgs(['--project', 'a', '--project', 'b']), /explicit/);
  assert.throws(() => createReleasePlan(root, { ...options('firestore:rules'), commit: '0'.repeat(40) }), /HEAD/);
  write('untracked.txt', 'test');
  assert.throws(() => createReleasePlan(root, options('firestore:rules')), /dirty/);
  unlinkSync(join(root, 'untracked.txt'));
  write('apps/mobile/firestore.rules', 'changed');
  assert.throws(() => createReleasePlan(root, options('firestore:rules')), /dirty/);
  hash = commit(false);
  assert.throws(() => createReleasePlan(root, options('firestore:rules')), /origin\/develop/);
  git('update-ref', 'refs/remotes/origin/develop', hash);
  const second = createReleasePlan(root, options('firestore:rules'));
  assert.notEqual(initial.sourceHashes.find(value => value.path.endsWith('firestore.rules')).sha256,
    second.sourceHashes.find(value => value.path.endsWith('firestore.rules')).sha256);
  write('apps/mobile/firebaseConfig.js', 'const config = { storageBucket: "conflicting-bucket" };'); hash = commit();
  assert.throws(() => createReleasePlan(root, { ...options('storage'), bucket: 'demo-release.appspot.com' }), /mismatches/);
  const before = readFileSync(join(root, 'apps/mobile/firebase.json'), 'utf8');
  createReleasePlan(root, options('firestore:rules'));
  assert.equal(readFileSync(join(root, 'apps/mobile/firebase.json'), 'utf8'), before);
  assert.equal(git('status', '--porcelain'), '', 'preflight must not write to the checkout');
  const approvedRules = readFileSync(join(root, 'apps/mobile/firestore.rules'));
  git('update-index', '--assume-unchanged', 'apps/mobile/firestore.rules');
  write('apps/mobile/firestore.rules', 'hidden local modification');
  assert.throws(() => createReleasePlan(root, options('firestore:rules')), /approved Git bytes/);
  write('apps/mobile/firestore.rules', approvedRules);
  git('update-index', '--no-assume-unchanged', 'apps/mobile/firestore.rules');
  // Symlink traversal is tested without reading or altering external user data.
  unlinkSync(join(root, 'apps/mobile/firestore.rules'));
  symlinkSync('/dev/null', join(root, 'apps/mobile/firestore.rules')); hash = commit();
  assert.throws(() => createReleasePlan(root, options('firestore:rules')), /escapes/);
  console.log('Release preflight tests passed: explicit inputs, merged clean commit, source hashes, target/project/bucket gates, dirty/unmerged denial, symlink bounds, and read-only behavior.');
} finally {
  rmSync(root, { recursive: true, force: true });
}
