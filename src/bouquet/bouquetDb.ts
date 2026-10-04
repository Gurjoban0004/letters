import { collection, doc, limit, onSnapshot, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../lib/firebase'
import { compositionFromDraft, type BouquetDraftV1, type PublishedBouquetV1 } from './studioModel'

const bouquetsCol = () => collection(db, 'bouquets')
const DEMO_KEY = 'letters:bouquets:demo-published:v1'

function createdMillis(value: unknown) {
  if (typeof value === 'number') return value
  if (value instanceof Date) return value.getTime()
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') return value.toMillis()
  return 0
}

export function useBouquets(uid: string | null, pairingId: string | null, max = 100) {
  const [bouquets, setBouquets] = useState<PublishedBouquetV1[] | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!uid || !pairingId) { setBouquets([]); setError(''); return }
    // Sort after reading so bouquet delivery does not depend on a separately
    // deployed composite index. Firestore automatically indexes pairingId.
    const request = query(bouquetsCol(), where('pairingId', '==', pairingId), limit(max))
    return onSnapshot(request, snapshot => {
      setError('')
      const next = snapshot.docs.map(item => ({ id: item.id, ...item.data() })) as PublishedBouquetV1[]
      setBouquets(next.sort((a, b) => createdMillis(b.createdAt) - createdMillis(a.createdAt)))
    }, failure => {
      console.warn('bouquet listener dropped:', failure.code)
      setError('Bouquets could not refresh. Reconnecting…')
      setTimeout(() => setRetry(value => value + 1), 1500)
    })
  }, [max, pairingId, retry, uid])

  return { bouquets, error }
}

export async function sendBouquet(draft: BouquetDraftV1, senderId: string, recipientId: string, pairingId: string) {
  const composition = compositionFromDraft(draft)
  const id = draft.clientPublicationId && /^[A-Za-z0-9_-]{16,80}$/.test(draft.clientPublicationId) ? draft.clientPublicationId : crypto.randomUUID()
  await setDoc(doc(bouquetsCol(), id), {
    version: 1,
    pairingId,
    senderId,
    recipientId,
    title: draft.title.trim() || `For ${composition.note.to}`,
    itemCount: composition.items.length,
    composition,
    receivedAt: null,
    viewedAt: null,
    // A bouquet belongs at the top of the shared desk when it is sent, even if
    // the draft was started days earlier.
    createdAt: Timestamp.now(),
  })
  return id
}

export async function markBouquetReceived(id: string) {
  await updateDoc(doc(bouquetsCol(), id), { receivedAt: serverTimestamp() })
}

export async function markBouquetViewed(id: string) {
  await updateDoc(doc(bouquetsCol(), id), { viewedAt: serverTimestamp() })
}

export function loadDemoBouquets(storage: Pick<Storage, 'getItem'> = localStorage): PublishedBouquetV1[] {
  try {
    const value = JSON.parse(storage.getItem(DEMO_KEY) ?? '[]') as unknown
    return Array.isArray(value) ? value as PublishedBouquetV1[] : []
  } catch { return [] }
}

export function sendDemoBouquet(draft: BouquetDraftV1, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage) {
  const composition = compositionFromDraft(draft)
  const published: PublishedBouquetV1 = {
    version: 1,
    id: draft.clientPublicationId ?? crypto.randomUUID(),
    pairingId: 'sample',
    senderId: 'sample-self',
    recipientId: 'sample-partner',
    title: draft.title.trim() || `For ${composition.note.to}`,
    itemCount: composition.items.length,
    composition,
    createdAt: Date.now(),
    receivedAt: null,
    viewedAt: null,
  }
  const previous = loadDemoBouquets(storage).filter(item => item.id !== published.id)
  storage.setItem(DEMO_KEY, JSON.stringify([published, ...previous].slice(0, 30)))
  return published.id
}
