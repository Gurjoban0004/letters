export type BouquetTool = 'flowers' | 'greenery' | 'decor' | 'wrapping'
export type BouquetStudioMode = 'compose' | 'message' | 'review'
export type BouquetStyle = 'classic' | 'meadow' | 'tall'
export type BouquetNoteV1 = { to: string; body: string; from: string }

export type BouquetItemV1 = {
  id: string
  assetId: string
  x: number
  y: number
  scale: number
  rotation: number
  flipX: boolean
  z: number
}

export type BouquetDraftV1 = {
  version: 1
  id: string
  ownerId: string
  pairingId: string
  title: string
  progress: 1 | 2 | 3 | 4 | 5
  activeTool: BouquetTool
  studioMode: BouquetStudioMode
  status: 'draft'
  createdAt: number
  updatedAt: number
  clientPublicationId: string | null
  items: BouquetItemV1[]
  wrapId: string | null
  ribbonId: string | null
  bouquetStyle: BouquetStyle
  note: BouquetNoteV1
}

export type BouquetCompositionV1 = {
  version: 1
  items: BouquetItemV1[]
  wrapId: string
  ribbonId: string | null
  bouquetStyle: BouquetStyle
  note: BouquetNoteV1
}

export type PublishedBouquetV1 = {
  version: 1
  id: string
  pairingId: string
  senderId: string
  recipientId: string
  title: string
  itemCount: number
  createdAt: unknown
  receivedAt: unknown | null
  viewedAt: unknown | null
  composition: BouquetCompositionV1
}

export type BouquetDraftSummary = { id: string; title: string; updatedAt: number; itemCount: number }

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'> & Partial<Pick<Storage, 'removeItem'>>

export const BOUQUET_BINDING_POINT = { x: .5, y: .76 } as const

export type BouquetRole = 'foliage' | 'filler' | 'secondary' | 'focal'

type ArrangementAnchor = { x: number; y: number; layer: number }

const FLOWER_ROW_PATTERNS: Record<number, readonly number[]> = {
  1: [1], 2: [2], 3: [1, 2], 4: [2, 2], 5: [2, 3], 6: [3, 3],
  7: [2, 3, 2], 8: [3, 3, 2], 9: [3, 3, 3], 10: [3, 4, 3],
  11: [3, 4, 4], 12: [4, 4, 4],
}

const ASSET_PRIORITY: Record<string, number> = {
  flower_hydrangea_lilac: 0,
  flower_hydrangea_blue: 0,
  flower_peony_pink: 1,
  flower_peony_coral: 1,
  flower_rose_blush: 2,
  flower_rose_ivory: 2,
  flower_rose_crimson: 2,
  flower_dahlia_rose: 3,
  flower_lily_blush: 4,
  flower_sunflower_butter: 5,
}
const ASSET_VISUAL_WEIGHT: Record<string, number> = {
  flower_hydrangea_lilac: 1.35,
  flower_hydrangea_blue: 1.35,
  flower_sunflower_butter: 1.25,
  flower_peony_pink: 1.15,
  flower_peony_coral: 1.15,
  flower_dahlia_rose: 1.08,
  flower_rose_blush: 1,
  flower_rose_ivory: 1,
  flower_rose_crimson: 1,
  flower_lily_blush: .9,
  flower_tulip_rose: .84,
  flower_tulip_lavender: .84,
  flower_anemone_ivory: .78,
  flower_daisy_cream: .78,
  flower_ranunculus_peach: .76,
  flower_cosmos_pink: .72,
  flower_lavender: .58,
  flower_babys_breath: .54,
}
const ROLE_SCALE: Record<BouquetRole, { factor: number; min: number; max: number }> = {
  foliage: { factor: .94, min: .54, max: .77 },
  filler: { factor: .76, min: .38, max: .53 },
  secondary: { factor: .86, min: .48, max: .64 },
  focal: { factor: 1, min: .58, max: .76 },
}

function assetScaleFactor(assetId: string) {
  if (assetId.includes('hydrangea')) return .84
  if (assetId.includes('sunflower')) return .9
  if (assetId.includes('lily')) return .92
  if (assetId.includes('peony') || assetId.startsWith('flower_rose_')) return .92
  return 1
}

function visualWeight(assetId: string) {
  return ASSET_VISUAL_WEIGHT[assetId] ?? .8
}

function flowerDensityScale(count: number) {
  if (count <= 2) return 1
  if (count <= 3) return .95
  if (count <= 5) return .91
  if (count <= 7) return .86
  if (count <= 10) return .8
  if (count <= 14) return .73
  if (count <= 20) return .66
  return .6
}

function flowerRowPattern(count: number) {
  const preset = FLOWER_ROW_PATTERNS[count]
  if (preset) return [...preset]
  const columns = count <= 20 ? 4 : 5
  const rows = Math.ceil(count / columns)
  const pattern = Array.from({ length: rows }, () => Math.floor(count / rows))
  let remainder = count - pattern.reduce((sum, value) => sum + value, 0)
  const centeredRows = pattern.map((_, index) => index).sort((a, b) => Math.abs(a - (rows - 1) / 2) - Math.abs(b - (rows - 1) / 2))
  for (const row of centeredRows) {
    if (!remainder) break
    pattern[row] += 1
    remainder -= 1
  }
  return pattern
}

function flowerAnchors(count: number): ArrangementAnchor[] {
  if (count <= 0) return []
  if (count === 1) return [{ x: .5, y: .34, layer: 0 }]
  const rows = flowerRowPattern(count)
  const top = rows.length === 2 ? .25 : .18
  const bottom = rows.length === 2 ? .45 : .5
  return rows.flatMap((rowCount, row) => {
    const progress = rows.length === 1 ? .5 : row / (rows.length - 1)
    const span = rows.length === 1 ? .32 : .28 + progress * .38
    const y = top + (bottom - top) * progress
    return Array.from({ length: rowCount }, (_, column) => ({
      x: rowCount === 1 ? .5 : .5 - span / 2 + span * column / (rowCount - 1),
      y: y + (column % 2 ? .008 : -.004),
      layer: row,
    }))
  })
}

function foliageAnchors(count: number): ArrangementAnchor[] {
  if (count <= 0) return []
  if (count === 1) return [{ x: .5, y: .15, layer: 0 }]
  return Array.from({ length: count }, (_, index) => {
    const progress = index / (count - 1)
    const x = .17 + progress * .66
    return { x, y: .15 + Math.abs(x - .5) * .48, layer: 0 }
  })
}

function spreadAnchors(anchors: ArrangementAnchor[]) {
  const remaining = [...anchors]
  const spread: ArrangementAnchor[] = []
  while (remaining.length) {
    const nextIndex = spread.length === 0
      ? remaining.reduce((best, anchor, index) => Math.hypot(anchor.x - .5, (anchor.y - .34) * .8) < Math.hypot(remaining[best].x - .5, (remaining[best].y - .34) * .8) ? index : best, 0)
      : remaining.reduce((best, anchor, index) => {
        const distance = Math.min(...spread.map(chosen => Math.hypot((anchor.x - chosen.x) * 1.18, anchor.y - chosen.y)))
        const bestDistance = Math.min(...spread.map(chosen => Math.hypot((remaining[best].x - chosen.x) * 1.18, remaining[best].y - chosen.y)))
        return distance > bestDistance ? index : best
      }, 0)
    spread.push(remaining.splice(nextIndex, 1)[0])
  }
  return spread
}

const GUIDED_SLOTS = [
  { rotation: 0, scale: .72 },
  { rotation: -12, scale: .66 },
  { rotation: 12, scale: .66 },
  { rotation: -23, scale: .6 },
  { rotation: 23, scale: .6 },
  { rotation: -7, scale: .62 },
  { rotation: 7, scale: .62 },
  { rotation: -31, scale: .54 },
  { rotation: 31, scale: .54 },
  { rotation: 2, scale: .58 },
  { rotation: -18, scale: .56 },
  { rotation: 18, scale: .56 },
] as const

export const MAX_BOUQUET_ITEMS = 30
export const NOTE_LIMITS = { to: 60, body: 500, from: 60 } as const
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function gatheredStemBase(_item: Pick<BouquetItemV1, 'x' | 'y'>) {
  return BOUQUET_BINDING_POINT
}

export function bouquetRole(assetId: string): BouquetRole {
  if (assetId.startsWith('greenery_')) return 'foliage'
  if (assetId.includes('babys_breath') || assetId.includes('lavender')) return 'filler'
  if (assetId.startsWith('flower_rose_') || assetId.startsWith('flower_peony_') || ['flower_sunflower_butter', 'flower_lily_blush', 'flower_dahlia_rose', 'flower_hydrangea_lilac', 'flower_hydrangea_blue'].includes(assetId)) return 'focal'
  return 'secondary'
}

function seededUnit(value: string, salt: number) {
  let hash = 2166136261 ^ salt
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return ((hash >>> 0) % 10_000) / 10_000
}

export function bouquetStemPose(assetId: string, x: number, y: number) {
  const role = bouquetRole(assetId)
  const dx = x - BOUQUET_BINDING_POINT.x
  const dy = Math.max(.08, BOUQUET_BINDING_POINT.y - y)
  const radialScale = Math.hypot(dx, dy) / .72
  const sizing = ROLE_SCALE[role]
  const assetFactor = assetScaleFactor(assetId)
  return {
    rotation: clamp(Math.atan2(dx, dy) * 180 / Math.PI, -38, 38),
    scale: clamp(radialScale * sizing.factor * assetFactor, sizing.min * assetFactor, sizing.max * assetFactor),
  }
}

function styledAnchor(anchor: ArrangementAnchor, style: BouquetStyle, id: string, foliage: boolean) {
  if (style === 'classic') return anchor
  const drift = (seededUnit(id, 83) - .5) * (foliage ? .035 : .025)
  if (style === 'meadow') return {
    ...anchor,
    x: clamp(.5 + (anchor.x - .5) * 1.13 + drift, .12, .88),
    y: clamp(anchor.y + (seededUnit(id, 97) - .5) * .045 + (anchor.x > .54 ? .018 : 0), .11, .56),
  }
  return {
    ...anchor,
    x: clamp(.5 + (anchor.x - .5) * .72 + drift * .45, .2, .8),
    y: clamp(.12 + (anchor.y - .15) * .9 - (foliage ? .025 : 0), .09, .52),
  }
}

export function arrangeBouquet(items: BouquetItemV1[], style: BouquetStyle = 'classic') {
  const ranked: Array<{ item: BouquetItemV1; rank: number }> = []
  const foliage = items.filter(item => bouquetRole(item.assetId) === 'foliage').sort((a, b) => a.assetId.localeCompare(b.assetId) || a.id.localeCompare(b.id))
  const flowers = items.filter(item => bouquetRole(item.assetId) !== 'foliage').sort((a, b) => visualWeight(b.assetId) - visualWeight(a.assetId) || (ASSET_PRIORITY[a.assetId] ?? 50) - (ASSET_PRIORITY[b.assetId] ?? 50) || a.assetId.localeCompare(b.assetId) || a.id.localeCompare(b.id))
  const foliageScale = flowers.length > 10 || foliage.length > 5 ? .84 : flowers.length > 6 ? .91 : 1
  const greenAnchors = foliageAnchors(foliage.length)
  foliage.forEach((item, index) => {
    const anchor = styledAnchor(greenAnchors[index], style, item.id, true)
    const x = clamp(anchor.x + (seededUnit(item.id, 11) - .5) * .01, .14, .86)
    const y = clamp(anchor.y + (seededUnit(item.id, 29) - .5) * .008, .12, .42)
    const pose = bouquetStemPose(item.assetId, x, y)
    ranked.push({ item: { ...item, x, y, rotation: clamp(pose.rotation + (seededUnit(item.id, 47) - .5) * 3, -42, 42), scale: clamp(pose.scale * foliageScale, .42, .77) }, rank: index })
  })
  const density = flowerDensityScale(flowers.length)
  const availableAnchors = spreadAnchors(flowerAnchors(flowers.length))
  flowers.forEach((item, index) => {
    const role = bouquetRole(item.assetId)
    const anchor = styledAnchor(availableAnchors[index], style, item.id, false)
    const x = clamp(anchor.x + (seededUnit(item.id, 11) - .5) * .008, .14, .86)
    const y = clamp(anchor.y + (seededUnit(item.id, 29) - .5) * .008, .14, .54)
    const pose = bouquetStemPose(item.assetId, x, y)
    const sizing = ROLE_SCALE[role]
    const assetFactor = assetScaleFactor(item.assetId)
    const scale = clamp(pose.scale * density + (seededUnit(item.id, 71) - .5) * .012, .35, Math.max(.35, sizing.max * assetFactor * density))
    const frontness = (2 - visualWeight(item.assetId)) * 10
    ranked.push({ item: { ...item, x, y, rotation: clamp(pose.rotation + (seededUnit(item.id, 47) - .5) * 3, -42, 42), scale }, rank: 100 + anchor.layer * 100 + frontness + index / 100 })
  })
  return ranked.sort((a, b) => a.rank - b.rank).map(({ item }, z) => ({ ...item, z }))
}

export function prepareBouquetLayout(items: BouquetItemV1[], style: BouquetStyle = 'classic') {
  return items.some(item => item.y > .62) ? arrangeBouquet(items, style) : normalizeLayers(items)
}

export function makeGuidedItem(assetId: string, count: number, id: string): BouquetItemV1 {
  const slot = GUIDED_SLOTS[count % GUIDED_SLOTS.length]
  const round = Math.floor(count / GUIDED_SLOTS.length)
  return {
    id,
    assetId,
    x: clamp(BOUQUET_BINDING_POINT.x + (round % 2 ? .012 : -.012) * round, .47, .53),
    y: clamp(BOUQUET_BINDING_POINT.y + (round % 2 ? .006 : -.006) * round, .74, .78),
    scale: clamp(slot.scale - round * .015, .35, 2.5),
    rotation: slot.rotation + (round % 2 ? 4 : -4) * round,
    flipX: false,
    z: count,
  }
}

export function normalizeLayers(items: BouquetItemV1[]) {
  return [...items].sort((a, b) => a.z - b.z).map((item, z) => ({ ...item, z }))
}

export function moveLayer(items: BouquetItemV1[], id: string, direction: -1 | 1) {
  const ordered = normalizeLayers(items)
  const index = ordered.findIndex(item => item.id === id)
  const nextIndex = clamp(index + direction, 0, ordered.length - 1)
  if (index < 0 || index === nextIndex) return ordered
  const [item] = ordered.splice(index, 1)
  ordered.splice(nextIndex, 0, item)
  return ordered.map((value, z) => ({ ...value, z }))
}

export function draftKey(ownerId: string, draftId = 'current') {
  return `letters:bouquets:v1:${ownerId}:${draftId}`
}

export function draftIndexKey(ownerId: string) {
  return `letters:bouquets:index:v1:${ownerId}`
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function decodeItem(value: unknown, validAssetIds: ReadonlySet<string>, seen: Set<string>): BouquetItemV1 | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Partial<BouquetItemV1>
  if (typeof item.id !== 'string' || seen.has(item.id) || typeof item.assetId !== 'string' || !validAssetIds.has(item.assetId)) return null
  if (![item.x, item.y, item.scale, item.rotation, item.z].every(isFiniteNumber)) return null
  if (item.x! < 0 || item.x! > 1 || item.y! < 0 || item.y! > 1 || item.scale! < .35 || item.scale! > 2.5 || item.rotation! < -180 || item.rotation! > 180 || !Number.isInteger(item.z)) return null
  seen.add(item.id)
  return { id: item.id, assetId: item.assetId, x: item.x!, y: item.y!, scale: item.scale!, rotation: item.rotation!, flipX: item.flipX === true, z: item.z! }
}

export function decodeDraft(value: unknown, ownerId: string, validAssetIds: ReadonlySet<string>, validWrapIds?: ReadonlySet<string>, validRibbonIds?: ReadonlySet<string>): BouquetDraftV1 | null {
  if (!value || typeof value !== 'object') return null
  const draft = value as Partial<BouquetDraftV1>
  if (draft.version !== 1 || draft.ownerId !== ownerId || !Array.isArray(draft.items)) return null
  const seen = new Set<string>()
  const items = normalizeLayers(draft.items.slice(0, MAX_BOUQUET_ITEMS).map(item => decodeItem(item, validAssetIds, seen)).filter((item): item is BouquetItemV1 => Boolean(item)))
  const progress = [1, 2, 3, 4, 5].includes(draft.progress ?? 0) ? draft.progress as BouquetDraftV1['progress'] : 1
  const activeTool = ['flowers', 'greenery', 'decor', 'wrapping'].includes(draft.activeTool ?? '') ? draft.activeTool as BouquetTool : 'flowers'
  const bouquetStyle = ['classic', 'meadow', 'tall'].includes(draft.bouquetStyle ?? '') ? draft.bouquetStyle as BouquetStyle : 'classic'
  const note = {
    to: typeof draft.note?.to === 'string' ? draft.note.to.slice(0, NOTE_LIMITS.to) : '',
    body: typeof draft.note?.body === 'string' ? draft.note.body.slice(0, NOTE_LIMITS.body) : '',
    from: typeof draft.note?.from === 'string' ? draft.note.from.slice(0, NOTE_LIMITS.from) : '',
  }
  const requestedMode = ['compose', 'message', 'review'].includes(draft.studioMode ?? '') ? draft.studioMode as BouquetStudioMode : 'compose'
  const studioMode = requestedMode === 'review' && (!note.to.trim() || !note.body.trim() || !note.from.trim()) ? 'message' : requestedMode
  const validChoice = (value: unknown, validIds?: ReadonlySet<string>) => typeof value === 'string' && (!validIds || validIds.has(value)) ? value : null
  return {
    version: 1,
    id: typeof draft.id === 'string' && draft.id ? draft.id : 'current',
    ownerId,
    pairingId: typeof draft.pairingId === 'string' ? draft.pairingId : '',
    title: typeof draft.title === 'string' ? draft.title.slice(0, 80) : '',
    progress,
    activeTool,
    studioMode,
    status: 'draft',
    createdAt: isFiniteNumber(draft.createdAt) ? draft.createdAt : Date.now(),
    updatedAt: isFiniteNumber(draft.updatedAt) ? draft.updatedAt : Date.now(),
    clientPublicationId: typeof draft.clientPublicationId === 'string' && /^[A-Za-z0-9_-]{16,80}$/.test(draft.clientPublicationId) ? draft.clientPublicationId : null,
    items,
    wrapId: validChoice(draft.wrapId, validWrapIds),
    ribbonId: validChoice(draft.ribbonId, validRibbonIds),
    bouquetStyle,
    note,
  }
}

export function compositionFromDraft(draft: BouquetDraftV1): BouquetCompositionV1 {
  if (draft.items.length < 3 || draft.items.length > MAX_BOUQUET_ITEMS) throw new Error('Add at least three flowers before sending.')
  if (!draft.wrapId) throw new Error('Choose wrapping before sending.')
  const note = { to: draft.note.to.trim(), body: draft.note.body.trim(), from: draft.note.from.trim() }
  if (!note.to || !note.body || !note.from) throw new Error('Finish the note before sending.')
  const composition = { version: 1 as const, items: normalizeLayers(draft.items), wrapId: draft.wrapId, ribbonId: draft.ribbonId, bouquetStyle: draft.bouquetStyle ?? 'classic', note }
  if (JSON.stringify(composition).length > 128_000) throw new Error('This bouquet is too large to send.')
  return composition
}

export function createDraftStorage(storage: KeyValueStorage, validAssetIds: ReadonlySet<string>, validWrapIds?: ReadonlySet<string>, validRibbonIds?: ReadonlySet<string>) {
  const loadIndex = (ownerId: string): BouquetDraftSummary[] => {
    try {
      const value = JSON.parse(storage.getItem(draftIndexKey(ownerId)) ?? '[]') as unknown
      if (!Array.isArray(value)) return []
      return value.filter((item): item is BouquetDraftSummary => Boolean(item && typeof item === 'object' && typeof (item as BouquetDraftSummary).id === 'string'))
    } catch { return [] }
  }
  const saveIndex = (ownerId: string, value: BouquetDraftSummary[]) => storage.setItem(draftIndexKey(ownerId), JSON.stringify(value.slice(0, 30)))
  return {
    load(ownerId: string, draftId = 'current') {
      try {
        const raw = storage.getItem(draftKey(ownerId, draftId))
        return raw ? decodeDraft(JSON.parse(raw) as unknown, ownerId, validAssetIds, validWrapIds, validRibbonIds) : null
      } catch {
        return null
      }
    },
    save(draft: BouquetDraftV1) {
      const updatedAt = Date.now()
      storage.setItem(draftKey(draft.ownerId, draft.id), JSON.stringify({ ...draft, updatedAt }))
      const summary = { id: draft.id, title: draft.title, updatedAt, itemCount: draft.items.length }
      saveIndex(draft.ownerId, [summary, ...loadIndex(draft.ownerId).filter(item => item.id !== draft.id)])
    },
    list(ownerId: string) {
      const indexed = loadIndex(ownerId).map(summary => this.load(ownerId, summary.id)).filter((draft): draft is BouquetDraftV1 => Boolean(draft))
      const current = indexed.some(draft => draft.id === 'current') ? null : this.load(ownerId, 'current')
      return current ? [current, ...indexed] : indexed
    },
    remove(ownerId: string, draftId: string) {
      if (storage.removeItem) storage.removeItem(draftKey(ownerId, draftId))
      else storage.setItem(draftKey(ownerId, draftId), '')
      saveIndex(ownerId, loadIndex(ownerId).filter(item => item.id !== draftId))
    },
    rename(ownerId: string, draftId: string, title: string) {
      const draft = this.load(ownerId, draftId)
      if (!draft) return null
      const renamed = { ...draft, title: title.trim().slice(0, 80) }
      this.save(renamed)
      return renamed
    },
    duplicate(ownerId: string, draftId: string, nextId: string) {
      const draft = this.load(ownerId, draftId)
      if (!draft) return null
      const now = Date.now()
      const copy = { ...draft, id: nextId, title: `${draft.title || 'Bouquet'} copy`.slice(0, 80), status: 'draft' as const, studioMode: 'compose' as const, progress: 3 as const, createdAt: now, updatedAt: now, clientPublicationId: null }
      this.save(copy)
      return copy
    },
  }
}
