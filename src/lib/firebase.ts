import { initializeApp } from 'firebase/app'
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  initializeAuth,
} from 'firebase/auth'
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator,
} from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'

const config = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  // An installed iOS PWA needs the redirect helper to stay on the app's own
  // origin. Vercel proxies /__/auth to Firebase in production (vercel.json).
  // Browser tabs keep the existing Firebase domain and popup flow.
  authDomain: import.meta.env.PROD && isStandaloneApp() ? location.host : import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MSG_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
}

export function isStandaloneApp() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
}

export const app = initializeApp(config)
// Be explicit about the persistence fallbacks. iOS can make IndexedDB
// temporarily unavailable while returning from Google's popup; Firebase can
// then fall back to localStorage (or, lastly, the current browser session)
// instead of appearing to sign in and immediately forgetting the account.
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
  popupRedirectResolver: browserPopupRedirectResolver,
})
export const storage = getStorage(app)

// Offline persistence: letters stay readable on the subway.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

// Local development against `firebase emulators:start` — including the real
// security rules, so a rule mistake shows up here rather than in production.
if (import.meta.env.VITE_USE_EMULATORS === '1') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
}

export const VAPID_KEY = import.meta.env.VITE_FB_VAPID_KEY as string

/** The single pairing document both friends share. Set once in .env. */
export const PAIRING_ID = (import.meta.env.VITE_PAIRING_ID as string) || 'twofold'
