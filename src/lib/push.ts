import { deleteToken, getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging'
import { doc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore'
import { app, db, VAPID_KEY } from './firebase'
import { resolvePushStatus, type PushStatus } from './push-state'

const TOKEN_KEY = 'twofold:token'
const OWNER_KEY = 'twofold:token-owner'
const OPT_IN_KEY = 'twofold:push-opt-in:'

export function isIOS() {
  return /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/** iOS only delivers Web Push to a PWA that lives on the Home Screen. */
export function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
}

export type { PushStatus } from './push-state'

export function pushEnabledFor(uid: string) {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted' &&
    localStorage.getItem(TOKEN_KEY) !== null && localStorage.getItem(OWNER_KEY) === uid
}

export function shouldRestorePush(uid: string) {
  return localStorage.getItem(OPT_IN_KEY + uid) === 'true' ||
    (localStorage.getItem(TOKEN_KEY) !== null && localStorage.getItem(OWNER_KEY) === uid)
}

export async function pushStatus(uid?: string): Promise<PushStatus> {
  const supported = await isSupported().catch(() => false)
  return resolvePushStatus({
    configured: !!VAPID_KEY && VAPID_KEY !== 'MISSING',
    supported,
    ios: isIOS(),
    installed: isInstalled(),
    permission: supported ? Notification.permission : 'default',
    token: localStorage.getItem(TOKEN_KEY),
    owner: localStorage.getItem(OWNER_KEY),
    uid,
  })
}

/**
 * Must be called from a real user gesture — iOS rejects permission prompts otherwise.
 * Reuses the single Workbox service worker so we never register a competing one.
 */
export async function enablePush(uid: string): Promise<PushStatus> {
  const status = await pushStatus(uid)
  if (status === 'needs-install' || status === 'unsupported' || status === 'blocked' || status === 'misconfigured') return status

  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'needs-permission'

  const registration = await navigator.serviceWorker.ready
  const messaging = getMessaging(app)
  const previousOwner = localStorage.getItem(OWNER_KEY)
  if (previousOwner && previousOwner !== uid) {
    await deleteToken(messaging)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(OWNER_KEY)
  }
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration })
  if (!token) return 'needs-permission'

  await setDoc(doc(db, 'tokens', token), {
    uid, token, createdAt: serverTimestamp(), ua: navigator.userAgent.slice(0, 180),
  })
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(OWNER_KEY, uid)
  localStorage.setItem(OPT_IN_KEY + uid, 'true')
  return 'ready'
}

export async function disablePush() {
  const token = localStorage.getItem(TOKEN_KEY)
  const owner = localStorage.getItem(OWNER_KEY)
  const supported = await isSupported().catch(() => false)
  // Revoke the browser token before signing out. If revocation fails, retain
  // ownership locally so the user can retry instead of leaving a live device.
  const revoked = token && supported ? await deleteToken(getMessaging(app)) : false
  if (token) {
    try { await deleteDoc(doc(db, 'tokens', token)) }
    catch (error) { if (!revoked) throw error }
  }
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(OWNER_KEY)
  if (owner) localStorage.removeItem(OPT_IN_KEY + owner)
}

/** Foreground pushes: the OS stays quiet, so the app shows its own notice. */
export async function onForegroundPush(handler: (title: string, body: string) => void) {
  if (!(await isSupported().catch(() => false))) return () => {}
  return onMessage(getMessaging(app), (payload) => {
    const d = payload.data ?? {}
    handler(d.title ?? 'Letters', d.body ?? '')
  })
}
