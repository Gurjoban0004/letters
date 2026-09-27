import assert from 'node:assert/strict'
import {
  decodeLetter, encodeLetter, gestureDelta, getStationery, migrateV1, newDraft, paginateText, redoDraft, reflowPages, undoDraft, upgradeDraft,
  type LetterContentV1, type LetterItem, type LetterPage,
} from '../src/lib/letters.ts'

const oldPlain = 'A letter written before the redesign.\nWith love.'
const plain = decodeLetter(oldPlain)
assert.equal(plain.version, 1)
assert.equal(plain.version === 1 ? plain.blocks[0].value : '', oldPlain)
assert.equal((decodeLetter('{broken json') as LetterContentV1).blocks[0].value, '{broken json')

const legacy: LetterContentV1 = {
  version: 1, font: 'Handwritten', decoration: 'bow', greeting: 'Dearest you,',
  blocks: [
    { id: 'text-a', kind: 'text', value: 'First thought', x: 70, y: 70, size: 20 },
    { id: 'text-b', kind: 'text', value: 'Second thought', x: 2, y: 2, size: 90 },
    { id: 'photo', kind: 'photo', value: 'data:image/jpeg;base64,aGVsbG8=', x: 17, y: 44, size: 31, frame: 'stamp' },
  ],
  placedDetails: [{ id: 'petal', name: 'petal', x: 60, y: 20, size: 18 }],
}
const migrated = migrateV1(legacy)
assert.equal(migrated.version, 2)
assert.equal(migrated.style, 'handwritten')
assert.equal(migrated.pages[0].text, 'First thought\n\nSecond thought')
assert.deepEqual(migrated.pages[0].items.map(item => item.kind), ['photo', 'detail', 'detail'])
assert.equal(migrated.pages[0].items[0].x, 17)
assert.ok(migrated.pages[0].items.every(item => item.kind !== 'text'), 'legacy prose coordinates are discarded')

const draft = newDraft()
assert.equal(draft.version, 2)
assert.throws(() => encodeLetter(draft), /Add a few words/)
draft.title = 'A little reminder'
draft.greeting = 'Dear you,'
draft.style = 'literary'
draft.pages[0].text = 'A little reminder ♡'
const keepsake: LetterItem = { id: 'picture', kind: 'photo', value: 'data:image/jpeg;base64,aGVsbG8=', frame: 'polaroid', x: 12, y: 54, width: 32, rotation: -2, z: 1 }
draft.pages[0].items.push(keepsake)
const roundTrip = decodeLetter(encodeLetter(draft))
assert.equal(roundTrip.version, 2)
assert.deepEqual(roundTrip, { version: 2, style: draft.style, greeting: draft.greeting, envelope: draft.envelope, pages: draft.pages })
const dreamyRoundTrip = decodeLetter(JSON.stringify({ ...roundTrip, style: 'dreamy' }))
const classicRoundTrip = decodeLetter(JSON.stringify({ ...roundTrip, style: 'classic' }))
assert.equal(dreamyRoundTrip.version === 2 ? dreamyRoundTrip.style : '', 'dreamy')
assert.equal(classicRoundTrip.version === 2 ? classicRoundTrip.style : '', 'classic')

const profile = getStationery('paper_1').profile
const largePaste = Array.from({ length: 900 }, (_, index) => `word${index}`).join(' ')
const pastedPages = paginateText(largePaste, profile)
assert.ok(pastedPages.length >= 5, 'large pastes create continuation sheets')
assert.equal(pastedPages.join(''), largePaste, 'pagination never changes the letter')
assert.ok(pastedPages.slice(0, -1).every(page => /\s$/u.test(page)), 'page breaks prefer whitespace')

const longWord = 'supercalifragilistic'.repeat(300)
const wordPages = paginateText(longWord, profile)
assert.equal(wordPages.join(''), longWord)
assert.ok(wordPages.length > 1, 'long unbroken words still paginate')

const emoji = 'Family 👨‍👩‍👧‍👦, hearts 💞, flags 🇮🇳 and flowers 🌸. '.repeat(150)
const emojiPages = paginateText(emoji, profile)
assert.equal(emojiPages.join(''), emoji)
assert.ok(emojiPages.every(page => !/[\uD800-\uDBFF]$/u.test(page) && !/^[\uDC00-\uDFFF]/u.test(page)), 'surrogate pairs remain intact')

const multilingual = 'नमस्ते दुनिया। こんにちは世界。 مرحباً بالعالم. สวัสดีชาวโลก 🌏 '.repeat(180)
assert.equal(paginateText(multilingual, profile).join(''), multilingual)

const fivePages: LetterPage[] = pastedPages.slice(0, 5).map((text, index) => ({ id: `page-${index}`, text, items: [] }))
const shortened = reflowPages([{ ...fivePages[0], text: fivePages[0].text.slice(0, 90) }, ...fivePages.slice(1)], profile)
assert.equal(shortened.map(page => page.text).join(''), fivePages[0].text.slice(0, 90) + fivePages.slice(1).map(page => page.text).join(''))
const merged = reflowPages([{ id: 'one', text: 'A short first page. ', items: [] }, { id: 'two', text: 'Text from page two is pulled back.', items: [] }], profile)
assert.equal(merged.length, 1, 'deletion pulls text backward and removes empty trailing sheets')
const withTrailingKeepsake = reflowPages([...shortened, { id: 'keepsake-page', text: '', items: [keepsake] }], profile)
assert.equal(withTrailingKeepsake.at(-1)?.items[0].id, keepsake.id, 'an otherwise empty keepsake sheet is retained')

const restored = upgradeDraft(JSON.parse(JSON.stringify(draft)))
assert.deepEqual(restored.pages, draft.pages, 'autosaved V2 drafts restore exactly')
const restoredLegacy = upgradeDraft({ ...legacy, id: 'legacy-draft', title: 'Old draft', paper: 'Lilac', updated: 1, unlockAt: '' })
assert.equal(restoredLegacy.version, 2)
assert.equal(restoredLegacy.paper, 'paper_4')

const editA = structuredClone(draft); editA.pages[0].text = 'First edit'
const editB = structuredClone(editA); editB.paper = 'paper_4'; editB.style = 'paper'
const undone = undoDraft(editB, [draft, editA], [])
assert.equal(undone.current.pages[0].text, 'First edit')
const redone = redoDraft(undone.current, undone.past, undone.future)
assert.equal(redone.current.paper, 'paper_4')
assert.equal(redone.current.style, 'paper')

const paperChanged = reflowPages(draft.pages, getStationery('paper_4').profile)
assert.equal(paperChanged.map(page => page.text).join(''), draft.pages.map(page => page.text).join(''), 'paper changes preserve prose')

const pinched = gestureDelta({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 10, y: 20 }, { x: 10, y: 220 })
assert.equal(pinched.scale, 2, 'two-finger spread scales a keepsake')
assert.equal(Math.round(pinched.rotation), 90, 'two-finger twist rotates a keepsake')
assert.deepEqual({ x: pinched.x, y: pinched.y }, { x: -40, y: 120 }, 'two-finger movement tracks the gesture center')

const oversized = newDraft(); oversized.pages[0].text = 'a'.repeat(850_001)
assert.throws(() => encodeLetter(oversized), /too heavy/)

console.log('PASS: V1 decode/migration, V2 round-trip, reflow, Unicode pagination, restoration, history, paper/type changes, and size validation')
