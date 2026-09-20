export type LetterBlock = { id: string; kind: 'text' | 'photo' | 'doodle' | 'voice'; value: string; align?: 'left' | 'center' | 'right'; frame?: 'polaroid' | 'stamp' | 'deckled' }
export type LetterContent = { version: 1; font: string; decoration: string; greeting?: string; envelope?: string; blocks: LetterBlock[] }
export type Draft = LetterContent & { id: string; title: string; paper: string; envelope: string; updated: number; unlockAt: string }
export const fonts: Record<string, string> = {
  Handwritten: "'Caveat', cursive",
  Literary: "'Newsreader', Georgia, serif",
  Classic: "'Instrument Serif', Georgia, serif",
}
export interface Paper {
  id: string
  name: string
  badge: string
  mood: 'Floral' | 'Classic' | 'Playful' | 'Quiet'
  url: string
  aspect: string
  padding: string
}
export interface Envelope {
  id: string
  name: string
  badge: string
  closedUrl: string
  openFrontUrl: string
  openBackUrl: string
  openFullUrl: string
  closedAspect: string
  openAspect: string
  defaultScale: number
}

export const stationery: Paper[] = [
  { id: 'paper_1', name: 'Deckled Botanical', badge: 'Pressed Florals', mood: 'Floral', url: '/stationery/paper_1_botanical/paper_1.webp', aspect: '1332 / 1398', padding: '12% 16% 18% 14%' },
  { id: 'paper_2', name: 'Sparkle Bow', badge: 'Sparkle Bow', mood: 'Playful', url: '/stationery/paper_2_sparkle_bow/paper_2.webp', aspect: '1557 / 1417', padding: '14% 14% 18% 14%' },
  { id: 'paper_3', name: 'Floral Border', badge: 'Botanical Border', mood: 'Floral', url: '/stationery/paper_3_floral_border/paper_3.webp', aspect: '1353 / 1396', padding: '16% 18% 16% 18%' },
  { id: 'paper_4', name: 'Lavender Lined', badge: 'Lavender Lines', mood: 'Quiet', url: '/stationery/paper_4_lavender_lined/paper_4.webp', aspect: '1397 / 1422', padding: '12% 14% 22% 14%' },
  { id: 'paper_5', name: 'Cherry Blossom', badge: 'Cherry Blossoms', mood: 'Classic', url: '/stationery/paper_5_cherry_blossom/paper_5.webp', aspect: '1560 / 1438', padding: '16% 18% 16% 18%' },
]
export const envelopes: Envelope[] = [
  { id: 'env_1', name: 'Rose Silk Ribbon & Bow', badge: 'Silk Bow', closedUrl: '/stationery/env_1_rose_silk/env_1_closed.webp', openFrontUrl: '/stationery/env_1_rose_silk/env_1_open_front.webp', openBackUrl: '/stationery/env_1_rose_silk/env_1_open_back_clean.webp', openFullUrl: '/stationery/env_1_rose_silk/env_1_open_full.webp', closedAspect: '1197 / 1008', openAspect: '1060 / 1170', defaultScale: 0.775 },
  { id: 'env_2', name: 'Ceramic Floral Brooch', badge: 'Ceramic Brooch', closedUrl: '/stationery/env_2_ceramic_flower/env_2_closed.webp', openFrontUrl: '/stationery/env_2_ceramic_flower/env_2_open_front.webp', openBackUrl: '/stationery/env_2_ceramic_flower/env_2_open_back.webp', openFullUrl: '/stationery/env_2_ceramic_flower/env_2_open_full.webp', closedAspect: '1166 / 872', openAspect: '1136 / 1218', defaultScale: 0.76 },
  { id: 'env_3', name: 'Pressed Botanical Stamp', badge: 'Vintage Postage', closedUrl: '/stationery/env_3_botanical_stamp/env_3_closed.webp', openFrontUrl: '/stationery/env_3_botanical_stamp/env_3_open_front.webp', openBackUrl: '/stationery/env_3_botanical_stamp/env_3_open_back.webp', openFullUrl: '/stationery/env_3_botanical_stamp/env_3_open_full.webp', closedAspect: '1293 / 1169', openAspect: '1238 / 1364', defaultScale: 0.75 },
  { id: 'env_4', name: 'Pink Floral Heart', badge: 'Heart Seal', closedUrl: '/stationery/env_4_pink_heart/env_4_closed.webp', openFrontUrl: '/stationery/env_4_pink_heart/env_4_open_front.webp', openBackUrl: '/stationery/env_4_pink_heart/env_4_open_back_clean.webp', openFullUrl: '/stationery/env_4_pink_heart/env_4_open_full.webp', closedAspect: '1704 / 1375', openAspect: '1369 / 1479', defaultScale: 0.76 },
  { id: 'env_5', name: 'Lavender Floral Cosmos', badge: 'Lavender Blooms', closedUrl: '/stationery/env_5_lavender_floral/env_5_closed.webp', openFrontUrl: '/stationery/env_5_lavender_floral/env_5_open_front.webp', openBackUrl: '/stationery/env_5_lavender_floral/env_5_open_back_clean.webp', openFullUrl: '/stationery/env_5_lavender_floral/env_5_open_full.webp', closedAspect: '2277 / 1788', openAspect: '1291 / 1402', defaultScale: 0.77 },
]
export const papers = stationery.map((paper) => paper.id)
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
export function getStationery(id: string) {
  return stationery.find((paper) => paper.id === (legacyPapers[id] ?? id)) ?? stationery[0]
}
export function getEnvelope(id?: string) {
  return envelopes.find((envelope) => envelope.id === (id ? legacyEnvelopes[id] ?? id : id)) ?? envelopes[0]
}
export function newDraft(): Draft {
  return { id: crypto.randomUUID(), version: 1, title: '', paper: papers[0], envelope: envelopes[0].id, font: 'Handwritten', decoration: '', blocks: [{ id: crypto.randomUUID(), kind: 'text', value: '' }], updated: Date.now(), unlockAt: '' }
}
export function decodeLetter(body: string): LetterContent {
  try {
    const parsed = JSON.parse(body)
    if (parsed.version === 1 && Array.isArray(parsed.blocks)) return { version: 1, font: fonts[parsed.font] ? parsed.font : 'Literary', decoration: typeof parsed.decoration === 'string' ? parsed.decoration : '', ...(typeof parsed.greeting === 'string' ? { greeting: parsed.greeting } : {}), ...(typeof parsed.envelope === 'string' ? { envelope: parsed.envelope } : {}), blocks: parsed.blocks.filter((b: LetterBlock) => b && ['text', 'photo', 'doodle', 'voice'].includes(b.kind) && typeof b.value === 'string') }
  } catch { /* Letters sent before the redesign contain plain text. */ }
  return { version: 1, font: 'Literary', decoration: '', blocks: [{ id: 'body', kind: 'text', value: body }] }
}
export function encodeLetter(draft: Draft) {
  const body = JSON.stringify({ version: 1, font: draft.font, decoration: draft.decoration, envelope: draft.envelope, ...(draft.greeting ? { greeting: draft.greeting } : {}), blocks: draft.blocks })
  if (new Blob([body]).size > 850_000) throw new Error('This letter is a little too heavy. Remove a photo or shorten the voice note before sending.')
  if (!draft.blocks.some(b => b.value.trim())) throw new Error('Add a few words or a little something before sealing your letter.')
  return body
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
    request.onsuccess = () => resolve(request.result ?? [])
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
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.76)
}
