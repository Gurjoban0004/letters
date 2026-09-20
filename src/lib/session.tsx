import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth'
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, PAIRING_ID } from './firebase'

export type Edition = 'rose' | 'graphite'

export type Profile = { name: string; edition: Edition; joinedAt?: unknown }

export type Pairing = {
  members: string[]
  profiles: Record<string, Profile>
  metOn?: string | null
  lastPulse?: { from: string; at: unknown } | null
}

type Session = {
  user: User | null
  pairing: Pairing | null
  me: Profile | null
  partnerUid: string | null
  partner: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  claimSlot: (name: string, edition: Edition) => Promise<void>
}

const Ctx = createContext<Session | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [pairing, setPairing] = useState<Pairing | null>(null)
  const [loading, setLoading] = useState(true)
  const [retry, setRetry] = useState(0)

  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false) }), [])

  useEffect(() => {
    if (!user?.uid) { setPairing(null); return }
    return onSnapshot(
      doc(db, 'pairings', PAIRING_ID),
      (snap) => setPairing(snap.exists() ? (snap.data() as Pairing) : null),
      (err) => {
        // Firestore tears a listener down permanently on error, including the
        // brief permission gap right after signing in as someone else. Without
        // re-attaching, the app stays blank until a manual reload.
        console.warn('pairing listener dropped:', err.code)
        setTimeout(() => setRetry((n) => n + 1), 1500)
      },
    )
  }, [user?.uid, retry])

  const me = user && pairing?.profiles?.[user.uid] ? pairing.profiles[user.uid] : null
  const partnerUid = user && pairing ? (pairing.members ?? []).find((m) => m !== user.uid) ?? null : null
  const partner = partnerUid ? pairing?.profiles?.[partnerUid] ?? null : null

  // The whole press changes ink when you change edition.
  useEffect(() => {
    document.documentElement.dataset.edition = me?.edition ?? 'graphite'
  }, [me?.edition])

  const value: Session = {
    user, pairing, me, partnerUid, partner, loading,
    signIn: async (email, password) => { await signInWithEmailAndPassword(auth, email, password) },
    register: async (email, password) => { await createUserWithEmailAndPassword(auth, email, password) },
    signOut: async () => { await fbSignOut(auth) },
    claimSlot: async (name, edition) => {
      if (!user) return
      const payload: Record<string, unknown> = {
        members: Array.from(new Set([...(pairing?.members ?? []), user.uid])),
        profiles: { ...(pairing?.profiles ?? {}), [user.uid]: { name, edition, joinedAt: Date.now() } },
      }
      // Firestore rejects an explicit `undefined`, so the stamp is only added
      // on the write that actually creates the pairing.
      if (!pairing) payload.createdAt = serverTimestamp()
      await setDoc(doc(db, 'pairings', PAIRING_ID), payload, { merge: true })
    },
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSession() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSession outside SessionProvider')
  return ctx
}
