import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging'
import { doc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore'
import { app, db, VAPID_KEY } from './firebase'

export function isIOS() {
  return /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/** iOS only delivers Web Push to a PWA that lives on the Home Screen. */
export function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
}

export type PushStatus =
  | 'ready'            // token stored, notifications will arrive
  | 'needs-permission' // supported, user hasn't granted yet
  | 'blocked'          // user denied
  | 'needs-install'    // iOS Safari tab — must Add to Home Screen first
  | 'misconfigured'    // app needs its public Web Push key
  | 'unsupported'

export async function pushStatus(): Promise<PushStatus> {
  if (!VAPID_KEY || VAPID_KEY === 'MISSING') return 'misconfigured'
  if (!(await isSupported().catch(() => false))) {
    return isIOS() && !isInstalled() ? 'needs-install' : 'unsupported'
  }
  if (isIOS() && !isInstalled()) return 'needs-install'
  if (Notification.permission === 'granted') return 'ready'
  if (Notification.permission === 'denied') return 'blocked'
  return 'needs-permission'
}

/**
 * Must be called from a real user gesture — iOS rejects permission prompts otherwise.
 * Reuses the single Workbox service worker so we never register a competing one.
 */
export async function enablePush(uid: string): Promise<PushStatus> {
  const status = await pushStatus()
  if (status === 'needs-install' || status === 'unsupported' || status === 'blocked' || status === 'misconfigured') return status

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'needs-permission'

  const registration = await navigator.serviceWorker.ready
  const messaging = getMessaging(app)
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration })
  if (!token) return 'needs-permission'

  await setDoc(doc(db, 'tokens', token), {
    uid, token, createdAt: serverTimestamp(), ua: navigator.userAgent.slice(0, 180),
  })
  localStorage.setItem('twofold:token', token)
  return 'ready'
}

export async function disablePush() {
  const token = localStorage.getItem('twofold:token')
  if (token) { await deleteDoc(doc(db, 'tokens', token)) }
  localStorage.removeItem('twofold:token')
}

/** Foreground pushes: the OS stays quiet, so the app shows its own notice. */
export async function onForegroundPush(handler: (title: string, body: string) => void) {
  if (!(await isSupported().catch(() => false))) return () => {}
  return onMessage(getMessaging(app), (payload) => {
    const d = payload.data ?? {}
    handler(d.title ?? 'Letters', d.body ?? '')
  })
}
