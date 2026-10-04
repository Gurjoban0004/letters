import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore'

const projectId = 'demo-twofold-bouquet-rules'
const pairingId = 'pair-a'
const senderId = 'sender-a'
const recipientId = 'recipient-a'
const outsiderId = 'outsider-a'

const environment = await initializeTestEnvironment({
  projectId,
  firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
})

const composition = {
  version: 1,
  items: [0, 1, 2].map(index => ({
    id: `stem-${index}`,
    assetId: 'flower_rose_blush',
    x: .4 + index * .1,
    y: .9,
    scale: .6,
    rotation: index * 4,
    flipX: false,
    z: index,
  })),
  wrapId: 'wrap_blush',
  ribbonId: 'ribbon_rose',
  bouquetStyle: 'classic',
  note: { to: 'You', body: 'A small garden for you.', from: 'Me' },
}

const bouquet = {
  version: 1,
  pairingId,
  senderId,
  recipientId,
  title: 'For you',
  itemCount: composition.items.length,
  composition,
  createdAt: Timestamp.fromMillis(1_700_000_000_000),
  receivedAt: null,
  viewedAt: null,
}

try {
  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'pairings', pairingId), { members: [senderId, recipientId] })
  })

  const sender = environment.authenticatedContext(senderId).firestore()
  const recipient = environment.authenticatedContext(recipientId).firestore()
  const outsider = environment.authenticatedContext(outsiderId).firestore()
  const anonymous = environment.unauthenticatedContext().firestore()
  const bouquetRef = doc(sender, 'bouquets', 'bouquet-a')

  await assertSucceeds(setDoc(bouquetRef, bouquet))
  await assertSucceeds(setDoc(doc(sender, 'bouquets', 'bouquet-without-ribbon'), {
    ...bouquet,
    composition: { ...composition, ribbonId: null },
  }))
  await assertSucceeds(getDoc(doc(recipient, 'bouquets', 'bouquet-a')))
  await assertSucceeds(getDocs(query(collection(sender, 'bouquets'), where('pairingId', '==', pairingId))))
  await assertSucceeds(getDocs(query(collection(recipient, 'bouquets'), where('pairingId', '==', pairingId))))
  await assertFails(getDocs(query(collection(outsider, 'bouquets'), where('pairingId', '==', pairingId))))
  await assertFails(getDoc(doc(outsider, 'bouquets', 'bouquet-a')))
  await assertFails(getDoc(doc(anonymous, 'bouquets', 'bouquet-a')))

  await assertSucceeds(updateDoc(doc(recipient, 'bouquets', 'bouquet-a'), { receivedAt: Timestamp.fromMillis(1_700_000_000_100) }))
  await assertSucceeds(updateDoc(doc(recipient, 'bouquets', 'bouquet-a'), { viewedAt: Timestamp.fromMillis(1_700_000_000_200) }))
  await assertFails(updateDoc(bouquetRef, { viewedAt: Timestamp.fromMillis(1_700_000_000_300) }))
  await assertFails(updateDoc(doc(recipient, 'bouquets', 'bouquet-a'), { title: 'Changed' }))
  await assertFails(deleteDoc(bouquetRef))

  await assertFails(setDoc(doc(sender, 'bouquets', 'wrong-recipient'), { ...bouquet, recipientId: outsiderId }))
  await assertFails(setDoc(doc(outsider, 'bouquets', 'outsider-create'), { ...bouquet, senderId: outsiderId }))
  await assertFails(setDoc(doc(sender, 'bouquets', 'wrong-count'), { ...bouquet, itemCount: 4 }))
  await assertFails(setDoc(doc(sender, 'bouquets', 'pre-opened'), { ...bouquet, viewedAt: Timestamp.fromMillis(1_700_000_000_300) }))
  await assertFails(setDoc(doc(sender, 'bouquets', 'wrong-style'), { ...bouquet, composition: { ...composition, bouquetStyle: 'chaotic' } }))
  await assertFails(setDoc(doc(sender, 'bouquets', 'extra-field'), { ...bouquet, publicShare: true }))

  console.log('PASS: bouquet rules isolate pairings, freeze content, and reserve receipts for the recipient')
} finally {
  await environment.cleanup()
}
