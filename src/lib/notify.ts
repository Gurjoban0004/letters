import { auth } from './firebase'

const endpoint = (import.meta.env.VITE_PUSH_API_URL as string | undefined) || '/api/notify'
const pendingKey = (uid: string) => `letters:pending-push:${uid}`

function pending(uid: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(pendingKey(uid)) ?? '[]')
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string').slice(-30) : []
  } catch { return [] }
}

function savePending(uid: string, ids: string[]) {
  try { localStorage.setItem(pendingKey(uid), JSON.stringify(ids)) } catch { /* Continue the send without local retry storage. */ }
}

/** Ask the free Vercel function to notify the other person after the letter exists. */
export async function dispatchLetterNotification(memoryId: string) {
  const user = auth.currentUser
  if (!user) return { sent: 0, failed: 0, reason: 'no-user', duplicate: false }
  const uid = user.uid
  savePending(uid, [...new Set([...pending(uid), memoryId])].slice(-30))
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await user.getIdToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ memoryId }),
    keepalive: true,
  })
  if (!response.ok) {
    if ([400, 403, 404].includes(response.status)) {
      savePending(uid, pending(uid).filter((id) => id !== memoryId))
    }
    throw new Error(`notification dispatch returned ${response.status}`)
  }
  const result = await response.json().catch(() => null) as { ok?: boolean; sent?: number; failed?: number; reason?: string; duplicate?: boolean } | null
  if (!result?.ok) throw new Error('notification dispatch returned an invalid response')
  savePending(uid, pending(uid).filter((id) => id !== memoryId))
  return { sent: result.sent ?? 0, failed: result.failed ?? 0, reason: result.reason, duplicate: result.duplicate === true }
}

/** A failed browser-to-server request is retried when this account returns online. */
export async function retryPendingLetterNotifications(uid: string) {
  if (!navigator.onLine || auth.currentUser?.uid !== uid) return
  for (const id of pending(uid)) {
    try { await dispatchLetterNotification(id) }
    catch { if (pending(uid).includes(id)) break }
  }
}
