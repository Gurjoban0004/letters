import assert from 'node:assert/strict'
import { resolvePushStatus } from '../src/lib/push-state.ts'
import { firstName, letterPushTitle } from '../src/lib/names.ts'

const ready = {
  configured: true,
  supported: true,
  ios: true,
  installed: true,
  permission: 'granted' as const,
  token: 'token',
  owner: 'user-a',
  uid: 'user-a',
}

assert.equal(resolvePushStatus(ready), 'ready')
assert.equal(resolvePushStatus({ ...ready, configured: false }), 'misconfigured')
assert.equal(resolvePushStatus({ ...ready, installed: false }), 'needs-install')
assert.equal(resolvePushStatus({ ...ready, permission: 'denied' }), 'blocked')
assert.equal(resolvePushStatus({ ...ready, token: null }), 'needs-permission')
assert.equal(resolvePushStatus({ ...ready, owner: 'user-b' }), 'needs-permission')
assert.equal(firstName('Hannah Louise'), 'Hannah')
assert.equal(firstName('  Hannah   Louise  '), 'Hannah')
assert.equal(letterPushTitle('Hannah Louise'), 'Hannah wrote to you')
assert.ok(letterPushTitle('Alexandria').length <= 20)

console.log('PASS: push configuration, installation, permission, token, and account ownership states')
