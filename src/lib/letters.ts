export type LetterBlock = { id: string; kind: 'text' | 'photo' | 'doodle' | 'voice'; value: string; align?: 'left' | 'center' | 'right' }
export type LetterContent = { version: 1; font: string; decoration: string; greeting?: string; envelope?: string; blocks: LetterBlock[] }
export type Draft = LetterContent & { id: string; title: string; paper: string; envelope: string; updated: number; unlockAt: string }
export const fonts: Record<string, string> = { Handwritten: "'Caveat', cursive", Literary: "'Newsreader', Georgia, serif", Classic: 'Georgia, serif', Simple: 'system-ui, sans-serif' }
export type Stationery = {
  id: string
  name: string
  mood: 'Floral' | 'Classic' | 'Playful' | 'Quiet'
  desktop: [number, number]
  mobile: [number, number]
  tint: string
}
export type Envelope = {
  id: string
  name: string
  mood: 'Botanical' | 'Romantic' | 'Vintage' | 'Playful'
  source: 'square' | 'wide'
  cell: [number, number]
}

// Every preview and writing surface crops the user's original stationery
// boards. The desktop and portrait coordinates are intentionally independent.
export const stationery: Stationery[] = [
  { id: 'blushing-bloom', name: 'Blushing Bloom', mood: 'Floral', desktop: [0, 0], mobile: [0, 0], tint: '#f7e3e4' },
  { id: 'rose-lines', name: 'Rose Lines', mood: 'Classic', desktop: [1, 0], mobile: [1, 0], tint: '#f7eee8' },
  { id: 'pressed-petals', name: 'Pressed Petals', mood: 'Quiet', desktop: [2, 0], mobile: [2, 0], tint: '#f2e7da' },
  { id: 'pink-grid', name: 'Pink Grid', mood: 'Playful', desktop: [3, 0], mobile: [3, 0], tint: '#f4d9dc' },
  { id: 'garden-border', name: 'Garden Border', mood: 'Floral', desktop: [4, 0], mobile: [4, 0], tint: '#f5ebdf' },
  { id: 'lavender-note', name: 'Lavender Note', mood: 'Quiet', desktop: [5, 0], mobile: [0, 1], tint: '#e4dff0' },
  { id: 'cozy-cat', name: 'Cozy Cat', mood: 'Playful', desktop: [0, 1], mobile: [1, 1], tint: '#f7eee5' },
  { id: 'blue-post', name: 'Blue Post', mood: 'Classic', desktop: [1, 1], mobile: [2, 1], tint: '#dce7f2' },
  { id: 'meadow-grid', name: 'Meadow Grid', mood: 'Quiet', desktop: [4, 2], mobile: [3, 1], tint: '#ece9dc' },
  { id: 'heart-lines', name: 'Heart Lines', mood: 'Playful', desktop: [0, 2], mobile: [0, 2], tint: '#f3d9df' },
  { id: 'fallen-petals', name: 'Fallen Petals', mood: 'Quiet', desktop: [1, 2], mobile: [1, 2], tint: '#f3e8dc' },
  { id: 'ribbon-frame', name: 'Ribbon Frame', mood: 'Floral', desktop: [3, 2], mobile: [3, 2], tint: '#f7dfe3' },
  { id: 'little-daisies', name: 'Little Daisies', mood: 'Floral', desktop: [5, 1], mobile: [0, 3], tint: '#f1e4d4' },
  { id: 'moon-letter', name: 'Moon Letter', mood: 'Quiet', desktop: [3, 3], mobile: [2, 3], tint: '#dae4f1' },
  { id: 'rose-portrait', name: 'Rose Portrait', mood: 'Classic', desktop: [4, 3], mobile: [4, 4], tint: '#f6eadf' },
]
// These are individual crops from both envelope boards in the inspiration folder.
export const envelopes: Envelope[] = [
  { id: 'pink-post', name: 'Pink Post', mood: 'Romantic', source: 'square', cell: [0, 0] },
  { id: 'rose-seal', name: 'Rose Seal', mood: 'Botanical', source: 'square', cell: [1, 0] },
  { id: 'peony-fold', name: 'Peony Fold', mood: 'Romantic', source: 'square', cell: [2, 0] },
  { id: 'forget-me-not', name: 'Forget-me-not', mood: 'Botanical', source: 'square', cell: [3, 0] },
  { id: 'pressed-rose', name: 'Pressed Rose', mood: 'Vintage', source: 'square', cell: [0, 1] },
  { id: 'heart-window', name: 'Heart Window', mood: 'Playful', source: 'square', cell: [1, 1] },
  { id: 'little-bow', name: 'Little Bow', mood: 'Playful', source: 'square', cell: [2, 1] },
  { id: 'wildflower-mail', name: 'Wildflower Mail', mood: 'Botanical', source: 'square', cell: [3, 1] },
  { id: 'berry-wax', name: 'Berry Wax', mood: 'Vintage', source: 'wide', cell: [0, 0] },
  { id: 'lace-post', name: 'Lace Post', mood: 'Romantic', source: 'wide', cell: [1, 0] },
  { id: 'tulip-letter', name: 'Tulip Letter', mood: 'Botanical', source: 'wide', cell: [2, 0] },
  { id: 'ribbon-mail', name: 'Ribbon Mail', mood: 'Playful', source: 'wide', cell: [3, 0] },
]
export const papers = stationery.map((paper) => paper.id)
const legacyPapers: Record<string, string> = {
  'Rose garden': 'blushing-bloom', Blush: 'pink-grid', Milk: 'rose-lines', Lilac: 'lavender-note', Botanical: 'garden-border',
}
export function getStationery(id: string) {
  return stationery.find((paper) => paper.id === (legacyPapers[id] ?? id)) ?? stationery[0]
}
export function getEnvelope(id?: string) {
  return envelopes.find((envelope) => envelope.id === id) ?? envelopes[0]
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
