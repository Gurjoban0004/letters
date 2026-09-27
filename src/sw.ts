/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { initializeApp } from 'firebase/app'
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw'

declare let self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// SPA: every navigation resolves to the shell, so the app opens offline.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), {
  denylist: [/^\/__/, /\/[^/?]+\.[^/]+$/],
}))

self.addEventListener('message', (e) => {
  if ((e.data as { type?: string })?.type === 'SKIP_WAITING') self.skipWaiting()
})

/* ---------- Background push ---------- */

const messaging = getMessaging(initializeApp({
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MSG_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
}))

// Messages are sent data-only so this handler controls presentation. A notification
// payload would make the browser auto-display a second, uglier copy.
onBackgroundMessage(messaging, (payload) => {
  const d = (payload.data ?? {}) as Record<string, string>
  const options: NotificationOptions & { renotify?: boolean; timestamp?: number; vibrate?: number[]; actions?: Array<{ action: string; title: string; icon?: string }> } = {
    body: d.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge.png',
    tag: d.tag || 'letters-inbox',
    renotify: true,
    timestamp: Date.now(),
    vibrate: [45, 35, 75],
    actions: [{ action: 'open', title: 'Open letter' }],
    data: { url: d.url || '/' },
  }
  return self.registration.showNotification(d.title || 'A letter arrived', options)
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const requested = (event.notification.data as { url?: string })?.url ?? '/'
  const target = new URL(requested, self.location.origin)
  const url = target.origin === self.location.origin ? target.href : self.location.origin
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const existing = clients.find((c) => c.url.includes(self.location.origin))
    if (existing) {
      if ('navigate' in existing) await existing.navigate(url)
      await existing.focus()
      return
    }
    await self.clients.openWindow(url)
  })())
})
