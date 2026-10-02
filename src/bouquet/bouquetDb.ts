import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../lib/firebase'
import { compositionFromDraft, type BouquetDraftV1, type PublishedBouquetV1 } from './studioModel'

const bouquetsCol = () => collection(db, 'bouquets')
const DEMO_KEY = 'letters:bouquets:demo-published:v1'

export function useBouquets(uid: string | null, pairingId: string | null, max = 100) {
  const [bouquets, setBouquets] = useState<PublishedBouquetV1[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!uid || !pairingId) { setBouquets([]); return }
    const request = query(bouquetsCol(), where('pairingId', '==', pairingId), orderBy('createdAt', 'desc'), limit(max))
    return onSnapshot(request, snapshot => {
      setError('')
      setBouquets(snapshot.docs.map(item => ({ id: item.id, ...item.data() })) as PublishedBouquetV1[])
    }, () => {
      setError('Bouquets could not refresh. Your saved draft is still on this device.')
      setBouquets(current => current ?? [])
    })
  }, [max, pairingId, uid])

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
    createdAt: Timestamp.fromMillis(draft.createdAt),
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
