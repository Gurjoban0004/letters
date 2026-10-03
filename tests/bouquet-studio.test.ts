import assert from 'node:assert/strict'
import { BOUQUET_BINDING_POINT, arrangeBouquet, bouquetRole, bouquetStemPose, compositionFromDraft, createDraftStorage, decodeDraft, draftKey, gatheredStemBase, makeGuidedItem, moveLayer, prepareBouquetLayout, type BouquetDraftV1 } from '../src/bouquet/studioModel.ts'

const valid = new Set(['flower_rose_blush', 'flower_tulip_rose'])
const validWraps = new Set(['wrap_blush'])
const validRibbons = new Set(['ribbon_rose'])
const first = makeGuidedItem('flower_rose_blush', 0, 'one')
const second = makeGuidedItem('flower_tulip_rose', 1, 'two')
assert.equal(first.z, 0)
assert.ok(first.x >= 0 && first.x <= 1 && first.y >= 0 && first.y <= 1)
assert.deepEqual(gatheredStemBase(first), BOUQUET_BINDING_POINT)
const legacyBase = gatheredStemBase({ x: .2, y: .94 })
assert.ok(Math.abs(legacyBase.x - BOUQUET_BINDING_POINT.x) < .02)
assert.ok(Math.abs(legacyBase.y - BOUQUET_BINDING_POINT.y) < .01)
assert.deepEqual(moveLayer([first, second], 'one', 1).map(item => item.id), ['two', 'one'])
assert.equal(bouquetRole('flower_tulip_rose'), 'secondary')
assert.equal(bouquetRole('flower_rose_blush'), 'focal')
assert.equal(bouquetRole('flower_rose_crimson'), 'focal')
assert.equal(bouquetRole('flower_anemone_ivory'), 'secondary')

const mixed = [
  { ...first, id: 'fern', assetId: 'greenery_fern' },
  { ...first, id: 'filler', assetId: 'flower_babys_breath' },
  { ...second, id: 'daisy', assetId: 'flower_daisy_cream' },
  { ...first, id: 'hydrangea', assetId: 'flower_hydrangea_lilac' },
  { ...first, id: 'rose-two' },
]
const arranged = arrangeBouquet(mixed)
assert.equal(bouquetRole(arranged[0].assetId), 'foliage')
assert.equal(arranged.filter(item => bouquetRole(item.assetId) !== 'foliage').length, 4)
assert.ok(arranged.every(item => item.y >= .14 && item.y <= .54))
assert.deepEqual(arranged, arrangeBouquet(mixed), 'arrangement jitter should stay deterministic')
assert.deepEqual(arranged, arrangeBouquet(arranged), 'rebalancing should not reshuffle established flower roles')
const meadow = arrangeBouquet(mixed, 'meadow')
const tall = arrangeBouquet(mixed, 'tall')
assert.notDeepEqual(meadow.map(item => [item.x, item.y]), arranged.map(item => [item.x, item.y]), 'meadow should create a distinct silhouette')
assert.notDeepEqual(tall.map(item => [item.x, item.y]), arranged.map(item => [item.x, item.y]), 'garden should create a distinct silhouette')
assert.deepEqual(meadow, arrangeBouquet(mixed, 'meadow'), 'style layouts should stay deterministic')
assert.ok(bouquetStemPose('flower_hydrangea_lilac', .5, .3).scale < bouquetStemPose('flower_rose_blush', .5, .3).scale, 'large-headed flowers should be scaled down at the same anchor')
assert.deepEqual(prepareBouquetLayout(mixed), arranged, 'legacy stem-base positions should migrate into the role layout')
const withMoreRoses = arrangeBouquet([...arranged, ...['rose-three', 'rose-four', 'rose-five'].map(id => ({ ...first, id }))])
const expandedHydrangea = withMoreRoses.find(item => item.id === 'hydrangea')!
assert.ok(Math.abs(expandedHydrangea.x - .5) < .02, 'the largest focal flower should stay near the visual center')
assert.equal(new Set(withMoreRoses.filter(item => item.assetId === 'flower_rose_blush').map(item => `${item.x.toFixed(3)}:${item.y.toFixed(3)}`)).size, 4, 'repeated flowers should occupy separate bouquet positions')

const countLayouts = Array.from({ length: 12 }, (_, countIndex) => {
  const count = countIndex + 1
  const layout = arrangeBouquet(Array.from({ length: count }, (_, index) => ({ ...first, id: `count-${count}-${index}` })))
  assert.equal(new Set(layout.map(item => `${item.x.toFixed(3)}:${item.y.toFixed(3)}`)).size, count, `${count} flowers should each have a distinct position`)
  const center = layout.reduce((sum, item) => sum + item.x, 0) / count
  assert.ok(Math.abs(center - .5) < .025, `${count}-flower layout should remain optically centered`)
  return layout
})
const averageScale = (layout: typeof countLayouts[number]) => layout.reduce((sum, item) => sum + item.scale, 0) / layout.length
assert.ok(averageScale(countLayouts[1]) > averageScale(countLayouts[4]))
assert.ok(averageScale(countLayouts[4]) > averageScale(countLayouts[9]), 'dense bouquets should progressively reduce average bloom scale')
for (let count = 1; count <= 8; count += 1) {
  const greenery = arrangeBouquet(Array.from({ length: count }, (_, index) => ({ ...first, id: `green-${count}-${index}`, assetId: 'greenery_eucalyptus' })))
  assert.equal(new Set(greenery.map(item => `${item.x.toFixed(3)}:${item.y.toFixed(3)}`)).size, count, `${count} greenery stems should each have a perimeter position`)
  assert.ok(greenery.every(item => bouquetRole(item.assetId) === 'foliage'))
}

const now = Date.now()
const draft: BouquetDraftV1 = {
  version: 1, id: 'current', ownerId: 'alice', pairingId: 'pair', title: '', progress: 2,
  activeTool: 'flowers', studioMode: 'compose', status: 'draft', createdAt: now, updatedAt: now,
  clientPublicationId: null, items: [first, second], wrapId: null, ribbonId: null,
  bouquetStyle: 'classic',
  note: { to: '', body: '', from: '' },
}
const values = new Map<string, string>()
const memoryStorage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
const storage = createDraftStorage(memoryStorage, valid, validWraps, validRibbons)
storage.save(draft)
assert.equal(storage.load('alice')?.items.length, 2)
assert.equal(storage.load('bob'), null)
assert.ok(values.has(draftKey('alice')))

const third = makeGuidedItem('flower_rose_blush', 2, 'three')
const decorated = { ...draft, items: [first, second, third], progress: 5 as const, studioMode: 'review' as const, wrapId: 'wrap_blush', ribbonId: 'ribbon_rose', clientPublicationId: 'publication_123456', note: { to: 'You', body: 'A little garden.', from: 'Me' } }
storage.save(decorated)
assert.equal(storage.load('alice')?.studioMode, 'review')
assert.equal(storage.load('alice')?.wrapId, 'wrap_blush')
assert.equal(storage.load('alice')?.note.body, 'A little garden.')
assert.equal(storage.load('alice')?.clientPublicationId, 'publication_123456')
assert.equal(compositionFromDraft(decorated).items.length, 3)
assert.equal(compositionFromDraft({ ...decorated, ribbonId: null }).ribbonId, null, 'ribbons are optional at delivery')
assert.equal(compositionFromDraft({ ...decorated, bouquetStyle: 'meadow' }).bouquetStyle, 'meadow')
const copied = storage.duplicate('alice', 'current', 'copy-one')
assert.equal(copied?.title, 'Bouquet copy')
assert.equal(storage.list('alice').length, 2)
storage.rename('alice', 'copy-one', 'Second garden')
assert.equal(storage.load('alice', 'copy-one')?.title, 'Second garden')
storage.remove('alice', 'copy-one')
assert.equal(storage.list('alice').length, 1)

const invalidDecor = { ...decorated, wrapId: 'wrap_missing', ribbonId: 'ribbon_missing' }
assert.equal(decodeDraft(invalidDecor, 'alice', valid, validWraps, validRibbons)?.wrapId, null)
assert.equal(decodeDraft(invalidDecor, 'alice', valid, validWraps, validRibbons)?.ribbonId, null)
assert.equal(decodeDraft({ ...decorated, note: { to: '', body: '', from: '' } }, 'alice', valid, validWraps, validRibbons)?.studioMode, 'message')
assert.equal(decodeDraft({ ...decorated, bouquetStyle: undefined }, 'alice', valid, validWraps, validRibbons)?.bouquetStyle, 'classic')

const malformed = { ...draft, items: [first, { ...second, id: 'one' }, { ...second, id: 'bad', assetId: 'missing' }] }
assert.deepEqual(decodeDraft(malformed, 'alice', valid)?.items.map(item => item.id), ['one'])
assert.equal(decodeDraft(draft, 'bob', valid), null)

console.log('PASS: bouquet guided placement, layers, decoding, and owner-partitioned draft storage')
