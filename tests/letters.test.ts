import assert from 'node:assert/strict'
import { decodeLetter, encodeLetter, newDraft } from '../src/lib/letters.ts'

const old = 'A letter written before the redesign.\nWith love.'
assert.equal(decodeLetter(old).blocks[0].value, old)
assert.equal(decodeLetter('{broken json').blocks[0].value, '{broken json')
const draft = newDraft()
assert.throws(() => encodeLetter(draft), /Add a few words/)
draft.blocks[0].value = 'A little reminder ♡'
draft.blocks.push({ id: 'picture', kind: 'photo', value: 'data:image/jpeg;base64,aGVsbG8=' })
assert.deepEqual(decodeLetter(encodeLetter(draft)).blocks, draft.blocks)
assert.equal(decodeLetter('{"version":1,"font":"missing","blocks":[]}').font, 'Literary')
draft.blocks[0].value = 'a'.repeat(850_001)
assert.throws(() => encodeLetter(draft), /too heavy/)
console.log('PASS: legacy letters, rich content round-trip, empty and oversized letter validation')
