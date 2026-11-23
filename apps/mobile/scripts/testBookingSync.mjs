import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function load(path, mocks) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: false },
  });
  const exports = {};
  runInNewContext(`(function(require, exports) { ${outputText}\n})`, { Error, Date, console })(
    name => mocks[name] ?? require(name), exports,
  );
  return exports;
}

// Deterministic effect scheduler: execute the real hooks, including cleanup and
// functional state updates. No native renderer or network is replaced by sleeps.
let renderer;
const sameDeps = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
const react = {
  useState(initial) {
    const owner = renderer;
    const i = owner.index++;
    if (!(i in owner.slots)) owner.slots[i] = typeof initial === 'function' ? initial() : initial;
    return [owner.slots[i], value => {
      owner.slots[i] = typeof value === 'function' ? value(owner.slots[i]) : value;
      owner.dirty = true;
    }];
  },
  useMemo(factory, deps) {
    const i = renderer.index++;
    const prior = renderer.slots[i];
    if (!prior || !sameDeps(prior.deps, deps)) renderer.slots[i] = { deps, value: factory() };
    return renderer.slots[i].value;
  },
  useCallback(callback, deps) { return react.useMemo(() => callback, deps); },
  useEffect(effect, deps) {
    const owner = renderer;
    const i = owner.index++;
    const prior = owner.slots[i];
    if (!prior || !sameDeps(prior.deps, deps)) {
      owner.effects.push(() => {
        prior?.cleanup?.();
        owner.slots[i] = { deps, cleanup: effect() };
      });
    }
  },
};
function mount(hook) {
  const owner = {
    slots: [], index: 0, effects: [], dirty: true, view: null,
    render() { renderer = owner; owner.index = 0; owner.dirty = false; owner.view = hook(); return owner.view; },
    flush() {
      for (let turn = 0; turn < 30; turn++) {
        if (owner.dirty) owner.render();
        const effects = owner.effects.splice(0);
        effects.forEach(effect => effect());
        if (!owner.dirty && owner.effects.length === 0) return owner.view;
      }
      throw new Error('Hook did not settle');
    },
    unmount() { owner.slots.forEach(slot => slot?.cleanup?.()); },
  };
  owner.flush();
  return owner;
}
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const listeners = [];
let uid = 'alice';
let requestedId = 'alice';
let cancelGate;
let throwSubscribe = false;
const created = [];
const subscribe = kind => (id, next, fail) => {
  if (throwSubscribe) throw new Error('Invalid subscription setup');
  const listener = { kind, id, next, fail, closed: false };
  listeners.push(listener);
  return () => { listener.closed = true; };
};
const repository = {
  subscribeToUserBookings: subscribe('requester'),
  subscribeToProviderBookings: subscribe('provider'),
  subscribeToBookingDetail: subscribe('detail'),
  createBookingRequestId: () => 'stable-request-id',
  createBooking: async (...args) => { created.push(args); return { id: args[3] }; },
  cancelBooking: async () => { if (cancelGate) await cancelGate.promise; },
  confirmBooking: async () => {}, declineBooking: async () => {},
};
const hooks = load('hooks/useBookings.ts', {
  react,
  '@/contexts/auth': { useAuth: () => ({ user: uid ? { uid } : null }) },
  '@/repositories/bookingRepository': repository,
  '@/localization': { default: { t: key => key } },
});

const list = mount(() => hooks.useBookings(requestedId));
assert.equal(list.view.isLoading, true);
const alice = listeners.at(-1);
alice.next([{ id: 'one', status: 'pending' }]);
assert.equal(list.flush().bookings[0].status, 'pending');
alice.next([{ id: 'one', status: 'confirmed' }]);
assert.equal(list.flush().bookings[0].status, 'confirmed');
assert.equal(list.view.createBookingRequestId(), 'stable-request-id');
await list.view.createBooking('Alice', { serviceId: 'service' }, 'stable-request-id');
assert.equal(created[0][0], 'alice');
assert.equal(created[0][3], 'stable-request-id', 'merge must preserve retry-safe creation identity');

cancelGate = deferred();
const cancellation = assert.rejects(list.view.cancelBooking('one'), /rejected/);
alice.next([{ id: 'one', status: 'in_progress' }, { id: 'other', status: 'confirmed' }]);
list.flush();
cancelGate.reject(new Error('rejected'));
await cancellation;
assert.equal(list.flush().bookings[0].status, 'in_progress');
assert.equal(list.view.bookings.length, 2, 'failed mutations cannot restore a stale whole-list snapshot');
cancelGate = undefined;

alice.fail(new Error('Network interrupted'));
assert.equal(list.flush().bookings.length, 2);
assert.ok(list.view.error);
await list.view.refreshBookings();
list.flush();
assert.equal(alice.closed, true);
assert.equal(list.view.isRefreshing, true);
const refreshed = listeners.at(-1);
refreshed.next([{ id: 'one', status: 'awaiting_confirmation' }]);
assert.equal(list.flush().isRefreshing, false);
assert.equal(list.view.bookings[0].status, 'awaiting_confirmation');
refreshed.fail(Object.assign(new Error('Permission revoked'), { name: 'FirebaseError', code: 'permission-denied' }));
assert.equal(list.flush().bookings.length, 0, 'permission errors must clear private content');

uid = requestedId = 'bob';
assert.equal(list.render().bookings.length, 0, 'another account must not flash old data before effects commit');
list.flush();
const bob = listeners.at(-1);
assert.equal(bob.id, 'bob');
refreshed.next([{ id: 'late-alice' }]);
assert.equal(list.flush().bookings.length, 0);
bob.next([{ id: 'bob-booking', status: 'pending' }]);
assert.equal(list.flush().bookings[0].id, 'bob-booking');
uid = undefined;
assert.equal(list.render().bookings.length, 0, 'logout must immediately hide bookings');
list.flush();
assert.equal(bob.closed, true);
await assert.rejects(list.view.createBooking('Bob', {}, 'request'), /signInRequired/);
list.unmount();

uid = requestedId = 'provider';
const provider = mount(() => hooks.useProviderBookings(requestedId));
listeners.at(-1).next([
  { id: 'pending', status: 'pending' }, { id: 'active', status: 'in_progress' },
  { id: 'review', status: 'awaiting_confirmation' }, { id: 'done', status: 'completed' },
]);
provider.flush();
assert.equal(provider.view.incomingRequests.length, 1);
assert.equal(provider.view.upcomingBookings.length, 2);
assert.equal(provider.view.completedBookings.length, 1);
provider.unmount();

// Test optional timeline races with the real repository, not a copied mapper.
let detailNext, detailFail, detailClosed = false;
const timelines = [];
const actualRepository = load('repositories/bookingRepository.ts', {
  '@/backend/main/src/services/bookingService': {
    subscribeToBooking: (_id, next, fail) => { detailNext = next; detailFail = fail; return () => { detailClosed = true; }; },
    getBookingStatusEvents: () => { const gate = deferred(); timelines.push(gate); return gate.promise; },
  },
});
const updates = [], failures = [];
const stop = actualRepository.subscribeToBookingDetail('booking', value => updates.push(value), error => failures.push(error));
const stamp = { toDate: () => new Date('2026-11-22T12:00:00Z') };
const document = { _id: 'booking', requesterId: 'alice', providerId: 'provider', status: 'pending', bookingDate: stamp, createdAt: stamp, updatedAt: stamp, checklist: [] };
const first = detailNext(document);
assert.equal(updates.at(-1).status, 'pending', 'status must not wait for a timeline read');
const second = detailNext({ ...document, status: 'confirmed' });
timelines[0].resolve([{ _id: 'obsolete', occurredAt: stamp }]);
await first;
assert.equal(updates.at(-1).status, 'confirmed');
timelines[1].resolve([{ _id: 'accepted', occurredAt: stamp }]);
await second;
assert.equal(updates.at(-1).statusHistory[0].id, 'accepted');
const third = detailNext({ ...document, status: 'in_progress' });
timelines[2].reject(new Error('Timeline unavailable'));
await third;
assert.equal(updates.at(-1).status, 'in_progress');
assert.equal(updates.at(-1).timelineUnavailable, true);
assert.equal(updates.at(-1).statusHistory[0].id, 'accepted');
const late = detailNext({ ...document, status: 'awaiting_confirmation' });
detailFail(new Error('Listener stopped'));
const count = updates.length;
timelines[3].resolve([{ _id: 'late', occurredAt: stamp }]);
await late;
assert.equal(updates.length, count);
assert.equal(failures.length, 1);
stop();
assert.equal(detailClosed, true);
await detailNext(null);
assert.equal(updates.length, count, 'unmounted subscription must ignore queued callbacks');

uid = requestedId = 'alice';
throwSubscribe = true;
const setupFailure = mount(() => hooks.useBookings(requestedId));
assert.match(setupFailure.view.error.message, /subscription setup/);
assert.equal(setupFailure.view.isLoading, false);
throwSubscribe = false;
await setupFailure.view.refreshBookings();
setupFailure.flush();
listeners.at(-1).next([{ id: 'recovered', status: 'pending' }]);
assert.equal(setupFailure.flush().bookings[0].id, 'recovered');
setupFailure.unmount();
console.log('Booking sync checks passed: live updates, account isolation, retries, denied access, failed mutation preservation, creation IDs, and timeline races.');
