import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function load(path, mocks = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  runInNewContext(`(function(require, exports) { ${outputText}\n})`)(name => mocks[name] ?? require(name), exports);
  return exports;
}
const repo = load('repositories/bookmarkRepository.ts', {
  '@/backend/main/src/services/bookmarkService': {},
  '@/repositories/providerRepository': {
    getProviderViewModel: async id => {
      if (id === 'missing') return null;
      if (id === 'unreachable') throw new Error('offline');
      return { id, name: id };
    },
  },
});
const entries = await repo.getBookmarkedProviders(['alpha', 'missing', 'unreachable']);
assert.equal(Array.from(entries, entry => entry.status).join(','), 'available,unavailable,failed');
assert.equal(Array.from(entries, entry => entry.id).join(','), 'alpha,missing,unreachable');
assert.equal((await repo.getBookmarkedProviders([])).length, 0);

let ownerExists = true;
const service = load('backend/main/src/services/bookmarkService.ts', {
  '../config/firebase': { COLLECTIONS: { USERS: 'users' } },
  'firebase/firestore': {
    doc: (_db, collection, uid) => ({ collection, uid }),
    getDocFromServer: async ref => {
      assert.equal(ref.collection, 'users');
      assert.equal(ref.uid, 'requester');
      return { exists: () => ownerExists, data: () => ({ bookmarked: ['alpha', 'alpha', 'nested/path', 42, ''] }) };
    },
  },
});
assert.equal(Array.from(await service.getBookmarkedProviderIds('requester')).join(','), 'alpha');
ownerExists = false;
await assert.rejects(service.getBookmarkedProviderIds('requester'), /unavailable/);

const slots = [];
let cursor = 0;
let effects = [];
const same = (a, b) => a?.length === b.length && b.every((dep, i) => Object.is(a[i], dep));
const react = {
  createContext: () => ({ Provider: 'BookmarkProvider' }),
  useState(value) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = value;
    return [slots[index], update => { slots[index] = typeof update === 'function' ? update(slots[index]) : update; }];
  },
  useRef(value) {
    const index = cursor++;
    return slots[index] ??= { current: value };
  },
  useMemo(factory, deps) {
    const index = cursor++;
    if (!same(slots[index]?.deps, deps)) slots[index] = { deps, value: factory() };
    return slots[index].value;
  },
  useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
  useEffect(effect, deps) {
    const index = cursor++;
    if (!same(slots[index]?.deps, deps)) effects.push(() => {
      slots[index]?.cleanup?.();
      slots[index] = { deps, cleanup: effect() };
    });
  },
};
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((success, failure) => { resolve = success; reject = failure; });
  return { promise, resolve, reject };
};
const flush = () => new Promise(resolve => setImmediate(resolve));
let user = { uid: 'requester' };
let readIds = async () => ['alpha', 'missing', 'unreachable'];
let readEntries = repo.getBookmarkedProviders;
let removal = deferred();
let removeCalls = 0;
let alerts = 0;
const cache = new Map();
const { BookmarkProvider } = load('contexts/bookmarks.tsx', {
  react,
  'react-native': { Alert: { alert: () => alerts++ } },
  '@react-native-async-storage/async-storage': {
    getItem: async key => cache.get(key),
    setItem: async (key, value) => { cache.set(key, value); },
  },
  'react-i18next': { useTranslation: () => ({ t: key => key }) },
  '@/contexts/auth': { useAuth: () => ({ user }) },
  '@/repositories/bookmarkRepository': {
    getBookmarkedIds: uid => readIds(uid),
    getBookmarkedProviders: ids => readEntries(ids),
    removeBookmark: (uid, id) => {
      assert.equal(uid, 'requester');
      assert.equal(id, 'alpha');
      removeCalls++;
      return removal.promise;
    },
  },
});
function render(commit = true) {
  cursor = 0;
  effects = [];
  const { props } = BookmarkProvider({ children: null });
  if (commit) effects.forEach(effect => effect());
  return props.value;
}
let state = render();
assert.equal(state.isLoading, true);
await state.fetchBookmarkedProviders(); // Focus and initial account load can race.
state = render();
assert.equal(state.entries.length, 3);
assert.equal(state.isBookmarked('alpha'), true);

readEntries = async () => [{ id: 'alpha', status: 'failed' }, entries[1], entries[2]];
await state.fetchBookmarkedProviders();
state = render();
assert.equal(state.entries[0].provider.name, 'alpha');
assert.equal(state.entries[0].stale, true);

readIds = async () => { throw new Error('offline'); };
await state.fetchBookmarkedProviders();
state = render();
assert.equal(state.entries.length, 3);
assert.equal(state.hasLoadError, true);
assert.equal(state.canChangeBookmarks, false);
readIds = async () => ['alpha', 'missing', 'unreachable'];
readEntries = repo.getBookmarkedProviders;
await state.fetchBookmarkedProviders();
state = render();

const first = state.toggleBookmark('alpha');
assert.equal(await state.toggleBookmark('alpha'), false);
assert.equal(removeCalls, 1);
assert.equal(render().isBookmarkPending('alpha'), true);
removal.reject(new Error('denied'));
assert.equal(await first, false);
assert.equal(alerts, 1);
state = render();
assert.equal(state.entries[0].id, 'alpha');
assert.equal(state.isBookmarked('alpha'), true);

// An older fetch must not put a successfully removed card back.
removal = deferred();
const pendingRead = deferred();
readEntries = () => pendingRead.promise;
const second = state.toggleBookmark('alpha');
const refresh = state.fetchBookmarkedProviders();
await flush();
removal.resolve();
assert.equal(await second, true);
pendingRead.resolve(entries);
await refresh;
state = render();
assert.equal(state.isBookmarked('alpha'), false);
assert.ok(!state.entries.some(entry => entry.id === 'alpha'));
assert.equal(JSON.parse(cache.get('bookmark_ids_cache_requester')).includes('alpha'), false);

const oldIds = deferred();
readIds = uid => uid === 'requester' ? oldIds.promise : Promise.resolve(['beta']);
readEntries = repo.getBookmarkedProviders;
const oldRefresh = state.fetchBookmarkedProviders();
await flush();
user = { uid: 'provider' };
state = render();
assert.equal(state.entries.length, 0, 'old account data must be hidden on the first render');
assert.equal(state.isBookmarked('missing'), false);
await state.fetchBookmarkedProviders();
oldIds.resolve(['alpha']);
await oldRefresh;
state = render();
assert.equal(state.entries[0].id, 'beta');
assert.equal(state.isBookmarked('alpha'), false);
user = null;
state = render();
assert.equal(state.entries.length, 0);
assert.equal(state.isLoading, false);

const keys = lang => Object.keys(JSON.parse(readFileSync(new URL(`../localization/locales/${lang}/account.json`, import.meta.url), 'utf8')).saved).sort();
assert.deepEqual(keys('en'), keys('fr'));
console.log('Saved providers checks passed: missing vs failed, stale data, retry, failed/duplicate removal, refresh ordering, account isolation, and EN/FR keys.');
