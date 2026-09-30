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

function firstName(value?: string, maxLength = 18) {
  const first = (value ?? '').trim().split(/\s+/u)[0] ?? ''
  return first.slice(0, maxLength)
}

function pushTitle(value?: string) {
  return `${firstName(value, 7) || 'Someone'} wrote to you`
}

/* ------------------------------------------------------------------ */
/* Push                                                                */
/* ------------------------------------------------------------------ */

/**
 * Data-only messages on purpose. The service worker renders the notification
 * itself, which keeps one consistent presentation and avoids the browser
 * auto-displaying a second, uglier copy alongside ours.
 */
async function notify(uid: string, payload: { title: string; body: string; tag: string; url?: string }) {
  const tokens = await db.collection('tokens').where('uid', '==', uid).get()
  if (tokens.empty) return

  const ids = tokens.docs.map((d) => d.id)
  const res = await getMessaging().sendEachForMulticast({
    tokens: ids,
    data: { ...payload, url: payload.url ?? '/' },
    webpush: {
      headers: { Urgency: 'high', TTL: '86400' },
      fcmOptions: { link: payload.url ?? '/' },
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
    name: firstName(profiles[actor]?.name) || 'Someone',
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

  const copy: Record<string, { body: string }> = {
    letter: sealed
      ? { body: `A sealed letter is waiting for you. It will be ready on ${sealed.toLocaleDateString()}.` }
      : { body: 'A little letter is waiting quietly in your letterbox, whenever you have a moment.' },
    doodle: { body: 'They drew you a little something to keep.' },
    snap: { body: 'A view-once moment is waiting for you. Open it when you’re ready.' },
    scrapbook: { body: 'A new photograph has been tucked into your shared keepsakes.' },
    classified: { body: `A new little note appeared: ${String(m.caption ?? '').slice(0, 90)}` },
  }

  const chosen = copy[m.type as string]
  if (!chosen) return

  await notify(to, { title: pushTitle(name), ...chosen, tag: 'letters-inbox', url: `/?open=${encodeURIComponent(event.params.memoryId)}` })
})

/* ------------------------------------------------------------------ */
/* Alerts: the "looked away" notice and the heart pulse                */
/* ------------------------------------------------------------------ */

export const onAlertCreated = onDocumentCreated('alerts/{alertId}', async (event) => {
  const a = event.data?.data()
  if (!a) return

  const { recipient: to, name } = await pairingFacts(String(a.pairingId ?? ''), String(a.from ?? ''))
  if (!to) return

  await notify(to, { title: pushTitle(name), body: String(a.message ?? ''), tag: 'letters-alert' })
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
