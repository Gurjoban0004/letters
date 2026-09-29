import type { User } from 'firebase/auth'
import type { Edition } from './session'

type JoinResponse = { ok?: boolean; pairingId?: string; error?: string }

async function requestJoin(user: User, inviteId: string, name: string, edition: Edition, forceRefresh: boolean) {
  const token = await user.getIdToken(forceRefresh)
  let response: Response
  try {
    response = await fetch('/api/join', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteId, name, edition }),
    })
  } catch {
    throw new Error('join-network')
  }

  let result: JoinResponse
  try { result = await response.json() as JoinResponse }
  catch { throw new Error('join-service-unavailable') }
  return { response, result }
}

export async function joinPairing(user: User, inviteId: string, name: string, edition: Edition) {
  let attempt = await requestJoin(user, inviteId, name, edition, false)
  if (attempt.response.status === 401 && attempt.result.error === 'invalid-auth') {
    attempt = await requestJoin(user, inviteId, name, edition, true)
  }
  if (!attempt.response.ok || !attempt.result.ok || attempt.result.pairingId !== inviteId) {
    throw new Error(attempt.result.error || 'join-service-unavailable')
  }
  return attempt.result.pairingId
}
