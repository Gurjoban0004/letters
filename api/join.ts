import type { IncomingMessage, ServerResponse } from 'node:http'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { JoinFailure, planJoin, type PairingRecord } from '../server/join-logic.js'

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
  if (!account.project_id || !account.client_email || !account.private_key) throw new Error('Firebase Admin is not configured')
  return initializeApp({ credential: cert({
    projectId: account.project_id,
    clientEmail: account.client_email,
    privateKey: account.private_key,
  }) })
}

function bearer(req: Request) {
  const value = req.headers.authorization ?? ''
  return value.startsWith('Bearer ') ? value.slice(7) : ''
}

function parseBody(body: unknown) {
  if (typeof body === 'string') return JSON.parse(body) as unknown
  return body
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

    let body: { inviteId?: unknown; name?: unknown; edition?: unknown } | null
    try { body = parseBody(req.body) as typeof body }
    catch { return json(res, 400, { error: 'invalid-body' }) }
    const inviteId = typeof body?.inviteId === 'string' ? body.inviteId : ''
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const edition = body?.edition === 'rose' || body?.edition === 'graphite' ? body.edition : ''
    if (!/^[A-Za-z0-9_-]{20,80}$/.test(inviteId)) return json(res, 400, { error: 'invalid-invite' })
    if (!name || name.length > 24) return json(res, 400, { error: 'invalid-name' })
    if (!edition) return json(res, 400, { error: 'invalid-edition' })

    const db = getFirestore(firebase)
    const identityRef = db.collection('users').doc(decoded.uid)
    const targetRef = db.collection('pairings').doc(inviteId)
    const result = await db.runTransaction(async (transaction) => {
      const identitySnap = await transaction.get(identityRef)
      const currentPairingId = String(identitySnap.data()?.pairingId ?? '')
      const targetSnap = await transaction.get(targetRef)
      const currentRef = currentPairingId && currentPairingId !== inviteId
        ? db.collection('pairings').doc(currentPairingId)
        : null
      const currentSnap = currentRef ? await transaction.get(currentRef) : null
      const target = targetSnap.exists ? targetSnap.data() as PairingRecord : null
      const current = currentSnap?.exists ? currentSnap.data() as PairingRecord : null
      const plan = planJoin({ uid: decoded.uid, inviteId, currentPairingId, target, current })
      if (plan.alreadyJoined) return inviteId
      const profiles = targetSnap.data()?.profiles && typeof targetSnap.data()?.profiles === 'object'
        ? targetSnap.data()!.profiles as Record<string, unknown>
        : {}

      transaction.update(targetRef, {
        members: plan.members,
        profiles: { ...profiles, [decoded.uid]: { name, edition, joinedAt: Date.now() } },
        status: 'active',
        acceptedAt: FieldValue.serverTimestamp(),
      })
      if (plan.cancelCurrent && currentRef) {
        transaction.update(currentRef, { status: 'cancelled', cancelledAt: FieldValue.serverTimestamp() })
      }
      transaction.set(identityRef, { pairingId: inviteId }, { merge: true })
      return inviteId
    })

    return json(res, 200, { ok: true, pairingId: result })
  } catch (error) {
    if (error instanceof JoinFailure) return json(res, error.status, { error: error.code })
    console.error('pairing join failed', error)
    return json(res, 500, { error: 'join-failed' })
  }
}
