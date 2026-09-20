import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { setGlobalOptions } from 'firebase-functions/v2'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { getStorage } from 'firebase-admin/storage'
import * as logger from 'firebase-functions/logger'

initializeApp()
setGlobalOptions({ region: 'us-central1', maxInstances: 3 })

const db = getFirestore()

/* ------------------------------------------------------------------ */
/* Push                                                                */
/* ------------------------------------------------------------------ */

/**
 * Data-only messages on purpose. The service worker renders the notification
 * itself, which keeps one consistent presentation and avoids the browser
 * auto-displaying a second, uglier copy alongside ours.
 */
async function notify(uid: string, payload: { title: string; body: string; tag: string }) {
  const tokens = await db.collection('tokens').where('uid', '==', uid).get()
  if (tokens.empty) return

  const ids = tokens.docs.map((d) => d.id)
  const res = await getMessaging().sendEachForMulticast({
    tokens: ids,
    data: { ...payload, url: '/' },
    webpush: {
      headers: { Urgency: 'high', TTL: '86400' },
      fcmOptions: { link: '/' },
    },
  })

  // Retire tokens for uninstalled or expired installs so the list stays clean.
  const dead = res.responses
    .map((r, i) => (!r.success && isDeadToken(r.error?.code) ? ids[i] : null))
    .filter((t): t is string => !!t)

  if (dead.length) {
    const batch = db.batch()
    dead.forEach((t) => batch.delete(db.collection('tokens').doc(t)))
    await batch.commit()
    logger.info(`pruned ${dead.length} dead token(s)`)
  }
}

function isDeadToken(code?: string) {
  return code === 'messaging/registration-token-not-registered' ||
    code === 'messaging/invalid-registration-token' ||
    code === 'messaging/invalid-argument'
}

/**
 * The pairing document is the only place membership lives, so who-gets-notified
 * can never drift out of step with who is actually in the pairing.
 */
async function pairingFacts(pairingId: string, actor: string) {
  const snap = await db.collection('pairings').doc(pairingId || 'twofold').get()
  const data = snap.data() ?? {}
  const members = (data.members ?? []) as string[]
  const profiles = (data.profiles ?? {}) as Record<string, { name?: string }>
  return {
    recipient: members.find((m) => m !== actor) ?? null,
    name: profiles[actor]?.name ?? 'Your friend',
  }
}

/* ------------------------------------------------------------------ */
/* A new memory arrives                                                */
/* ------------------------------------------------------------------ */

export const onMemoryCreated = onDocumentCreated('memories/{memoryId}', async (event) => {
  const m = event.data?.data()
  if (!m) return

  const { recipient: to, name } = await pairingFacts(m.pairingId, m.senderId)
  if (!to) return

  const sealed = m.unlockAt ? m.unlockAt.toDate() : null

  const copy: Record<string, { title: string; body: string }> = {
    letter: sealed
      ? { title: 'A sealed letter arrived', body: `${name} wrote to you. It opens ${sealed.toLocaleDateString()}.` }
      : { title: 'A letter arrived', body: `${name} wrote to you. Take your time.` },
    doodle: { title: 'A new illustration', body: `${name} drew you something.` },
    snap: { title: 'Something brief', body: `${name} sent a view-once snap. It won't wait forever.` },
    scrapbook: { title: 'A photograph', body: `${name} filed a picture in the archive.` },
    classified: { title: 'A small ad appeared', body: `${name}: ${String(m.caption ?? '').slice(0, 90)}` },
  }

  const chosen = copy[m.type as string]
  if (!chosen) return

  await notify(to, { ...chosen, tag: `memory-${m.type}` })
})

/* ------------------------------------------------------------------ */
/* Alerts: the "looked away" notice and the heart pulse                */
/* ------------------------------------------------------------------ */

export const onAlertCreated = onDocumentCreated('alerts/{alertId}', async (event) => {
  const a = event.data?.data()
  if (!a) return

  const to = recipientOf(a.members, a.from)
  if (!to) return

  const title = a.type === 'screenshot' ? 'Stop press'
    : a.type === 'pulse' ? 'A signal'
    : 'A notice'

  await notify(to, { title, body: String(a.message ?? ''), tag: `alert-${a.type}` })
})

/* ------------------------------------------------------------------ */
/* Burned snaps: make sure the file is really gone                     */
/* ------------------------------------------------------------------ */

/**
 * The viewer's client deletes the object as it burns, but a client can lose
 * connection halfway. This is the backstop that guarantees the bytes leave the
 * bucket even if the device that burned it never finished the job.
 */
export const onMemoryBurned = onDocumentUpdated('memories/{memoryId}', async (event) => {
  const before = event.data?.before.data()
  const after = event.data?.after.data()
  if (!before || !after) return
  if (before.isBurned === true || after.isBurned !== true) return
  if (!after.mediaPath) return

  try {
    await getStorage().bucket().file(after.mediaPath).delete({ ignoreNotFound: true })
    logger.info(`burned ${after.mediaPath}`)
  } catch (err) {
    logger.error('burn cleanup failed', err)
  }
})
