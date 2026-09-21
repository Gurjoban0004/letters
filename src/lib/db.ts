import {
  addDoc, collection, doc, setDoc, updateDoc, onSnapshot, orderBy, query, limit,
  serverTimestamp, Timestamp, deleteField, getDoc, writeBatch, where,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { useEffect, useState } from 'react'
import { db, storage, PAIRING_ID } from './firebase'

export type MemoryType = 'letter' | 'doodle' | 'snap' | 'scrapbook' | 'classified'

export type Memory = {
  id: string
  pairingId?: string
  senderId: string
  type: MemoryType
  createdAt: Timestamp | null
  unlockAt: Timestamp | null
  title?: string
  paper?: string
  envelope?: string
  caption?: string
  mediaPath?: string
  mediaUrl?: string
  viewedAt?: Timestamp | null
  isBurned?: boolean
  reactions?: Record<string, string>
}

export type Alert = {
  id: string
  from: string
  type: 'screenshot' | 'pulse' | 'opened'
  message: string
  createdAt: Timestamp | null
}

const memoriesCol = () => collection(db, 'memories')
const alertsCol = () => collection(db, 'alerts')

/* ---------------- reads ---------------- */

export function useMemories(uid: string | null, max = 200, pairingId = PAIRING_ID) {
  return useLiveList<Memory>(memoriesCol, uid, max, pairingId)
}

export function useAlerts(uid: string | null, max = 40) {
  return useLiveList<Alert>(alertsCol, uid, max) ?? []
}

function useLiveList<T>(col: () => ReturnType<typeof collection>, uid: string | null, max: number, pairingId?: string) {
  const [items, setItems] = useState<T[] | null>(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!uid || (pairingId !== undefined && !pairingId)) return
    const q = pairingId ? query(col(), where('pairingId', '==', pairingId), orderBy('createdAt', 'desc'), limit(max)) : query(col(), orderBy('createdAt', 'desc'), limit(max))
    return onSnapshot(
      q,
      (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[]),
      (err) => {
        // A dropped listener never resumes on its own, so re-attach rather than
        // leaving the page permanently empty.
        console.warn('listener dropped:', err.code)
        setTimeout(() => setRetry((n) => n + 1), 1500)
      },
    )
  }, [uid, max, retry, pairingId])

  return items
}

/** Letter bodies live in a subdocument that security rules gate on `unlockAt`. */
export async function readLetterBody(memoryId: string): Promise<string | null> {
  try {
    const snap = await getDoc(doc(db, 'memories', memoryId, 'secret', 'content'))
    return snap.exists() ? ((snap.data().body as string) ?? '') : null
  } catch {
    return null // rules refused — still sealed
  }
}

export function isSealed(m: Memory, now = Date.now()) {
  return !!m.unlockAt && m.unlockAt.toMillis() > now
}

/* ---------------- writes ---------------- */

export async function sendLetter(opts: {
  senderId: string; title: string; body: string
  paper: string; envelope?: string; unlockAt: Date | null; pairingId?: string
}) {
  const pairingId = opts.pairingId ?? PAIRING_ID
  const unlock = opts.unlockAt ? Timestamp.fromDate(opts.unlockAt) : null
  const memory = doc(memoriesCol())
  const batch = writeBatch(db)
  batch.set(memory, {
    pairingId,
    senderId: opts.senderId,
    type: 'letter' as MemoryType,
    title: opts.title || 'Untitled',
    paper: opts.paper,
    envelope: opts.envelope ?? 'pink-post',
    unlockAt: unlock,
    isBurned: false,
    viewedAt: null,
    reactions: {},
    createdAt: serverTimestamp(),
  })
  // The body lives apart from its envelope, carrying its own copy of unlockAt so
  // the rule can refuse to serve it early without a cross-document lookup.
  batch.set(doc(db, 'memories', memory.id, 'secret', 'content'), {
    pairingId,
    unlockAt: unlock,
    body: opts.body,
  })
  await batch.commit()
  return memory.id
}

/** Classifieds reuse the memories collection — a tiny ad, no new rules needed. */
export async function postClassified(senderId: string, text: string) {
  await addDoc(memoriesCol(), {
    pairingId: PAIRING_ID,
    senderId,
    type: 'classified' as MemoryType,
    caption: text,
    unlockAt: null, isBurned: false, viewedAt: null, reactions: {},
    createdAt: serverTimestamp(),
  })
}

export async function sendMedia(opts: {
  senderId: string
  type: Extract<MemoryType, 'doodle' | 'snap' | 'scrapbook'>
  blob: Blob; caption?: string; ext?: string
}) {
  const id = crypto.randomUUID()
  const ext = opts.ext ?? (opts.blob.type.includes('webp') ? 'webp' : opts.blob.type.includes('video') ? 'mp4' : 'jpg')
  const path = `pairings/${PAIRING_ID}/${id}.${ext}`
  await uploadBytes(ref(storage, path), opts.blob, { contentType: opts.blob.type })

  // View-once media keeps only its path: the URL is resolved at view time and the
  // object is destroyed on burn. Keepers cache a URL so the feed renders instantly.
  const mediaUrl = opts.type === 'snap' ? null : await getDownloadURL(ref(storage, path))

  await addDoc(memoriesCol(), {
    pairingId: PAIRING_ID,
    senderId: opts.senderId,
    type: opts.type,
    caption: opts.caption ?? '',
    mediaPath: path,
    mediaUrl,
    unlockAt: null,
    isBurned: false,
    viewedAt: null,
    reactions: {},
    createdAt: serverTimestamp(),
  })
}

export async function snapUrl(memory: Memory) {
  if (!memory.mediaPath) return null
  try { return await getDownloadURL(ref(storage, memory.mediaPath)) } catch { return null }
}

/** Marks viewed, then destroys the stored object. Irreversible by design. */
export async function burnSnap(memory: Memory) {
  await updateDoc(doc(db, 'memories', memory.id), {
    isBurned: true,
    viewedAt: serverTimestamp(),
    mediaUrl: deleteField(),
  })
  if (memory.mediaPath) {
    try { await deleteObject(ref(storage, memory.mediaPath)) } catch { /* already gone */ }
  }
}

export async function markViewed(memoryId: string) {
  await updateDoc(doc(db, 'memories', memoryId), { viewedAt: serverTimestamp() })
}

export async function react(memoryId: string, uid: string, mark: string) {
  await updateDoc(doc(db, 'memories', memoryId), { [`reactions.${uid}`]: mark })
}

export async function sendAlert(opts: {
  from: string; type: Alert['type']; message: string
}) {
  await addDoc(alertsCol(), {
    pairingId: PAIRING_ID,
    from: opts.from,
    type: opts.type,
    message: opts.message,
    createdAt: serverTimestamp(),
  })
}

export async function heartPulse(from: string, name: string) {
  await Promise.all([
    sendAlert({ from, type: 'pulse', message: `${name} is thinking of you right now.` }),
    setDoc(doc(db, 'pairings', PAIRING_ID), { lastPulse: { from, at: serverTimestamp() } }, { merge: true }),
  ])
}
