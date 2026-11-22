import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function loadSource(relativePath, dependencies = {}) {
  const compiled = ts.transpileModule(readFileSync(new URL(relativePath, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInNewContext(`(function(require, exports) { ${compiled}\n})`, { console: { log() {}, error() {} } })(name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  }, exports);
  return exports;
}

export const lifecycle = loadSource('../utils/bookingLifecycle.ts');
export const statuses = ['pending', 'confirmed', 'in_progress', 'awaiting_confirmation', 'completed', 'cancelled'];
const allowed = new Set([
  'requester:pending:cancelled', 'requester:confirmed:cancelled',
  'requester:awaiting_confirmation:completed', 'requester:awaiting_confirmation:in_progress',
  'provider:pending:confirmed', 'provider:pending:cancelled',
  'provider:confirmed:in_progress', 'provider:in_progress:awaiting_confirmation',
]);

for (const role of ['requester', 'provider', 'outsider', '']) {
  for (const from of statuses) for (const to of statuses) {
    assert.equal(lifecycle.canTransitionBooking(from, to, role), allowed.has(`${role}:${from}:${to}`));
  }
}
for (const invalid of ['unknown', '__proto__', 'constructor', '', 'Pending']) {
  assert.equal(lifecycle.canTransitionBooking(invalid, 'confirmed', 'provider'), false);
  assert.equal(lifecycle.canTransitionBooking('pending', invalid, 'provider'), false);
}
assert.throws(() => lifecycle.requireBookingTransition({ status: 'pending', requesterId: 'same', providerId: 'same' }, 'same', 'confirmed'));
assert.throws(() => lifecycle.requireBookingTransition({ status: 'pending', requesterId: 'r', providerId: 'p' }, '', 'confirmed'));

// Exercise the actual transaction service, not a reimplementation of it.
const auth = { currentUser: { uid: 'r' } };
let booking;
let writes = [];
const firestore = {
  collection: (...segments) => ({ segments }),
  doc: (...segments) => ({ segments, id: 'new-event-id' }),
  serverTimestamp: () => 'SERVER_TIME',
  runTransaction: async (_db, operation) => operation({
    get: async () => ({ exists: () => Boolean(booking), id: 'booking-id', data: () => booking }),
    update: (ref, data) => writes.push({ kind: 'update', ref, data }),
    set: (ref, data) => writes.push({ kind: 'set', ref, data }),
  }),
};
const service = loadSource('../backend/main/src/services/bookingService.ts', {
  'firebase/firestore': firestore,
  '../config/firebase': { auth, db: {}, COLLECTIONS: { BOOKINGS: 'bookings' } },
  '@/types/booking': {},
  '@/utils/bookingValidation': {},
  '@/utils/bookingLifecycle': lifecycle,
});
for (const role of ['requester', 'provider', 'outsider']) {
  auth.currentUser = { uid: role === 'requester' ? 'r' : role === 'provider' ? 'p' : 'o' };
  for (const from of statuses) for (const to of statuses) {
    booking = { status: from, requesterId: 'r', providerId: 'p' };
    writes = [];
    const operation = service.updateBookingStatus('booking-id', to, { changeRequest: 'Finish the remaining work' });
    if (allowed.has(`${role}:${from}:${to}`)) {
      await operation;
      assert.equal(writes.length, 2);
      assert.equal(writes[0].data.status, to);
      assert.equal(writes[0].data.latestTransitionId, 'new-event-id');
      assert.equal(writes[1].data.actorRole, role);
      assert.equal(writes[1].data.actorId, auth.currentUser.uid);
      assert.equal(writes[1].data.fromStatus, from);
      assert.equal(writes[1].data.toStatus, to);
    } else {
      await assert.rejects(operation);
      assert.equal(writes.length, 0, 'invalid transitions must not even stage a write');
    }
  }
}
booking = null;
await assert.rejects(service.updateBookingStatus('missing', 'confirmed'));
auth.currentUser = null;
await assert.rejects(service.updateBookingStatus('booking-id', 'confirmed'));
console.log('Booking lifecycle checks passed: complete role/status matrix, malformed identities/statuses, actual transaction writes, audit linkage, missing records, and signed-out actions.');
