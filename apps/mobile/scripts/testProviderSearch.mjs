import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function loadTypeScript(url, overrides = {}) {
  const source = readFileSync(url, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  runInNewContext(`(function(require, exports) { ${compiled}\n})`)(name => {
    if (name in overrides) return overrides[name];
    if (name.endsWith('.json')) return JSON.parse(readFileSync(new URL(name, url), 'utf8'));
    if (name.startsWith('.')) return loadTypeScript(new URL(`${name}.ts`, url));
    return require(name);
  }, exports);
  return exports;
}

const { filterProviders, getStartingPrice } = loadTypeScript(new URL('../utils/providerSearch.ts', import.meta.url));
const { DEFAULT_FILTERS, FILTER_RANGES } = loadTypeScript(new URL('../types/filters.ts', import.meta.url));
assert.equal(DEFAULT_FILTERS.maxPrice, FILTER_RANGES.price.maximumValue);
assert.equal(DEFAULT_FILTERS.radius, FILTER_RANGES.radius.maximumValue);
const fixture = (id, changes = {}) => ({
  id, name: id, profession: 'tech', categoryName: 'tech', rating: 4.5,
  remoteService: false, bio: 'Repairs', location: { latitude: 12.37, longitude: -1.52 },
  locationDetails: { city: 'Ouagadougou', country: 'Burkina Faso' },
  services: [{ name: 'Computer repair', description: 'Hardware', price: '10000' }],
  pricing: 'Contact for pricing', ...changes,
});
const nearby = fixture('nearby');
const mixed = fixture('mixed', { services: [{ name: 'A', price: '5000' }, { name: 'B', price: '500000' }] });
const unknown = fixture('unknown', { location: { latitude: 0, longitude: 0 }, services: [{ price: 'unknown' }] });
const remote = fixture('remote', { remoteService: true, location: { latitude: 48.85, longitude: 2.35 } });
const all = [nearby, mixed, unknown, remote];
const ids = values => Array.from(values, value => value.id).sort();
assert.equal(getStartingPrice(mixed), 5000);
assert.equal(getStartingPrice(unknown), undefined);
assert.equal(getStartingPrice(fixture('malformed', { services: [{ price: null }, { price: {} }] })), undefined);
assert.equal(getStartingPrice(fixture('invalid', { services: [{ price: '-1' }, { price: '1e3' }, { price: 'Infinity' }] })), undefined);
assert.deepEqual(ids(filterProviders(all, { maxPrice: 5000 })), ['mixed']);
assert.deepEqual(ids(filterProviders(all, { maxPrice: 0 })), []);
assert.deepEqual(ids(filterProviders(all, {})), ['mixed', 'nearby', 'remote', 'unknown']);
assert.deepEqual(ids(filterProviders(all, { maxDistance: 20, userLocation: nearby.location })), ['mixed', 'nearby']);
assert.deepEqual(ids(filterProviders(all, { maxDistance: 20 })), []);
assert.deepEqual(ids(filterProviders(all, { remoteOnly: true, maxDistance: 1, userLocation: nearby.location })), ['remote']);
assert.deepEqual(ids(filterProviders(all, { maxPrice: 6000, minRating: 4, city: 'ouaga', category: 'tech' })), ['mixed']);
assert.deepEqual(ids(filterProviders(all, { minRating: 5 })), []);
assert.deepEqual(ids(filterProviders(all, { category: 'home' })), []);
assert.deepEqual(ids(filterProviders(all, { excludeId: 'nearby' })), ['mixed', 'remote', 'unknown']);
assert.deepEqual(ids(filterProviders(all, { query: 'technologie' })), ids(all));
assert.deepEqual(ids(filterProviders(all, { query: 'technology' })), ids(all));
assert.deepEqual(ids(filterProviders(all, { query: 'computer hardware' })), ['nearby', 'remote']);
assert.deepEqual(ids(filterProviders([fixture('accent', { locationDetails: { city: 'Montréal' } })], { city: 'montreal' })), ['accent']);
const boundary = fixture('boundary', { location: { latitude: 12.46, longitude: -1.52 } });
const actualDistance = filterProviders([boundary], { userLocation: nearby.location })[0].distance;
assert.equal(filterProviders([boundary], { userLocation: nearby.location, maxDistance: actualDistance - 0.001 }).length, 0);
assert.equal(filterProviders([boundary], { userLocation: nearby.location, maxDistance: actualDistance }).length, 1);

// Exercise the actual hook with a tiny deterministic lifecycle harness: no
// native Firebase imports or writes, and delayed requests remain controllable.
let user;
let slots = [];
let cursor = 0;
let pendingEffects = [];
const requests = [];
const sameDeps = (a, b) => a && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
const react = {
  useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
    return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
  },
  useEffect(effect, deps) {
    const index = cursor++;
    const previous = slots[index];
    if (sameDeps(previous?.deps, deps)) return;
    pendingEffects.push(() => {
      previous?.cleanup?.();
      slots[index] = { deps, cleanup: effect() };
    });
  },
  useMemo(fn) { cursor++; return fn(); },
  useCallback(fn) { cursor++; return fn; },
};
const { useProviderSearch: runSearchHook } = loadTypeScript(new URL('../hooks/useProviderSearch.ts', import.meta.url), {
  react,
  '@/contexts/auth': { useAuth: () => ({ user }) },
  '@/utils/providerSearch': { filterProviders },
  '@/repositories/providerRepository': { getAllProvidersWithDetails: () => new Promise((resolve, reject) => requests.push({ resolve, reject })) },
});
function render(filters = {}, commit = true) {
  cursor = 0;
  const result = runSearchHook(filters);
  if (commit) { const effects = pendingEffects; pendingEffects = []; effects.forEach(effect => effect()); }
  return result;
}
render();
assert.equal(requests.length, 1);
requests[0].resolve(all);
await Promise.resolve();
assert.equal(render({ maxPrice: 5000 }).providers.length, 1);
render({ minRating: 5 });
assert.equal(requests.length, 1, 'filter changes must not refetch the catalogue');
user = { uid: 'requester-a' };
assert.equal(render().providers.length, 0, 'old identity results must disappear before effects');
assert.equal(requests.length, 2);
user = { uid: 'requester-b' };
render();
requests[1].resolve([nearby]);
await Promise.resolve();
assert.equal(render().providers.length, 0, 'late old-identity response must be ignored');
requests[2].resolve([remote]);
await Promise.resolve();
assert.deepEqual(ids(render().providers), ['remote']);
await render().retry();
render();
assert.equal(requests.length, 4);
requests[3].reject(new Error('network unavailable'));
await Promise.resolve();
await Promise.resolve();
assert.deepEqual(ids(render().providers), ['remote'], 'same-identity retry failure retains results');
assert.ok(render().error);
await render().retry();
render();
requests[4].resolve([mixed]);
await Promise.resolve();
assert.deepEqual(ids(render().providers), ['mixed']);
assert.equal(render().error, null);
slots.forEach(slot => slot?.cleanup?.());

for (const language of ['en', 'fr']) {
  const resource = JSON.parse(readFileSync(new URL(`../localization/locales/${language}/explore.json`, import.meta.url), 'utf8'));
  assert.ok(resource.search.priceHint && resource.search.cityHint);
}
const en = JSON.parse(readFileSync(new URL('../localization/locales/en/explore.json', import.meta.url), 'utf8'));
const fr = JSON.parse(readFileSync(new URL('../localization/locales/fr/explore.json', import.meta.url), 'utf8'));
assert.deepEqual(Object.keys(en.search).sort(), Object.keys(fr.search).sort());
console.log('Provider search checks passed: budget, distance boundaries, remote, city, EN/FR categories, combined filters, identity races, caching, and retry.');
