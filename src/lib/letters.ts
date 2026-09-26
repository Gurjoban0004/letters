export type LetterStyle = 'paper' | 'literary' | 'handwritten'

export type LetterBlock = {
  id: string
  kind: 'text' | 'photo' | 'doodle' | 'voice'
  value: string
  align?: 'left' | 'center' | 'right'
  frame?: 'polaroid' | 'stamp' | 'deckled'
  x?: number
  y?: number
  size?: number
  rotation?: number
}

export type PlacedDetail = { id: string; name: string; x: number; y: number; size: number; rotation?: number; float?: 'left' | 'right' }
export type LetterContentV1 = { version: 1; font: string; decoration: string; greeting?: string; envelope?: string; blocks: LetterBlock[]; placedDetails?: PlacedDetail[] }
export type LetterItem = { id: string; kind: 'photo' | 'doodle' | 'voice' | 'detail'; value: string; frame?: 'polaroid' | 'stamp' | 'deckled'; x: number; y: number; width: number; rotation: number; z: number }
export type LetterPage = { id: string; text: string; items: LetterItem[] }
export type LetterContentV2 = { version: 2; style: LetterStyle; greeting: string; envelope: string; pages: LetterPage[] }
export type LetterContent = LetterContentV1 | LetterContentV2
export type Draft = LetterContentV2 & { id: string; title: string; paper: string; updated: number; unlockAt: string }

export type PaperProfile = {
  safe: { top: number; right: number; bottom: number; left: number }
  capacity: { first: number; continuation: number; charsPerLine: number; lines: number }
  ink: string
  defaultStyle: Exclude<LetterStyle, 'paper'>
  fontSize: number
  lineHeight: number
  paragraphSpacing: number
  printedBaseline?: { offset: number; step: number }
}

export const fonts: Record<LetterStyle, string> = {
  paper: "var(--paper-font, 'Newsreader', Georgia, serif)",
  literary: "'Newsreader', Georgia, serif",
  handwritten: "'Caveat', 'Segoe Print', cursive",
}

export interface Paper { id: string; name: string; badge: string; mood: 'Floral' | 'Classic' | 'Playful' | 'Quiet'; url: string; aspect: string; profile: PaperProfile }
export interface Envelope { id: string; name: string; badge: string; closedUrl: string; openFrontUrl: string; openBackUrl: string; openFullUrl: string; closedAspect: string; openAspect: string; defaultScale: number }

const literaryProfile: PaperProfile = {
  safe: { top: 13, right: 14, bottom: 12, left: 14 },
  capacity: { first: 560, continuation: 800, charsPerLine: 42, lines: 22 },
  ink: '#4a3439', defaultStyle: 'literary', fontSize: 21, lineHeight: 1.58, paragraphSpacing: 0.72,
}

export const stationery: Paper[] = [
  { id: 'paper_1', name: 'Deckled Botanical', badge: 'Pressed Florals', mood: 'Floral', url: '/stationery/paper_1_botanical/paper_1_portrait.webp', aspect: '3 / 4', profile: { ...literaryProfile, safe: { top: 13, right: 16, bottom: 38, left: 15 }, capacity: { first: 350, continuation: 480, charsPerLine: 42, lines: 13 } } },
  { id: 'paper_2', name: 'Sparkle Bow', badge: 'Sparkle Bow', mood: 'Playful', url: '/stationery/paper_2_sparkle_bow/paper_2_portrait.webp', aspect: '3 / 4', profile: { ...literaryProfile, safe: { top: 14, right: 15, bottom: 15, left: 15 }, capacity: { first: 520, continuation: 760, charsPerLine: 39, lines: 20 }, ink: '#583843', defaultStyle: 'handwritten', fontSize: 24, lineHeight: 1.48 } },
  { id: 'paper_3', name: 'Floral Border', badge: 'Botanical Border', mood: 'Floral', url: '/stationery/paper_3_floral_border/paper_3_portrait.webp', aspect: '3 / 4', profile: { ...literaryProfile, safe: { top: 14, right: 18, bottom: 15, left: 18 }, capacity: { first: 520, continuation: 740, charsPerLine: 39, lines: 21 } } },
  { id: 'paper_4', name: 'Lavender Lined', badge: 'Lavender Lines', mood: 'Quiet', url: '/stationery/paper_4_lavender_lined/paper_4_portrait.webp', aspect: '3 / 4', profile: { ...literaryProfile, safe: { top: 8.1, right: 14, bottom: 38, left: 14 }, capacity: { first: 190, continuation: 340, charsPerLine: 38, lines: 9 }, ink: '#49364f', defaultStyle: 'handwritten', fontSize: 25, lineHeight: 1.92, paragraphSpacing: 0, printedBaseline: { offset: 8.1, step: 5.86 } } },
  { id: 'paper_5', name: 'Cherry Blossom', badge: 'Cherry Blossoms', mood: 'Classic', url: '/stationery/paper_5_cherry_blossom/paper_5_portrait.webp', aspect: '3 / 4', profile: { ...literaryProfile, safe: { top: 15, right: 17, bottom: 29, left: 17 }, capacity: { first: 420, continuation: 560, charsPerLine: 40, lines: 15 } } },
]

export const envelopes: Envelope[] = [
  { id: 'env_1', name: 'Rose Silk Ribbon & Bow', badge: 'Silk Bow', closedUrl: '/stationery/env_1_rose_silk/env_1_closed.webp', openFrontUrl: '/stationery/env_1_rose_silk/env_1_open_front.webp', openBackUrl: '/stationery/env_1_rose_silk/env_1_open_back_clean.webp', openFullUrl: '/stationery/env_1_rose_silk/env_1_open_full.webp', closedAspect: '1197 / 1008', openAspect: '1060 / 1170', defaultScale: 0.775 },
  { id: 'env_2', name: 'Ceramic Floral Brooch', badge: 'Ceramic Brooch', closedUrl: '/stationery/env_2_ceramic_flower/env_2_closed.webp', openFrontUrl: '/stationery/env_2_ceramic_flower/env_2_open_front.webp', openBackUrl: '/stationery/env_2_ceramic_flower/env_2_open_back.webp', openFullUrl: '/stationery/env_2_ceramic_flower/env_2_open_full.webp', closedAspect: '1166 / 872', openAspect: '1136 / 1218', defaultScale: 0.76 },
  { id: 'env_3', name: 'Pressed Botanical Stamp', badge: 'Vintage Postage', closedUrl: '/stationery/env_3_botanical_stamp/env_3_closed.webp', openFrontUrl: '/stationery/env_3_botanical_stamp/env_3_open_front.webp', openBackUrl: '/stationery/env_3_botanical_stamp/env_3_open_back.webp', openFullUrl: '/stationery/env_3_botanical_stamp/env_3_open_full.webp', closedAspect: '1293 / 1169', openAspect: '1238 / 1364', defaultScale: 0.75 },
  { id: 'env_4', name: 'Pink Floral Heart', badge: 'Heart Seal', closedUrl: '/stationery/env_4_pink_heart/env_4_closed.webp', openFrontUrl: '/stationery/env_4_pink_heart/env_4_open_front.webp', openBackUrl: '/stationery/env_4_pink_heart/env_4_open_back_clean.webp', openFullUrl: '/stationery/env_4_pink_heart/env_4_open_full.webp', closedAspect: '1704 / 1375', openAspect: '1369 / 1479', defaultScale: 0.76 },
  { id: 'env_5', name: 'Lavender Floral Cosmos', badge: 'Lavender Blooms', closedUrl: '/stationery/env_5_lavender_floral/env_5_closed.webp', openFrontUrl: '/stationery/env_5_lavender_floral/env_5_open_front.webp', openBackUrl: '/stationery/env_5_lavender_floral/env_5_open_back_clean.webp', openFullUrl: '/stationery/env_5_lavender_floral/env_5_open_full.webp', closedAspect: '2277 / 1788', openAspect: '1291 / 1402', defaultScale: 0.77 },
]

export const papers = stationery.map(paper => paper.id)
const legacyPapers: Record<string, string> = {
  'Rose garden': 'paper_1', Blush: 'paper_2', Milk: 'paper_3', Lilac: 'paper_4', Botanical: 'paper_5',
  'blushing-bloom': 'paper_1', 'rose-lines': 'paper_2', 'pressed-petals': 'paper_3', 'pink-grid': 'paper_2', 'garden-border': 'paper_3',
  'lavender-note': 'paper_4', 'cozy-cat': 'paper_2', 'blue-post': 'paper_4', 'meadow-grid': 'paper_1', 'heart-lines': 'paper_2',
  'fallen-petals': 'paper_1', 'ribbon-frame': 'paper_3', 'little-daisies': 'paper_5', 'moon-letter': 'paper_4', 'rose-portrait': 'paper_5',
}
const legacyEnvelopes: Record<string, string> = {
  'pink-post': 'env_1', 'rose-seal': 'env_2', 'peony-fold': 'env_4', 'forget-me-not': 'env_5', 'pressed-rose': 'env_3',
  'heart-window': 'env_4', 'little-bow': 'env_1', 'wildflower-mail': 'env_5', 'berry-wax': 'env_3', 'lace-post': 'env_2',
  'tulip-letter': 'env_5', 'ribbon-mail': 'env_1',
}

export function getStationery(value: string) { return stationery.find(paper => paper.id === (legacyPapers[value] ?? value)) ?? stationery[0] }
export function getEnvelope(value?: string) { return envelopes.find(envelope => envelope.id === (value ? legacyEnvelopes[value] ?? value : value)) ?? envelopes[0] }
function id() { return crypto.randomUUID() }
function finite(value: unknown, fallback: number) { return typeof value === 'number' && Number.isFinite(value) ? value : fallback }
function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)) }

export type GesturePoint = { x: number; y: number }
export function gestureDelta(startA: GesturePoint, startB: GesturePoint, currentA: GesturePoint, currentB: GesturePoint) {
  const distance = (a: GesturePoint, b: GesturePoint) => Math.hypot(b.x - a.x, b.y - a.y)
  const angle = (a: GesturePoint, b: GesturePoint) => Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI
  const startDistance = Math.max(1, distance(startA, startB))
  let rotation = angle(currentA, currentB) - angle(startA, startB)
  if (rotation > 180) rotation -= 360
  if (rotation < -180) rotation += 360
  return {
    scale: distance(currentA, currentB) / startDistance,
    rotation,
    x: (currentA.x + currentB.x - startA.x - startB.x) / 2,
    y: (currentA.y + currentB.y - startA.y - startB.y) / 2,
  }
}

export function newDraft(): Draft {
  return { id: id(), version: 2, title: '', paper: papers[0], envelope: envelopes[0].id, style: 'paper', greeting: '', pages: [{ id: id(), text: '', items: [] }], updated: Date.now(), unlockAt: '' }
}

function sanitizeItem(value: unknown, index: number): LetterItem | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Partial<LetterItem>
  if (!['photo', 'doodle', 'voice', 'detail'].includes(String(item.kind)) || typeof item.value !== 'string') return null
  const frame = ['polaroid', 'stamp', 'deckled'].includes(String(item.frame)) ? item.frame : undefined
  return { id: typeof item.id === 'string' ? item.id : id(), kind: item.kind as LetterItem['kind'], value: item.value, ...(frame ? { frame } : {}), x: clamp(finite(item.x, 10), 0, 92), y: clamp(finite(item.y, 28), 0, 92), width: clamp(finite(item.width, 28), 8, 90), rotation: clamp(finite(item.rotation, 0), -180, 180), z: finite(item.z, index + 1) }
}

function sanitizeV2(value: Record<string, unknown>): LetterContentV2 | null {
  if (value.version !== 2 || !Array.isArray(value.pages)) return null
  const pages = value.pages.map(raw => {
    const page = raw && typeof raw === 'object' ? raw as Partial<LetterPage> : {}
    return { id: typeof page.id === 'string' ? page.id : id(), text: typeof page.text === 'string' ? page.text : '', items: Array.isArray(page.items) ? page.items.map(sanitizeItem).filter((item): item is LetterItem => Boolean(item)) : [] }
  })
  const style = ['paper', 'literary', 'handwritten'].includes(String(value.style)) ? value.style as LetterStyle : 'paper'
  return { version: 2, style, greeting: typeof value.greeting === 'string' ? value.greeting : '', envelope: typeof value.envelope === 'string' ? value.envelope : envelopes[0].id, pages: pages.length ? pages : [{ id: id(), text: '', items: [] }] }
}

function sanitizeV1(value: Record<string, unknown>): LetterContentV1 | null {
  if (value.version !== 1 || !Array.isArray(value.blocks)) return null
  const blocks = value.blocks.filter((raw): raw is LetterBlock => {
    if (!raw || typeof raw !== 'object') return false
    const block = raw as Partial<LetterBlock>
    return typeof block.id === 'string' && ['text', 'photo', 'doodle', 'voice'].includes(String(block.kind)) && typeof block.value === 'string'
  })
  const placedDetails = Array.isArray(value.placedDetails) ? value.placedDetails.filter((raw): raw is PlacedDetail => {
    if (!raw || typeof raw !== 'object') return false
    const detail = raw as Partial<PlacedDetail>
    return typeof detail.id === 'string' && typeof detail.name === 'string' && Number.isFinite(detail.x) && Number.isFinite(detail.y) && Number.isFinite(detail.size)
  }) : []
  return { version: 1, font: typeof value.font === 'string' ? value.font : 'Literary', decoration: typeof value.decoration === 'string' ? value.decoration : '', ...(typeof value.greeting === 'string' ? { greeting: value.greeting } : {}), ...(typeof value.envelope === 'string' ? { envelope: value.envelope } : {}), blocks, placedDetails }
}

function legacyPlain(body: string): LetterContentV1 { return { version: 1, font: 'Literary', decoration: '', blocks: [{ id: 'body', kind: 'text', value: body }] } }

export function decodeLetter(body: string): LetterContent {
  try {
    const parsed = JSON.parse(body)
    if (parsed && typeof parsed === 'object') return sanitizeV2(parsed) ?? sanitizeV1(parsed) ?? legacyPlain(body)
  } catch { /* Letters sent before versioning contain plain text. */ }
  return legacyPlain(body)
}

function legacyStyle(font: string): LetterStyle { return /hand|caveat|script|satisfy/i.test(font) ? 'handwritten' : /literary|newsreader/i.test(font) ? 'literary' : 'paper' }

export function migrateV1(content: LetterContentV1): LetterContentV2 {
  const items: LetterItem[] = []
  content.blocks.filter(block => block.kind !== 'text').forEach((block, index) => {
    items.push({ id: block.id || id(), kind: block.kind as LetterItem['kind'], value: block.value, ...(block.frame ? { frame: block.frame } : {}), x: clamp(finite(block.x, 10 + (index % 2) * 42), 0, 92), y: clamp(finite(block.y, 34 + index * 11), 0, 92), width: clamp(finite(block.size, block.kind === 'voice' ? 52 : 38), 8, 90), rotation: finite(block.rotation, 0), z: items.length + 1 })
  })
  for (const detail of content.placedDetails ?? []) items.push({ id: detail.id || id(), kind: 'detail', value: detail.name, x: clamp(detail.x, 0, 92), y: clamp(detail.y, 0, 92), width: clamp(detail.size, 8, 90), rotation: detail.rotation ?? 0, z: items.length + 1 })
  if (content.decoration) items.push({ id: id(), kind: 'detail', value: content.decoration, x: 62, y: 76, width: 24, rotation: 0, z: items.length + 1 })
  return { version: 2, style: legacyStyle(content.font), greeting: content.greeting ?? '', envelope: content.envelope ?? envelopes[0].id, pages: [{ id: id(), text: content.blocks.filter(block => block.kind === 'text').map(block => block.value).join('\n\n'), items }] }
}

export function upgradeDraft(value: unknown): Draft {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const content = sanitizeV2(raw) ?? migrateV1(sanitizeV1(raw) ?? legacyPlain(''))
  return { ...content, id: typeof raw.id === 'string' ? raw.id : id(), title: typeof raw.title === 'string' ? raw.title : '', paper: getStationery(typeof raw.paper === 'string' ? raw.paper : '').id, envelope: getEnvelope(typeof raw.envelope === 'string' ? raw.envelope : content.envelope).id, updated: finite(raw.updated, Date.now()), unlockAt: typeof raw.unlockAt === 'string' ? raw.unlockAt : '' }
}

export function draftPreview(draft: Draft) { return draft.pages.map(page => page.text).join(' ').trim().slice(0, 100) }

export function encodeLetter(draft: Draft) {
  const body = JSON.stringify({ version: 2, style: draft.style, greeting: draft.greeting, envelope: draft.envelope, pages: draft.pages } satisfies LetterContentV2)
  if (new Blob([body]).size > 850_000) throw new Error('This letter is a little too heavy. Remove a photo or shorten the voice note before sending.')
  if (!draft.pages.some(page => page.text.trim() || page.items.length)) throw new Error('Add a few words or a little something before sealing your letter.')
  return body
}

function graphemeEnds(text: string) {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    return Array.from(segmenter.segment(text), segment => segment.index + segment.segment.length)
  }
  const ends: number[] = []
  let offset = 0
  for (const character of Array.from(text)) { offset += character.length; ends.push(offset) }
  return ends
}

function pageBreak(text: string, capacity: number) {
  const ends = graphemeEnds(text)
  if (ends.length <= capacity) return text.length
  const hard = ends[capacity - 1]
  const floor = ends[Math.floor(capacity * .68)] ?? 0
  for (let index = hard; index >= floor; index--) if (/\s/u.test(text[index - 1] ?? '')) return index
  return hard
}

export function paginateText(text: string, profile: PaperProfile) {
  const pages: string[] = []
  let remaining = text
  while (remaining.length) {
    const capacity = pages.length === 0 ? profile.capacity.first : profile.capacity.continuation
    const at = pageBreak(remaining, capacity)
    pages.push(remaining.slice(0, at))
    remaining = remaining.slice(at)
  }
  return pages.length ? pages : ['']
}

export function reflowPages(pages: LetterPage[], profile: PaperProfile) {
  const chunks = paginateText(pages.map(page => page.text).join(''), profile)
  const requiredForItems = pages.reduce((last, page, index) => page.items.length ? index + 1 : last, 0)
  const length = Math.max(chunks.length, requiredForItems, 1)
  return Array.from({ length }, (_, index) => ({ id: pages[index]?.id ?? id(), text: chunks[index] ?? '', items: pages[index]?.items ?? [] }))
}

export type DraftHistory = { current: Draft; past: Draft[]; future: Draft[] }
export function undoDraft(current: Draft, past: Draft[], future: Draft[]): DraftHistory {
  const previous = past.at(-1)
  return previous ? { current: previous, past: past.slice(0, -1), future: [...future, current] } : { current, past, future }
}
export function redoDraft(current: Draft, past: Draft[], future: Draft[]): DraftHistory {
  const next = future.at(-1)
  return next ? { current: next, past: [...past, current], future: future.slice(0, -1) } : { current, past, future }
}

// Native IndexedDB keeps multimedia drafts off localStorage's small quota.
function draftDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('letters-drafts', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('drafts')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function loadDrafts(owner: string): Promise<Draft[]> {
  const db = await draftDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('drafts', 'readonly')
    const request = tx.objectStore('drafts').get(owner)
    request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result.map(upgradeDraft) : [])
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

export async function saveDrafts(owner: string, drafts: Draft[]) {
  const db = await draftDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('drafts', 'readwrite')
    tx.objectStore('drafts').put(drafts, owner)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
    tx.onabort = () => reject(tx.error)
  })
}

export function fileData(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('This file could not be read. Please try again.'))
    reader.readAsDataURL(file)
  })
}

export async function photoData(file: File): Promise<string> {
  if (!file.type.startsWith('image/') || file.size > 20_000_000) throw new Error('Choose an image smaller than 20 MB.')
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height))
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.76)
}
