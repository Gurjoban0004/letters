import type { IncomingMessage, ServerResponse } from 'node:http'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { getMessaging, type BatchResponse } from 'firebase-admin/messaging'

type Request = IncomingMessage & { body?: unknown }
type Response = ServerResponse & { status: (code: number) => Response; json: (body: unknown) => void }

const allowedOrigins = new Set([
  'https://letters-rho-dusky.vercel.app',
  'https://codeclass-ed1b4.web.app',
  'https://codeclass-ed1b4.firebaseapp.com',
])

function json(res: Response, status: number, body: unknown) {
  res.status(status).json(body)
}

function configureCors(req: Request, res: Response) {
  const origin = req.headers.origin
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  }
  return !origin || allowedOrigins.has(origin)
}

function adminApp() {
  if (getApps().length) return getApps()[0]
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('Firebase Admin is not configured')
  const account = JSON.parse(raw) as { project_id?: string; client_email?: string; private_key?: string }
  const projectId = account.project_id
  const clientEmail = account.client_email
  const privateKey = account.private_key
  if (!projectId || !clientEmail || !privateKey) throw new Error('Firebase Admin is not configured')
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
}

function bearer(req: Request) {
  const value = req.headers.authorization ?? ''
  return value.startsWith('Bearer ') ? value.slice(7) : ''
}

function parseBody(body: unknown) {
  if (typeof body === 'string') return JSON.parse(body) as unknown
  return body
}

function deadToken(code?: string) {
  return code === 'messaging/registration-token-not-registered' ||
    code === 'messaging/invalid-registration-token'
}

function retryable(code?: string) {
  return code === 'messaging/server-unavailable' ||
    code === 'messaging/internal-error' ||
    code === 'messaging/quota-exceeded' ||
    code === 'messaging/unknown-error'
}

function classify(response: BatchResponse, tokens: string[]) {
  const dead: string[] = []
  const retry: string[] = []
  let failed = 0
  response.responses.forEach((item, index) => {
    if (item.success) return
    const code = item.error?.code
    if (deadToken(code)) dead.push(tokens[index])
    else if (retryable(code)) retry.push(tokens[index])
    else failed += 1
  })
  return { dead, retry, failed }
}

async function sendWithRetry(tokens: string[], data: Record<string, string>) {
  const messaging = getMessaging(adminApp())
  let pending = tokens
  let sent = 0
  let failed = 0
  const dead = new Set<string>()

  for (let attempt = 0; attempt < 3 && pending.length; attempt += 1) {
    const response = await messaging.sendEachForMulticast({
      tokens: pending,
      data,
      webpush: {
        headers: { Urgency: 'high', TTL: '86400' },
      },
    })
    sent += response.successCount
    const result = classify(response, pending)
    result.dead.forEach((token) => dead.add(token))
    failed += result.failed
    pending = result.retry
  }

  return { sent, dead: [...dead], failed: failed + pending.length }
}

export default async function handler(req: Request, res: Response) {
  if (!configureCors(req, res)) return json(res, 403, { error: 'origin-not-allowed' })
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return }
  if (req.method !== 'POST') return json(res, 405, { error: 'method-not-allowed' })

  try {
    const token = bearer(req)
    if (!token) return json(res, 401, { error: 'missing-auth' })

    const firebase = adminApp()
    let decoded
    try { decoded = await getAuth(firebase).verifyIdToken(token) }
    catch { return json(res, 401, { error: 'invalid-auth' }) }
    let body: { memoryId?: unknown } | null
    try { body = parseBody(req.body) as { memoryId?: unknown } | null }
    catch { return json(res, 400, { error: 'invalid-body' }) }
    const memoryId = typeof body?.memoryId === 'string' ? body.memoryId : ''
    if (!/^[A-Za-z0-9_-]{16,80}$/.test(memoryId)) return json(res, 400, { error: 'invalid-memory' })

    const db = getFirestore(firebase)
    const memoryRef = db.collection('memories').doc(memoryId)
    const memory = await memoryRef.get()
    const data = memory.data()
    if (!memory.exists || !data || data.senderId !== decoded.uid || data.type !== 'letter') {
      return json(res, 403, { error: 'not-authorized' })
    }

    const pairing = await db.collection('pairings').doc(String(data.pairingId ?? '')).get()
    const pairingData = pairing.data()
    const members = Array.isArray(pairingData?.members) ? pairingData.members as string[] : []
    if (!members.includes(decoded.uid)) return json(res, 403, { error: 'not-a-member' })
    const recipient = members.find((uid) => uid !== decoded.uid)
    if (!recipient) return json(res, 200, { ok: true, sent: 0, reason: 'no-recipient' })

    const dispatchRef = db.collection('notificationDispatches').doc(memoryId)
    const claimed = await db.runTransaction(async (transaction) => {
      const previous = await transaction.get(dispatchRef)
      if (previous.exists) return false
      transaction.create(dispatchRef, {
        senderId: decoded.uid,
        recipientId: recipient,
        startedAt: FieldValue.serverTimestamp(),
      })
      return true
    })
    if (!claimed) return json(res, 200, { ok: true, duplicate: true })

    try {
      const tokenDocs = await db.collection('tokens').where('uid', '==', recipient).limit(500).get()
      const tokens = tokenDocs.docs.map((doc) => doc.id)
      if (!tokens.length) {
        await dispatchRef.set({ completedAt: FieldValue.serverTimestamp(), sent: 0 }, { merge: true })
        return json(res, 200, { ok: true, sent: 0, reason: 'no-devices' })
      }

      const profile = pairingData?.profiles?.[decoded.uid] as { name?: string } | undefined
      const result = await sendWithRetry(tokens, {
        title: `A little letter from ${profile?.name ?? 'Your person'}`,
        body: 'It’s waiting quietly in your letterbox.',
        tag: `memory-${memoryId}`,
        url: `/?open=${encodeURIComponent(memoryId)}`,
      })

      if (result.dead.length) {
        const batch = db.batch()
        result.dead.forEach((dead) => batch.delete(db.collection('tokens').doc(dead)))
        await batch.commit()
      }
      await dispatchRef.set({
        completedAt: FieldValue.serverTimestamp(),
        sent: result.sent,
        failed: result.failed,
        pruned: result.dead.length,
      }, { merge: true })
      return json(res, 200, { ok: true, sent: result.sent, failed: result.failed })
    } catch (error) {
      await dispatchRef.delete().catch(() => {})
      throw error
    }
  } catch (error) {
    console.error('notification dispatch failed', error)
    return json(res, 500, { error: 'dispatch-failed' })
  }
}
