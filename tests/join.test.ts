import assert from 'node:assert/strict'
import { JoinFailure, planJoin } from '../server/join-logic.ts'

const waiting = (uid: string) => ({ members: [uid], status: 'waiting' })

assert.deepEqual(planJoin({
  uid: 'guest', inviteId: 'target', currentPairingId: '', target: waiting('host'), current: null,
}), { members: ['host', 'guest'], cancelCurrent: false, alreadyJoined: false })

assert.deepEqual(planJoin({
  uid: 'guest', inviteId: 'target', currentPairingId: 'old', target: waiting('host'), current: waiting('guest'),
}), { members: ['host', 'guest'], cancelCurrent: true, alreadyJoined: false })

assert.deepEqual(planJoin({
  uid: 'guest', inviteId: 'target', currentPairingId: 'target', target: { members: ['host', 'guest'], status: 'active' }, current: null,
}), { members: ['host', 'guest'], cancelCurrent: false, alreadyJoined: true })

assert.throws(() => planJoin({
  uid: 'guest', inviteId: 'target', currentPairingId: 'old', target: waiting('host'), current: { members: ['guest', 'other'], status: 'active' },
}), (error) => error instanceof JoinFailure && error.code === 'invite-already-paired')

assert.throws(() => planJoin({
  uid: 'guest', inviteId: 'target', currentPairingId: '', target: { members: ['host', 'other'], status: 'active' }, current: null,
}), (error) => error instanceof JoinFailure && error.code === 'invite-full')

assert.throws(() => planJoin({
  uid: 'host', inviteId: 'target', currentPairingId: '', target: waiting('host'), current: null,
}), (error) => error instanceof JoinFailure && error.code === 'invite-is-yours')

console.log('PASS: pairing join planning, replacement, idempotency, conflict, full, and self-invite states')
